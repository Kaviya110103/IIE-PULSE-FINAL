import hashlib
import json
import logging
import re
from json import JSONDecodeError

import requests
from django.conf import settings
from django.db import transaction

from connect.models import ChallengeQuestionPool, DailySessionCompletion
from connect.services.challenge_service import ChallengeValidationError


logger = logging.getLogger(__name__)


class ChallengeAIError(Exception):
    pass


def normalize_text(value):
    return re.sub(r'\s+', ' ', str(value or '').strip()).lower()


def extract_session_learning_content(session):
    content_parts = [
        f"Course: {session.batch.course_name.course_name if session.batch and session.batch.course_name else ''}",
        f"Batch: {session.batch.batch_number if session.batch else ''}",
        f"Session Number: {session.session_number}",
        f"Session Title: {session.title}",
        f"Session Topics: {session.topics or ''}",
    ]
    completions = DailySessionCompletion.objects.filter(session=session).order_by('-completion_date', '-id')[:5]
    for completion in completions:
        content_parts.extend([
            f"Topics Covered: {completion.topics_covered or ''}",
            f"Completion Notes: {completion.notes or ''}",
        ])
    return '\n'.join(part for part in content_parts if part.split(':', 1)[-1].strip())


def extract_session_concepts(session):
    raw = '\n'.join([
        str(session.title or ''),
        str(session.topics or ''),
    ])
    pieces = [
        part.strip(' -:,.')
        for part in re.split(r'[,|;\\n]+|\s+-\s+|\s+•\s+', raw)
        if part.strip(' -:,.')
    ]
    concepts = []
    seen = set()
    for piece in pieces:
        cleaned = re.sub(r'\s+', ' ', piece).strip()
        if len(cleaned) < 3 or len(cleaned) > 90:
            continue
        key = normalize_text(cleaned)
        if key in seen:
            continue
        seen.add(key)
        concepts.append(cleaned)
    return concepts[:20]


def build_source_hash(session, question_text, options):
    normalized = '|'.join([
        str(session.id),
        normalize_text(question_text),
        *[normalize_text(option) for option in options],
    ])
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()


def _parse_json_object(raw_content):
    if isinstance(raw_content, dict):
        return raw_content
    if not isinstance(raw_content, str):
        raise ChallengeAIError('AI response content must be a JSON object string.')

    content = raw_content.strip()
    if content.startswith('```'):
        content = re.sub(r'^```(?:json)?\s*', '', content, flags=re.IGNORECASE).strip()
        content = re.sub(r'\s*```$', '', content).strip()

    try:
        return json.loads(content)
    except JSONDecodeError as exc:
        raise ChallengeAIError('AI response was not valid JSON.') from exc


def validate_ai_question_payload(item, session):
    question_text = str(item.get('question') or item.get('question_text') or '').strip()
    if not question_text:
        raise ChallengeAIError('Question text is required.')
    normalized_question = normalize_text(question_text)
    if (
        'which concept is part of the completed session content' in normalized_question or
        'completed session content' in normalized_question or
        normalized_question.startswith('in session ')
    ):
        raise ChallengeAIError('Question must be a direct technical MCQ, not a session-summary question.')

    raw_options = item.get('options')
    if isinstance(raw_options, dict):
        options = [
            raw_options.get('A') or raw_options.get('a'),
            raw_options.get('B') or raw_options.get('b'),
            raw_options.get('C') or raw_options.get('c'),
            raw_options.get('D') or raw_options.get('d'),
        ]
    elif isinstance(raw_options, list):
        options = raw_options
    else:
        options = [
            item.get('option_a'),
            item.get('option_b'),
            item.get('option_c'),
            item.get('option_d'),
        ]

    options = [str(option or '').strip() for option in options]
    if len(options) != 4 or any(not option for option in options):
        raise ChallengeAIError('Exactly 4 non-empty options are required.')
    if len({normalize_text(option) for option in options}) != 4:
        raise ChallengeAIError('Options must be unique.')
    if any(
        'future topic outside' in normalize_text(option) or
        'administrative activity' in normalize_text(option) or
        'attendance-only' in normalize_text(option)
        for option in options
    ):
        raise ChallengeAIError('Options must be technical and relevant to the session topic.')

    correct_answer = str(item.get('correct_answer') or item.get('answer') or '').strip().upper()
    if correct_answer not in {'A', 'B', 'C', 'D'}:
        raise ChallengeAIError('Correct answer must be one of A, B, C, or D.')

    difficulty = str(item.get('difficulty') or 'medium').strip().lower()
    if difficulty not in {'easy', 'medium', 'hard'}:
        difficulty = 'medium'

    source_hash = build_source_hash(session, question_text, options)
    return {
        'topic_name': str(item.get('topic_name') or session.title or '').strip()[:255],
        'difficulty': difficulty,
        'question_text': question_text,
        'option_a': options[0],
        'option_b': options[1],
        'option_c': options[2],
        'option_d': options[3],
        'correct_answer': correct_answer,
        'explanation': str(item.get('explanation') or '').strip(),
        'source_hash': source_hash,
    }


def validate_ai_response(raw_response, session):
    parsed = _parse_json_object(raw_response)
    questions = parsed.get('questions') if isinstance(parsed, dict) else None
    if not isinstance(questions, list) or not questions:
        raise ChallengeAIError('AI response must contain a non-empty questions list.')

    validated = []
    seen_hashes = set()
    for item in questions:
        if not isinstance(item, dict):
            raise ChallengeAIError('Every question must be a JSON object.')
        question = validate_ai_question_payload(item, session)
        if question['source_hash'] in seen_hashes:
            raise ChallengeAIError('AI response contains duplicate questions.')
        seen_hashes.add(question['source_hash'])
        validated.append(question)
    return validated


def _openai_chat_completion(prompt, count):
    api_key = getattr(settings, 'CHALLENGE_AI_API_KEY', '')
    if not api_key:
        raise ChallengeAIError('Challenge AI API key is not configured.')

    response = requests.post(
        getattr(settings, 'CHALLENGE_AI_API_URL', ''),
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        json={
            'model': getattr(settings, 'CHALLENGE_AI_MODEL', ''),
            'messages': [
                {
                    'role': 'system',
                    'content': (
                        'You create student learning challenge MCQs. '
                        'Return only strict JSON. Do not include markdown.'
                    ),
                },
                {'role': 'user', 'content': prompt},
            ],
            'temperature': 0.3,
            'response_format': {'type': 'json_object'},
        },
        timeout=getattr(settings, 'CHALLENGE_AI_TIMEOUT_SECONDS', 30),
    )
    if response.status_code >= 400:
        logger.warning('Challenge AI provider failed with status=%s', response.status_code)
        raise ChallengeAIError('Challenge AI provider request failed.')
    payload = response.json()
    return payload['choices'][0]['message']['content']


def call_ai_question_provider(prompt, count):
    provider = getattr(settings, 'CHALLENGE_AI_PROVIDER', 'openai')
    if provider != 'openai':
        raise ChallengeAIError(f'Unsupported challenge AI provider: {provider}')

    attempts = max(1, getattr(settings, 'CHALLENGE_AI_MAX_RETRIES', 2) + 1)
    last_error = None
    for attempt in range(1, attempts + 1):
        try:
            return _openai_chat_completion(prompt, count)
        except (requests.RequestException, KeyError, IndexError, ValueError, ChallengeAIError) as exc:
            last_error = exc
            logger.warning(
                'Challenge AI attempt %s/%s failed: %s',
                attempt,
                attempts,
                exc.__class__.__name__,
            )
    raise ChallengeAIError('Challenge AI provider failed after retries.') from last_error


def build_generation_prompt(session, count):
    learning_content = extract_session_learning_content(session)
    existing_questions = list(
        ChallengeQuestionPool.objects.filter(source_session=session)
        .order_by('-id')
        .values_list('question_text', flat=True)[:30]
    )
    existing_section = '\n'.join(f"- {question}" for question in existing_questions if question)
    return (
        f"Generate {count} beginner-friendly technical multiple-choice questions from this completed class session only.\n"
        "Rules:\n"
        "- Return strict JSON with this shape: "
        '{"questions":[{"question":"...","options":["...","...","...","..."],'
        '"correct_answer":"A","difficulty":"easy|medium|hard","explanation":"..."}]}\n'
        "- Exactly 4 unique options per question.\n"
        "- correct_answer must be A, B, C, or D.\n"
        "- Every question must test a real basic technical point from the session title/topics/content.\n"
        "- Write direct questions only. Do not start with \"In Session\".\n"
        "- Do not ask meta questions like \"which concept is part of the completed session content\".\n"
        "- Do not include session topic lists in the question text.\n"
        "- All 4 options must be technical choices, not attendance/admin/future-topic choices.\n"
        "- Do not use content outside the provided session.\n"
        "- Avoid repeating any existing questions listed below.\n\n"
        f"Session content:\n{learning_content}\n\n"
        f"Existing questions to avoid:\n{existing_section or '- None'}"
    )


def _technical_prompts_for_concept(concept):
    value = str(concept or '').strip()
    lower = value.lower()
    if 'dom' in lower:
        return [
            {
                'question': 'What does the DOM represent in a web page?',
                'answer': 'The page structure as objects that scripts can access',
                'wrong': ['Only the website domain name', 'A CSS color palette', 'A browser download folder'],
            },
            {
                'question': 'Which language is commonly used to change DOM elements after a page loads?',
                'answer': 'JavaScript',
                'wrong': ['SQL', 'Photoshop', 'Excel'],
            },
            {
                'question': 'Which DOM method is commonly used to select an element by its id?',
                'answer': 'document.getElementById()',
                'wrong': ['document.findByClass()', 'window.selectId()', 'html.getNode()'],
            },
            {
                'question': 'What can JavaScript do after selecting a DOM element?',
                'answer': 'Change its content or style',
                'wrong': ['Change the computer processor', 'Print a certificate automatically', 'Create a new database server'],
            },
        ]
    if 'basic structure' in lower or 'structure' in lower:
        return [
            {
                'question': 'Which tag usually contains the visible content of an HTML page?',
                'answer': '<body>',
                'wrong': ['<head>', '<title>', '<meta>'],
            },
            {
                'question': 'Which tag is the root element of an HTML document?',
                'answer': '<html>',
                'wrong': ['<root>', '<page>', '<mainfile>'],
            },
            {
                'question': 'Which section usually contains metadata and the page title?',
                'answer': '<head>',
                'wrong': ['<body>', '<footer>', '<article>'],
            },
            {
                'question': 'Which tag is used to set the browser tab title?',
                'answer': '<title>',
                'wrong': ['<tab>', '<caption>', '<heading>'],
            },
        ]
    if 'heading' in lower:
        return [
            {
                'question': 'Which HTML heading tag shows the most important heading?',
                'answer': '<h1>',
                'wrong': ['<h6>', '<p>', '<br>'],
            },
            {
                'question': 'How many heading levels are available in standard HTML?',
                'answer': 'Six levels, from <h1> to <h6>',
                'wrong': ['Two levels only', 'Ten levels, from <h1> to <h10>', 'Only one heading tag'],
            },
            {
                'question': 'Which heading tag usually displays the smallest heading?',
                'answer': '<h6>',
                'wrong': ['<h1>', '<smallheading>', '<p>'],
            },
            {
                'question': 'Why should heading tags be used in correct order?',
                'answer': 'They help structure content clearly',
                'wrong': ['They store passwords', 'They upload images', 'They replace all CSS'],
            },
        ]
    if 'formatting' in lower or 'text' in lower:
        return [
            {
                'question': 'Which HTML tag is commonly used to make text bold with importance?',
                'answer': '<strong>',
                'wrong': ['<italic>', '<break>', '<table>'],
            },
            {
                'question': 'Which HTML tag is commonly used to emphasize text?',
                'answer': '<em>',
                'wrong': ['<img>', '<div>', '<body>'],
            },
            {
                'question': 'Which tag is commonly used to mark inserted or underlined text?',
                'answer': '<ins>',
                'wrong': ['<delete>', '<markline>', '<row>'],
            },
            {
                'question': 'Which tag is commonly used to show deleted text?',
                'answer': '<del>',
                'wrong': ['<remove>', '<strikeonly>', '<erase>'],
            },
        ]
    if 'font' in lower:
        return [
            {
                'question': 'Which method is currently preferred for changing font style on a web page?',
                'answer': 'CSS font properties',
                'wrong': ['The old <font> tag', 'The <br> tag', 'The <html> tag only'],
            },
            {
                'question': 'Which CSS property changes the font family of text?',
                'answer': 'font-family',
                'wrong': ['text-file', 'font-link', 'style-name'],
            },
            {
                'question': 'Which CSS property changes the size of text?',
                'answer': 'font-size',
                'wrong': ['text-length', 'font-count', 'size-font-family'],
            },
            {
                'question': 'Why is the old HTML <font> tag avoided in modern web pages?',
                'answer': 'CSS is preferred for presentation and styling',
                'wrong': ['It cannot display letters', 'It only works in Python', 'It is used only for images'],
            },
        ]
    if 'evolution' in lower or 'introduction' in lower or 'html5' in lower or lower == 'html':
        return [
            {
                'question': 'What is HTML mainly used for in web development?',
                'answer': 'Structuring content on a web page',
                'wrong': ['Styling database tables', 'Managing server memory', 'Creating operating system drivers'],
            },
            {
                'question': 'What is one major improvement introduced with HTML5?',
                'answer': 'Built-in support for audio and video elements',
                'wrong': ['Removing all semantic tags', 'Replacing CSS completely', 'Disabling browser forms'],
            },
            {
                'question': 'Which HTML5 tag is used to play video in a browser?',
                'answer': '<video>',
                'wrong': ['<movie>', '<mediafile>', '<watch>'],
            },
            {
                'question': 'Which HTML5 tag is used to play sound in a browser?',
                'answer': '<audio>',
                'wrong': ['<soundfile>', '<music>', '<speaker>'],
            },
            {
                'question': 'Which HTML5 element is commonly used for independent self-contained content?',
                'answer': '<article>',
                'wrong': ['<font>', '<blink>', '<center>'],
            },
        ]
    if 'tag' in lower:
        return [
            {
                'question': f'What is the basic purpose of {value} in HTML?',
                'answer': 'To mark or define a part of page content',
                'wrong': ['To store attendance records', 'To compile Python code', 'To configure server memory'],
            },
            {
                'question': 'What symbol is used to open most HTML tags?',
                'answer': 'Less-than symbol (<)',
                'wrong': ['Hash symbol (#)', 'At symbol (@)', 'Equal symbol (=)'],
            },
            {
                'question': 'What is a closing tag usually used for?',
                'answer': 'To mark where an element ends',
                'wrong': ['To start a server', 'To save a database', 'To create an image file'],
            },
            {
                'question': 'Which character usually appears before the tag name in a closing tag?',
                'answer': 'Forward slash (/)',
                'wrong': ['Backslash (\\)', 'Question mark (?)', 'Percent sign (%)'],
            },
        ]
    if 'css' in lower:
        return [
            {
                'question': 'What is CSS mainly used for?',
                'answer': 'Styling and arranging web page content',
                'wrong': ['Creating database indexes', 'Sending SMS messages', 'Managing hardware devices'],
            },
            {
                'question': 'Which CSS property changes text color?',
                'answer': 'color',
                'wrong': ['text-image', 'font-file', 'page-name'],
            },
        ]
    if 'python' in lower:
        return [
            {
                'question': 'What is a function mainly used for in Python?',
                'answer': 'Grouping reusable code that performs a task',
                'wrong': ['Changing monitor brightness', 'Formatting only HTML tags', 'Saving attendance records automatically'],
            },
            {
                'question': 'Which keyword is used to define a function in Python?',
                'answer': 'def',
                'wrong': ['function', 'method', 'create'],
            },
        ]
    if 'variable' in lower:
        return [
            {
                'question': 'What is a variable used for in programming?',
                'answer': 'Storing a value that can be used later',
                'wrong': ['Drawing only web page borders', 'Sending email automatically', 'Deleting the operating system'],
            },
            {
                'question': 'Which value is commonly stored in a string variable?',
                'answer': 'Text',
                'wrong': ['Only a whole database', 'Only an image folder', 'Only a keyboard shortcut'],
            },
            {
                'question': 'Why should a variable name be meaningful?',
                'answer': 'It makes the code easier to understand',
                'wrong': ['It makes the screen brighter', 'It hides all errors', 'It replaces the need for logic'],
            },
        ]
    if lower in {'type', 'types'} or 'data type' in lower:
        return [
            {
                'question': 'What does a data type describe?',
                'answer': 'The kind of value stored or used',
                'wrong': ['The classroom branch name', 'The fee receipt number', 'The trainer attendance date'],
            },
            {
                'question': 'Which data type is commonly used for whole numbers?',
                'answer': 'Integer',
                'wrong': ['Paragraph', 'Folder', 'Button'],
            },
            {
                'question': 'Which data type is commonly used for true or false values?',
                'answer': 'Boolean',
                'wrong': ['Image', 'Heading', 'Table row only'],
            },
        ]
    if 'java' in lower:
        return [
            {
                'question': 'What is a class mainly used for in Java?',
                'answer': 'Defining the structure and behavior of objects',
                'wrong': ['Designing only page colors', 'Storing only image files', 'Marking student attendance'],
            },
            {
                'question': 'Which method is the usual starting point of a Java program?',
                'answer': 'main method',
                'wrong': ['start page', 'body tag', 'style method'],
            },
        ]
    return [
        {
            'question': f'Which statement best describes {value}?',
            'answer': f'It is a technical concept used in this lesson',
            'wrong': ['It is only an attendance entry', 'It is only a fee detail', 'It is only a branch name'],
        },
        {
            'question': f'Why is {value} important for beginners?',
            'answer': 'It helps build the foundation for the next practical steps',
            'wrong': ['It is unrelated to practice', 'It is only for admin records', 'It is used only after course completion'],
        },
    ]


def build_local_question_payload(session, count, start_index=1):
    title = str(session.title or f'Session {session.session_number}').strip()
    topic_parts = extract_session_concepts(session)
    if not topic_parts:
        topic_parts = [title]

    question_bank = []
    for concept in topic_parts:
        for prompt in _technical_prompts_for_concept(concept):
            question_bank.append((concept, prompt))
    if not question_bank:
        question_bank = [(title, prompt) for prompt in _technical_prompts_for_concept(title)]

    questions = []
    for offset in range(count):
        index = start_index + offset
        concept, technical = question_bank[(index - 1) % len(question_bank)]
        questions.append({
            'question': technical['question'],
            'options': [
                technical['answer'][:180],
                technical['wrong'][0][:180],
                technical['wrong'][1][:180],
                technical['wrong'][2][:180],
            ],
            'correct_answer': 'A',
            'difficulty': 'easy' if index <= 4 else 'medium',
            'explanation': f'This question is generated from the completed session topic: {concept}.',
            'topic_name': concept[:255],
        })

    return json.dumps({'questions': questions})


def validate_source_session(session):
    if not session:
        raise ChallengeValidationError('Source session is required.')
    if not session.staff_completed or not session.completed_by_id:
        raise ChallengeValidationError('Only staff-completed sessions can generate challenge questions.')
    if not session.batch_id or not session.batch.course_name_id:
        raise ChallengeValidationError('Source session must belong to a valid course batch.')


@transaction.atomic
def generate_questions_for_completed_session(session, count=5):
    validate_source_session(session)
    count = max(1, min(int(count or 5), 20))
    prompt = build_generation_prompt(session, count)
    existing_count = ChallengeQuestionPool.objects.filter(source_session=session).count()
    if not getattr(settings, 'CHALLENGE_AI_API_KEY', ''):
        logger.info('Challenge AI key missing; using local session-topic generator for session_id=%s', session.id)
        raw_response = build_local_question_payload(session, count, start_index=existing_count + 1)
        provider = 'local'
        model = 'session-topic-generator'
    else:
        raw_response = call_ai_question_provider(prompt, count)
        provider = getattr(settings, 'CHALLENGE_AI_PROVIDER', 'openai')
        model = getattr(settings, 'CHALLENGE_AI_MODEL', '')
    validated_questions = validate_ai_response(raw_response, session)

    created = []
    skipped = []

    for question in validated_questions[:count]:
        duplicate = ChallengeQuestionPool.objects.filter(
            source_session=session,
            source_hash=question['source_hash'],
        ).exists() or ChallengeQuestionPool.objects.filter(
            course=session.batch.course_name,
            batch=session.batch,
            question_text__iexact=question['question_text'],
        ).exists()

        if duplicate:
            skipped.append({
                'question_text': question['question_text'],
                'reason': 'duplicate',
            })
            continue

        created.append(ChallengeQuestionPool.objects.create(
            course=session.batch.course_name,
            batch=session.batch,
            source_session=session,
            topic_name=question['topic_name'],
            difficulty=question['difficulty'],
            question_text=question['question_text'],
            option_a=question['option_a'],
            option_b=question['option_b'],
            option_c=question['option_c'],
            option_d=question['option_d'],
            correct_answer=question['correct_answer'],
            explanation=question['explanation'],
            ai_provider=provider,
            ai_model=model,
            source_hash=question['source_hash'],
            is_active=True,
        ))

    logger.info(
        'Challenge AI generation completed for session_id=%s created=%s skipped=%s',
        session.id,
        len(created),
        len(skipped),
    )
    return {
        'created': created,
        'skipped': skipped,
        'requested_count': count,
        'validated_count': len(validated_questions),
    }
