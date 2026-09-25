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
    completion_rows = DailySessionCompletion.objects.filter(
        session=session,
        completed=True,
    ).order_by('-completion_date', '-id')

    notes = []
    covered_topics = []
    for row in completion_rows[:5]:
        if row.topics_covered:
            covered_topics.append(row.topics_covered.strip())
        if row.notes:
            notes.append(row.notes.strip())

    content_parts = [
        f"Course: {session.batch.course_name.course_name if session.batch and session.batch.course_name else ''}",
        f"Batch: {session.batch.batch_number if session.batch else ''}",
        f"Session Number: {session.session_number}",
        f"Session Title: {session.title}",
        f"Session Topics: {session.topics or ''}",
        f"Completed Topics Covered: {' | '.join(covered_topics)}",
        f"Completion Notes: {' | '.join(notes)}",
    ]
    return '\n'.join(part for part in content_parts if part.split(':', 1)[-1].strip())


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
    return (
        f"Generate {count} multiple-choice questions from this completed class session only.\n"
        "Rules:\n"
        "- Return strict JSON with this shape: "
        '{"questions":[{"question":"...","options":["...","...","...","..."],'
        '"correct_answer":"A","difficulty":"easy|medium|hard","explanation":"..."}]}\n'
        "- Exactly 4 unique options per question.\n"
        "- correct_answer must be A, B, C, or D.\n"
        "- Do not use content outside the provided session.\n\n"
        f"Session content:\n{learning_content}"
    )


def build_local_question_payload(session, count):
    title = str(session.title or f'Session {session.session_number}').strip()
    raw_topics = str(session.topics or title)
    topic_parts = [
        part.strip(' -:,.')
        for part in re.split(r'[,|;\\n]+', raw_topics)
        if part.strip(' -:,.')
    ]
    if not topic_parts:
        topic_parts = [title]

    questions = []
    for index in range(1, count + 1):
        concept = topic_parts[(index - 1) % len(topic_parts)]
        distractors = [
            f'A future topic outside {title[:40]}',
            f'An unrelated administrative activity',
            f'A batch attendance-only entry',
        ]
        questions.append({
            'question': f'In {title}, which concept is part of the completed session content? ({index})',
            'options': [
                concept[:180],
                distractors[0],
                distractors[1],
                distractors[2],
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
    if not getattr(settings, 'CHALLENGE_AI_API_KEY', ''):
        logger.info('Challenge AI key missing; using local session-topic generator for session_id=%s', session.id)
        raw_response = build_local_question_payload(session, count)
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
