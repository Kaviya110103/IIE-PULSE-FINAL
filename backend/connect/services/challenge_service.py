import logging
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from connect.models import (
    Batches,
    ChallengeQuestionPool,
    CourseSession,
    Courses,
    StudentBatchEnrollment,
    StudentChallenge,
    StudentChallengeAchievement,
    StudentChallengeDay,
    StudentChallengeDayQuestion,
    StudentCourseEnrollment,
    StudentSessionStatus,
    Student_Session_Progress,
    SessionCompletion,
    Students,
)


QUESTIONS_PER_DAY = 5
MAX_CHALLENGE_DAYS = 15
logger = logging.getLogger(__name__)


class ChallengeValidationError(Exception):
    pass


def _normalize_answer(value):
    answer = str(value or '').strip().upper()
    return answer if answer in {'A', 'B', 'C', 'D'} else ''


def difficulty_choices_for_day(day_number):
    if day_number <= 5:
        return ['easy', 'medium']
    if day_number <= 10:
        return ['medium']
    return ['medium', 'hard']


def get_student_course_batch_pairs(student):
    pairs = []
    seen = set()

    enrollments = StudentBatchEnrollment.objects.filter(
        student=student,
        is_active=True,
    ).select_related('batch__course_name', 'course_enrollment__course')

    for enrollment in enrollments:
        batch = enrollment.batch
        course = enrollment.course_enrollment.course if enrollment.course_enrollment else batch.course_name
        if course and batch and (course.id, batch.id) not in seen:
            seen.add((course.id, batch.id))
            pairs.append((course, batch))

    if student.assigned_batch and student.assigned_batch.course_name:
        course = student.assigned_batch.course_name
        batch = student.assigned_batch
        if (course.id, batch.id) not in seen:
            pairs.append((course, batch))

    return pairs


def is_student_enrolled(student, course, batch):
    if not student or not course or not batch or batch.course_name_id != course.id:
        return False

    has_batch_enrollment = StudentBatchEnrollment.objects.filter(
        student=student,
        batch=batch,
        is_active=True,
    ).exists()

    if has_batch_enrollment:
        return True

    legacy_match = student.assigned_batch_id == batch.id and batch.course_name_id == course.id
    if legacy_match:
        return True

    return StudentCourseEnrollment.objects.filter(
        student=student,
        course=course,
        is_active=True,
        batch_assignments__batch=batch,
        batch_assignments__is_active=True,
    ).exists()


def get_student_completed_session_ids(student, course, batch):
    if not is_student_enrolled(student, course, batch):
        return set()

    session_filter = {
        'student': student,
        'session__batch': batch,
        'session__batch__course_name': course,
    }
    completed_ids = set(
        Student_Session_Progress.objects.filter(**session_filter)
        .filter(completed=True)
        .values_list('session_id', flat=True)
        .distinct()
    )
    completed_ids.update(
        Student_Session_Progress.objects.filter(**session_filter)
        .filter(student_status='completed')
        .values_list('session_id', flat=True)
        .distinct()
    )
    completed_ids.update(
        StudentSessionStatus.objects.filter(**session_filter)
        .filter(student_status='completed')
        .values_list('session_id', flat=True)
        .distinct()
    )
    completed_ids.update(
        SessionCompletion.objects.filter(
            student=student,
            session__batch=batch,
            session__batch__course_name=course,
            status='completed',
        ).values_list('session_id', flat=True).distinct()
    )
    return completed_ids


def get_student_session_counts(student, course, batch):
    if not is_student_enrolled(student, course, batch):
        return {'completed_sessions': 0, 'total_sessions': 0}

    total_sessions = CourseSession.objects.filter(
        batch=batch,
        batch__course_name=course,
    ).values('id').distinct().count()
    return {
        'completed_sessions': len(get_student_completed_session_ids(student, course, batch)),
        'total_sessions': total_sessions,
    }


def get_eligible_sessions(student, course, batch):
    if not is_student_enrolled(student, course, batch):
        return CourseSession.objects.none()

    completed_session_ids = get_student_completed_session_ids(student, course, batch)
    if not completed_session_ids:
        return CourseSession.objects.none()

    return CourseSession.objects.filter(
        batch=batch,
        batch__course_name=course,
        id__in=completed_session_ids,
    ).select_related('batch', 'batch__course_name', 'completed_by').order_by('session_number')


def validate_question_eligibility(question, student, course, batch):
    if not question or not question.is_active:
        return False
    if question.course_id != course.id or question.batch_id != batch.id:
        return False
    if not is_student_enrolled(student, course, batch):
        return False
    source_session = question.source_session
    return (
        source_session.batch_id == batch.id and
        source_session.batch.course_name_id == course.id and
        source_session.id in get_student_completed_session_ids(student, course, batch)
    )


def get_available_questions(student, course, batch):
    eligible_session_ids = get_eligible_sessions(student, course, batch).values_list('id', flat=True)
    return ChallengeQuestionPool.objects.filter(
        course=course,
        batch=batch,
        source_session_id__in=eligible_session_ids,
        is_active=True,
    ).select_related('course', 'batch', 'source_session').order_by('id')


def ensure_question_pool_for_student_completed_sessions(student, course, batch, min_questions=QUESTIONS_PER_DAY):
    from connect.services.challenge_ai import ChallengeAIError, generate_questions_for_completed_session

    created_total = 0
    skipped_total = 0
    for session in get_eligible_sessions(student, course, batch):
        existing_for_session = ChallengeQuestionPool.objects.filter(
            course=course,
            batch=batch,
            source_session=session,
            is_active=True,
        ).count()
        if existing_for_session >= 10:
            continue

        try:
            result = generate_questions_for_completed_session(session, count=10 - existing_for_session)
        except (ChallengeValidationError, ChallengeAIError) as exc:
            logger.warning(
                'Challenge question auto-generation skipped session_id=%s student_id=%s: %s',
                session.id,
                student.id,
                exc,
            )
            continue

        created_total += len(result['created'])
        skipped_total += len(result['skipped'])

    return {
        'created': created_total,
        'skipped': skipped_total,
        'available': get_available_questions(student, course, batch).count(),
    }


def get_or_create_student_challenge(student, course, batch):
    if not is_student_enrolled(student, course, batch):
        raise ChallengeValidationError('Student is not enrolled in this course and batch.')

    challenge, _ = StudentChallenge.objects.get_or_create(
        student=student,
        course=course,
        batch=batch,
        defaults={'status': 'active'},
    )
    return challenge


def _pick_questions_from_queryset(qs, day_number):
    preferred = list(qs.filter(difficulty__in=difficulty_choices_for_day(day_number))[:QUESTIONS_PER_DAY])

    if len(preferred) < QUESTIONS_PER_DAY:
        selected_ids = [question.id for question in preferred]
        fallback = list(qs.exclude(id__in=selected_ids)[:QUESTIONS_PER_DAY - len(preferred)])
        preferred.extend(fallback)

    return preferred[:QUESTIONS_PER_DAY]


def _select_questions_for_day(student, course, batch, challenge, day_number):
    used_question_ids = StudentChallengeDayQuestion.objects.filter(
        challenge_day__challenge=challenge
    ).values_list('question_id', flat=True)
    used_session_ids = StudentChallengeDayQuestion.objects.filter(
        challenge_day__challenge=challenge
    ).values_list('question__source_session_id', flat=True).distinct()

    base_qs = get_available_questions(student, course, batch).exclude(id__in=used_question_ids)
    new_session_questions = _pick_questions_from_queryset(
        base_qs.exclude(source_session_id__in=used_session_ids),
        day_number,
    )
    if len(new_session_questions) >= QUESTIONS_PER_DAY:
        return new_session_questions

    fallback_questions = _pick_questions_from_queryset(base_qs, day_number)
    if len(fallback_questions) < QUESTIONS_PER_DAY:
        return []
    return fallback_questions


def _next_challenge_date(challenge, today):
    return today


def _calendar_days_taken(challenge, completed_at):
    if not challenge.start_date or not completed_at:
        return 1
    completed_date = timezone.localtime(completed_at).date()
    return max((completed_date - challenge.start_date).days + 1, 1)


def _achievement_payload(challenge, completed_at):
    score_percentage = 0
    if challenge.total_questions:
        score_percentage = round((challenge.total_score / challenge.total_questions) * 100, 2)
    return {
        'student': challenge.student,
        'course': challenge.course,
        'batch': challenge.batch,
        'badge_code': 'excellent_student',
        'badge_title': 'Excellent Student',
        'completed_days': challenge.completed_days,
        'final_score_percentage': score_percentage,
        'calendar_days_taken': _calendar_days_taken(challenge, completed_at),
        'completed_at': completed_at,
    }


def ensure_challenge_achievement(challenge, completed_at):
    if challenge.completed_days < MAX_CHALLENGE_DAYS:
        return None
    achievement, created = StudentChallengeAchievement.objects.get_or_create(
        challenge=challenge,
        defaults=_achievement_payload(challenge, completed_at),
    )
    if not created and not achievement.completed_at:
        achievement.completed_at = completed_at
        achievement.save(update_fields=['completed_at'])
    return achievement


@transaction.atomic
def get_or_create_today_challenge_day(student, course, batch, today=None):
    today = today or timezone.localdate()
    challenge = get_or_create_student_challenge(student, course, batch)

    if challenge.status == 'completed':
        return {
            'state': 'completed',
            'challenge': challenge,
            'day': None,
            'questions': [],
            'message': 'Challenge already completed.',
        }

    if not challenge.start_date:
        challenge.start_date = today
        challenge.save(update_fields=['start_date', 'updated_at'])

    latest_day = StudentChallengeDay.objects.filter(challenge=challenge).order_by('-day_number').first()
    if latest_day and latest_day.status != 'completed':
        return {
            'state': latest_day.status,
            'challenge': challenge,
            'day': latest_day,
            'questions': list(latest_day.day_questions.select_related('question', 'question__source_session').all()),
            'message': '',
        }

    next_day_number = (latest_day.day_number + 1) if latest_day else 1
    if next_day_number > MAX_CHALLENGE_DAYS:
        challenge.status = 'completed'
        challenge.save(update_fields=['status', 'updated_at'])
        return {
            'state': 'completed',
            'challenge': challenge,
            'day': None,
            'questions': [],
            'message': 'Challenge already completed.',
        }

    selected_questions = _select_questions_for_day(student, course, batch, challenge, next_day_number)
    if len(selected_questions) < QUESTIONS_PER_DAY:
        ensure_question_pool_for_student_completed_sessions(student, course, batch)
        selected_questions = _select_questions_for_day(student, course, batch, challenge, next_day_number)

    if len(selected_questions) < QUESTIONS_PER_DAY:
        if latest_day and latest_day.status == 'completed':
            return {
                'state': 'completed',
                'challenge': challenge,
                'day': latest_day,
                'questions': list(latest_day.day_questions.select_related('question', 'question__source_session').all()),
                'message': 'Current challenge day completed. Complete more sessions to unlock the next challenge.',
            }
        return {
            'state': 'insufficient_questions',
            'challenge': challenge,
            'day': None,
            'questions': [],
            'message': 'Not enough eligible challenge questions are available for completed sessions.',
        }

    day = StudentChallengeDay.objects.create(
        challenge=challenge,
        day_number=next_day_number,
        challenge_date=_next_challenge_date(challenge, today),
        status='assigned',
        total_questions=QUESTIONS_PER_DAY,
        started_at=timezone.now(),
    )
    day_questions = [
        StudentChallengeDayQuestion.objects.create(
            challenge_day=day,
            question=question,
            question_order=index,
        )
        for index, question in enumerate(selected_questions, start=1)
    ]
    return {
        'state': 'assigned',
        'challenge': challenge,
        'day': day,
        'questions': day_questions,
        'message': '',
    }


@transaction.atomic
def submit_challenge_day(student, challenge_day, submitted_answers):
    challenge_day = StudentChallengeDay.objects.select_for_update().select_related(
        'challenge',
        'challenge__student',
        'challenge__course',
        'challenge__batch',
    ).get(id=challenge_day.id)
    challenge = challenge_day.challenge

    if challenge.student_id != student.id:
        raise ChallengeValidationError('Challenge day not found for this student.')
    if challenge_day.status == 'completed':
        raise ChallengeValidationError('Challenge day already completed.')

    answer_map = {
        int(item.get('question_id')): _normalize_answer(item.get('selected_answer'))
        for item in submitted_answers
        if str(item.get('question_id') or '').isdigit()
    }

    assigned_questions = list(
        challenge_day.day_questions.select_related('question', 'question__source_session').order_by('question_order')
    )
    if not assigned_questions:
        raise ChallengeValidationError('No questions assigned for this challenge day.')
    assigned_question_ids = {day_question.question_id for day_question in assigned_questions}
    extra_question_ids = set(answer_map.keys()) - assigned_question_ids
    if extra_question_ids:
        raise ChallengeValidationError('Submitted answers include questions not assigned to this challenge day.')

    score = 0
    now = timezone.now()
    for day_question in assigned_questions:
        if not validate_question_eligibility(day_question.question, student, challenge.course, challenge.batch):
            raise ChallengeValidationError('One or more assigned questions are no longer eligible.')
        selected_answer = answer_map.get(day_question.question_id, '')
        is_correct = selected_answer == _normalize_answer(day_question.question.correct_answer)
        day_question.selected_answer = selected_answer or None
        day_question.is_correct = is_correct
        day_question.marks = 1 if is_correct else 0
        day_question.answered_at = now
        day_question.save(update_fields=['selected_answer', 'is_correct', 'marks', 'answered_at'])
        score += day_question.marks

    challenge_day.score = score
    challenge_day.total_questions = len(assigned_questions)
    challenge_day.status = 'completed'
    challenge_day.completed_at = now
    challenge_day.save(update_fields=['score', 'total_questions', 'status', 'completed_at', 'updated_at'])

    previous_day = StudentChallengeDay.objects.filter(
        challenge=challenge,
        day_number=challenge_day.day_number - 1,
        status='completed',
    ).first()
    is_consecutive_day = (
        previous_day and
        previous_day.challenge_date >= challenge_day.challenge_date - timedelta(days=1)
    )
    if challenge_day.day_number == 1 or is_consecutive_day:
        challenge.current_streak += 1
    else:
        challenge.current_streak = 1

    challenge.longest_streak = max(challenge.longest_streak, challenge.current_streak)
    challenge.completed_days = StudentChallengeDay.objects.filter(
        challenge=challenge,
        status='completed',
    ).count()
    challenge.total_score = StudentChallengeDay.objects.filter(
        challenge=challenge,
        status='completed',
    ).values_list('score', flat=True)
    challenge.total_score = sum(challenge.total_score)
    challenge.total_questions = StudentChallengeDay.objects.filter(
        challenge=challenge,
        status='completed',
    ).values_list('total_questions', flat=True)
    challenge.total_questions = sum(challenge.total_questions)
    if challenge.completed_days >= MAX_CHALLENGE_DAYS:
        challenge.status = 'completed'
    challenge.save(update_fields=[
        'current_streak',
        'longest_streak',
        'completed_days',
        'total_score',
        'total_questions',
        'status',
        'updated_at',
    ])
    if challenge.status == 'completed':
        ensure_challenge_achievement(challenge, challenge_day.completed_at)
    return challenge_day


def create_manual_question_pool_record(course, batch, source_session, **kwargs):
    if source_session.batch_id != batch.id or batch.course_name_id != course.id:
        raise ChallengeValidationError('Source session does not belong to this course and batch.')
    if not source_session.staff_completed or not source_session.completed_by_id:
        raise ChallengeValidationError('Only staff-completed sessions can be used for challenge questions.')
    return ChallengeQuestionPool.objects.create(
        course=course,
        batch=batch,
        source_session=source_session,
        topic_name=kwargs.get('topic_name') or source_session.title,
        difficulty=kwargs.get('difficulty') or 'medium',
        question_text=kwargs['question_text'],
        option_a=kwargs['option_a'],
        option_b=kwargs['option_b'],
        option_c=kwargs['option_c'],
        option_d=kwargs['option_d'],
        correct_answer=_normalize_answer(kwargs['correct_answer']),
        explanation=kwargs.get('explanation') or '',
        ai_provider=kwargs.get('ai_provider') or '',
        ai_model=kwargs.get('ai_model') or '',
        source_hash=kwargs.get('source_hash') or '',
    )
