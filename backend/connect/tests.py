import json
from datetime import date, timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import (
    Batches,
    ChallengeQuestionPool,
    CourseSession,
    Courses,
    DailySessionCompletion,
    Employee,
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
from .services.challenge_ai import (
    ChallengeAIError,
    extract_session_learning_content,
    generate_questions_for_completed_session,
    validate_ai_response,
)
from .services.challenge_service import (
    ChallengeValidationError,
    create_manual_question_pool_record,
    get_available_questions,
    get_eligible_sessions,
    get_or_create_student_challenge,
    get_or_create_today_challenge_day,
    get_student_session_counts,
    submit_challenge_day,
    validate_question_eligibility,
)


class StudentChallengePhaseOneTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student_user = User.objects.create_user(username='student1', password='pass123')
        self.other_user = User.objects.create_user(username='student2', password='pass123')
        self.staff_user = User.objects.create_user(username='mentor1', password='pass123')
        self.staff = Employee.objects.create(
            user=self.staff_user,
            staff_id='EMP001',
            email='mentor1@example.com',
            first_name='Mentor',
            last_name='One',
            mobile_no=9876543210,
            date_of_birth=date(1990, 1, 1),
            designation='mentor',
            branch='100ft',
            gender='Male',
            address='Coimbatore',
        )
        self.course = Courses.objects.create(
            course_name='Python',
            course_type='software',
            duration='2 months',
            fee=1000,
            course_logsheet='course_logsheets/python.pdf',
        )
        self.other_course = Courses.objects.create(
            course_name='Java',
            course_type='software',
            duration='2 months',
            fee=1000,
            course_logsheet='course_logsheets/java.pdf',
        )
        self.batch = Batches.objects.create(
            batch_number='BAT001',
            course_type='software',
            course_name=self.course,
            faculty=self.staff,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 3, 1),
            batch_timing='morning',
            branch='100ft',
        )
        self.other_batch = Batches.objects.create(
            batch_number='BAT002',
            course_type='software',
            course_name=self.other_course,
            faculty=self.staff,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 3, 1),
            batch_timing='morning',
            branch='100ft',
        )
        self.student = Students.objects.create(
            student_id='STU001',
            email='student1@example.com',
            first_name='Student',
            last_name='One',
            mobile_no='9999999999',
            date_of_birth=date(2000, 1, 1),
            city='Coimbatore',
            state='Tamil Nadu',
            qualification='UG',
            course='Python',
            gender='Female',
            branch='100ft',
            user=self.student_user,
            assigned_staff=self.staff,
            assigned_batch=self.batch,
        )
        self.other_student = Students.objects.create(
            student_id='STU002',
            email='student2@example.com',
            first_name='Student',
            last_name='Two',
            mobile_no='9999999998',
            date_of_birth=date(2000, 1, 1),
            city='Coimbatore',
            state='Tamil Nadu',
            qualification='UG',
            course='Python',
            gender='Female',
            branch='100ft',
            user=self.other_user,
        )
        self.course_enrollment = StudentCourseEnrollment.objects.create(
            student=self.student,
            course=self.course,
            enrolled_by=self.staff_user,
        )
        StudentBatchEnrollment.objects.create(
            student=self.student,
            batch=self.batch,
            course_enrollment=self.course_enrollment,
            assigned_by=self.staff_user,
        )
        self.completed_session = CourseSession.objects.create(
            batch=self.batch,
            session_number=1,
            title='Variables',
            topics='Variables and types',
            staff_completed=True,
            completed_by=self.staff,
            completed_date=timezone.now(),
        )
        self.incomplete_session = CourseSession.objects.create(
            batch=self.batch,
            session_number=2,
            title='Loops',
            topics='For loops',
            staff_completed=False,
        )
        Student_Session_Progress.objects.create(
            student=self.student,
            session=self.completed_session,
            completed=True,
            student_status='completed',
            staff_completed=True,
            staff_completed_at=timezone.now(),
            student_confirmed_at=timezone.now(),
        )

    def create_pool_questions(self, count=5, difficulty='easy', session=None):
        session = session or self.completed_session
        return [
            create_manual_question_pool_record(
                self.course,
                self.batch,
                session,
                topic_name=f'Topic {index}',
                difficulty=difficulty,
                question_text=f'Question {index}?',
                option_a='A',
                option_b='B',
                option_c='C',
                option_d='D',
                correct_answer='A',
            )
            for index in range(count)
        ]

    def test_student_can_create_own_challenge(self):
        challenge = get_or_create_student_challenge(self.student, self.course, self.batch)

        self.assertEqual(challenge.student, self.student)
        self.assertEqual(challenge.course, self.course)
        self.assertEqual(challenge.batch, self.batch)

    def test_duplicate_challenge_is_prevented(self):
        first = get_or_create_student_challenge(self.student, self.course, self.batch)
        second = get_or_create_student_challenge(self.student, self.course, self.batch)

        self.assertEqual(first.id, second.id)
        self.assertEqual(StudentChallenge.objects.count(), 1)

    def test_only_enrolled_course_batch_can_access_challenge(self):
        with self.assertRaises(ChallengeValidationError):
            get_or_create_student_challenge(self.other_student, self.course, self.batch)

    def test_completed_course_session_is_eligible(self):
        sessions = get_eligible_sessions(self.student, self.course, self.batch)

        self.assertIn(self.completed_session, list(sessions))

    def test_incomplete_course_session_is_not_eligible(self):
        sessions = get_eligible_sessions(self.student, self.course, self.batch)

        self.assertNotIn(self.incomplete_session, list(sessions))

    def test_staff_completed_session_does_not_inflate_student_challenge_eligibility(self):
        staff_only_session = CourseSession.objects.create(
            batch=self.batch,
            session_number=3,
            title='Functions',
            topics='Python functions',
            staff_completed=True,
            completed_by=self.staff,
            completed_date=timezone.now(),
        )

        sessions = get_eligible_sessions(self.student, self.course, self.batch)

        self.assertIn(self.completed_session, list(sessions))
        self.assertNotIn(staff_only_session, list(sessions))

    def test_student_session_counts_use_only_current_student_completion(self):
        staff_only_session = CourseSession.objects.create(
            batch=self.batch,
            session_number=3,
            title='Functions',
            topics='Python functions',
            staff_completed=True,
            completed_by=self.staff,
            completed_date=timezone.now(),
        )
        Student_Session_Progress.objects.create(
            student=self.other_student,
            session=staff_only_session,
            completed=True,
            student_status='completed',
            staff_completed=True,
        )

        counts = get_student_session_counts(self.student, self.course, self.batch)

        self.assertEqual(counts['completed_sessions'], 1)
        self.assertEqual(counts['total_sessions'], 3)

    def test_student_session_counts_accept_existing_status_and_completion_records(self):
        status_session = CourseSession.objects.create(
            batch=self.batch,
            session_number=3,
            title='Lists',
            topics='List operations',
            staff_completed=True,
            completed_by=self.staff,
            completed_date=timezone.now(),
        )
        completion_session = CourseSession.objects.create(
            batch=self.batch,
            session_number=4,
            title='Tuples',
            topics='Tuple operations',
            staff_completed=True,
            completed_by=self.staff,
            completed_date=timezone.now(),
        )
        StudentSessionStatus.objects.create(
            student=self.student,
            session=status_session,
            student_status='completed',
            staff_completed=True,
        )
        SessionCompletion.objects.create(
            student=self.student,
            session=completion_session,
            status='completed',
        )

        counts = get_student_session_counts(self.student, self.course, self.batch)

        self.assertEqual(counts['completed_sessions'], 3)
        self.assertEqual(counts['total_sessions'], 4)

    def test_challenge_summary_api_returns_student_specific_session_counts(self):
        CourseSession.objects.create(
            batch=self.batch,
            session_number=3,
            title='Functions',
            topics='Python functions',
            staff_completed=True,
            completed_by=self.staff,
            completed_date=timezone.now(),
        )
        self.client.force_authenticate(user=self.student_user)

        response = self.client.get('/api/student/challenge/')

        self.assertEqual(response.status_code, 200)
        summary = response.json()['results'][0]
        self.assertEqual(summary['completed_sessions'], 1)
        self.assertEqual(summary['total_sessions'], 3)

    def test_question_from_another_batch_or_course_is_rejected(self):
        other_session = CourseSession.objects.create(
            batch=self.other_batch,
            session_number=1,
            title='Java Basics',
            staff_completed=True,
            completed_by=self.staff,
            completed_date=timezone.now(),
        )
        question = ChallengeQuestionPool.objects.create(
            course=self.other_course,
            batch=self.other_batch,
            source_session=other_session,
            topic_name='Java',
            difficulty='easy',
            question_text='Java question?',
            option_a='A',
            option_b='B',
            option_c='C',
            option_d='D',
            correct_answer='A',
        )

        self.assertFalse(validate_question_eligibility(question, self.student, self.course, self.batch))

    def test_incomplete_session_cannot_seed_manual_question(self):
        with self.assertRaises(ChallengeValidationError):
            create_manual_question_pool_record(
                self.course,
                self.batch,
                self.incomplete_session,
                question_text='Future question?',
                option_a='A',
                option_b='B',
                option_c='C',
                option_d='D',
                correct_answer='A',
            )

    def test_today_questions_remain_identical_after_refresh(self):
        self.create_pool_questions(5)
        first = get_or_create_today_challenge_day(self.student, self.course, self.batch)
        second = get_or_create_today_challenge_day(self.student, self.course, self.batch)

        first_ids = [item.question_id for item in first['questions']]
        second_ids = [item.question_id for item in second['questions']]
        self.assertEqual(first_ids, second_ids)

    def test_completed_sessions_auto_generate_missing_question_pool(self):
        self.create_pool_questions(4)
        result = get_or_create_today_challenge_day(self.student, self.course, self.batch)

        self.assertEqual(result['state'], 'assigned')
        self.assertEqual(len(result['questions']), 5)
        self.assertGreaterEqual(get_available_questions(self.student, self.course, self.batch).count(), 5)

    def test_no_completed_student_sessions_remains_insufficient(self):
        Student_Session_Progress.objects.filter(student=self.student, session=self.completed_session).delete()
        StudentSessionStatus.objects.filter(student=self.student, session=self.completed_session).delete()
        SessionCompletion.objects.filter(student=self.student, session=self.completed_session).delete()
        self.create_pool_questions(5)
        result = get_or_create_today_challenge_day(self.student, self.course, self.batch)

        self.assertEqual(result['state'], 'insufficient_questions')
        self.assertEqual(StudentChallengeDay.objects.count(), 0)

    def test_correct_answer_is_not_exposed_in_today_api(self):
        self.create_pool_questions(5)
        self.client.force_authenticate(user=self.student_user)

        response = self.client.get(
            f'/api/student/challenge/today/?course_id={self.course.id}&batch_id={self.batch.id}'
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertNotIn('correct_answer', str(payload))

    def test_student_cannot_access_another_students_challenge_day(self):
        self.create_pool_questions(5)
        result = get_or_create_today_challenge_day(self.student, self.course, self.batch)
        self.client.force_authenticate(user=self.other_user)

        response = self.client.post(
            f"/api/student/challenge/day/{result['day'].id}/submit/",
            {'answers': [{'question_id': item.question_id, 'selected_answer': 'A'} for item in result['questions']]},
            format='json',
        )

        self.assertEqual(response.status_code, 400)

    def test_same_question_is_not_assigned_twice_in_challenge(self):
        self.create_pool_questions(10)
        first = get_or_create_today_challenge_day(
            self.student,
            self.course,
            self.batch,
            today=date.today(),
        )
        challenge = first['challenge']
        submit_challenge_day(
            self.student,
            first['day'],
            [{'question_id': item.question_id, 'selected_answer': 'A'} for item in first['questions']],
        )
        second = get_or_create_today_challenge_day(
            self.student,
            self.course,
            self.batch,
            today=date.today() + timedelta(days=1),
        )

        first_ids = {item.question_id for item in first['questions']}
        second_ids = {item.question_id for item in second['questions']}
        self.assertEqual(challenge.id, second['challenge'].id)
        self.assertTrue(first_ids.isdisjoint(second_ids))

    def test_completed_day_one_with_new_content_creates_day_two(self):
        self.create_pool_questions(5)
        first = get_or_create_today_challenge_day(self.student, self.course, self.batch)
        day_one = first['day']
        day_one_question_ids = [item.question_id for item in first['questions']]
        submit_challenge_day(
            self.student,
            day_one,
            [{'question_id': item.question_id, 'selected_answer': 'A'} for item in first['questions']],
        )
        day_one.refresh_from_db()
        original_completed_at = day_one.completed_at

        self.incomplete_session.staff_completed = True
        self.incomplete_session.completed_by = self.staff
        self.incomplete_session.completed_date = timezone.now()
        self.incomplete_session.save(update_fields=['staff_completed', 'completed_by', 'completed_date'])
        Student_Session_Progress.objects.create(
            student=self.student,
            session=self.incomplete_session,
            completed=True,
            student_status='completed',
            staff_completed=True,
            staff_completed_at=timezone.now(),
            student_confirmed_at=timezone.now(),
        )
        self.create_pool_questions(5, session=self.incomplete_session)

        second = get_or_create_today_challenge_day(self.student, self.course, self.batch)
        day_two_question_ids = [item.question_id for item in second['questions']]
        refreshed_second = get_or_create_today_challenge_day(self.student, self.course, self.batch)

        day_one.refresh_from_db()
        self.assertEqual(second['state'], 'assigned')
        self.assertEqual(second['day'].day_number, 2)
        self.assertEqual(len(day_two_question_ids), 5)
        self.assertTrue(set(day_one_question_ids).isdisjoint(day_two_question_ids))
        self.assertEqual(
            {item.question.source_session_id for item in second['questions']},
            {self.incomplete_session.id},
        )
        self.assertEqual(original_completed_at, day_one.completed_at)
        self.assertEqual(day_one.status, 'completed')
        self.assertEqual(day_two_question_ids, [item.question_id for item in refreshed_second['questions']])

    def test_legacy_batch_enrollment_without_course_enrollment_is_supported(self):
        StudentBatchEnrollment.objects.filter(student=self.student, batch=self.batch).update(course_enrollment=None)

        challenge = get_or_create_student_challenge(self.student, self.course, self.batch)

        self.assertEqual(challenge.batch, self.batch)

    def test_daily_assignment_falls_back_to_other_eligible_difficulty(self):
        self.create_pool_questions(3, difficulty='medium')
        self.create_pool_questions(2, difficulty='hard')

        result = get_or_create_today_challenge_day(self.student, self.course, self.batch)

        self.assertEqual(result['state'], 'assigned')
        self.assertEqual(len(result['questions']), 5)

    def test_unassigned_question_id_is_rejected_on_submit(self):
        self.create_pool_questions(6)
        result = get_or_create_today_challenge_day(self.student, self.course, self.batch)
        unassigned_question = ChallengeQuestionPool.objects.exclude(
            id__in=[item.question_id for item in result['questions']]
        ).first()

        with self.assertRaises(ChallengeValidationError):
            submit_challenge_day(
                self.student,
                result['day'],
                [{'question_id': unassigned_question.id, 'selected_answer': 'A'}],
            )

    def test_frontend_score_fields_are_ignored_by_submit_api(self):
        self.create_pool_questions(5)
        result = get_or_create_today_challenge_day(self.student, self.course, self.batch)
        self.client.force_authenticate(user=self.student_user)

        response = self.client.post(
            f"/api/student/challenge/day/{result['day'].id}/submit/",
            {
                'score': 999,
                'is_correct': True,
                'current_streak': 99,
                'answers': [{'question_id': item.question_id, 'selected_answer': 'B'} for item in result['questions']],
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['day']['score'], 0)

    def test_history_api_returns_only_authenticated_student_challenges(self):
        get_or_create_student_challenge(self.student, self.course, self.batch)
        self.client.force_authenticate(user=self.student_user)

        response = self.client.get('/api/student/challenge/history/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()['results']), 1)

    def test_score_is_calculated_by_backend_and_duplicate_submit_blocked(self):
        self.create_pool_questions(5)
        result = get_or_create_today_challenge_day(self.student, self.course, self.batch)
        day = result['day']
        answers = [
            {'question_id': item.question_id, 'selected_answer': 'A'}
            for item in result['questions']
        ]

        submitted = submit_challenge_day(self.student, day, answers)

        self.assertEqual(submitted.score, 5)
        self.assertEqual(submitted.status, 'completed')
        with self.assertRaises(ChallengeValidationError):
            submit_challenge_day(self.student, day, answers)

    def test_streak_increments_and_missed_day_resets(self):
        self.create_pool_questions(15)
        challenge = get_or_create_student_challenge(self.student, self.course, self.batch)
        challenge.start_date = date.today() - timedelta(days=2)
        challenge.save(update_fields=['start_date'])
        day_one = StudentChallengeDay.objects.create(
            challenge=challenge,
            day_number=1,
            challenge_date=challenge.start_date,
            total_questions=5,
        )
        for index, question in enumerate(get_available_questions(self.student, self.course, self.batch)[:5], start=1):
            StudentChallengeDayQuestion.objects.create(challenge_day=day_one, question=question, question_order=index)
        submit_challenge_day(
            self.student,
            day_one,
            [{'question_id': item.question_id, 'selected_answer': 'A'} for item in day_one.day_questions.all()],
        )

        today_result = get_or_create_today_challenge_day(self.student, self.course, self.batch)
        submit_challenge_day(
            self.student,
            today_result['day'],
            [{'question_id': item.question_id, 'selected_answer': 'A'} for item in today_result['questions']],
        )
        challenge.refresh_from_db()

        self.assertEqual(challenge.current_streak, 1)
        self.assertEqual(challenge.longest_streak, 1)
        self.assertEqual(challenge.completed_days, 2)

    def test_day_fifteen_marks_challenge_completed(self):
        self.create_pool_questions(75)
        challenge = get_or_create_student_challenge(self.student, self.course, self.batch)
        challenge.start_date = date.today() - timedelta(days=14)
        challenge.save(update_fields=['start_date'])

        for day_number in range(1, 15):
            day = StudentChallengeDay.objects.create(
                challenge=challenge,
                day_number=day_number,
                challenge_date=challenge.start_date + timedelta(days=day_number - 1),
                status='completed',
                score=5,
                total_questions=5,
                completed_at=timezone.now(),
            )
            for order, question in enumerate(get_available_questions(self.student, self.course, self.batch).exclude(
                id__in=StudentChallengeDayQuestion.objects.filter(
                    challenge_day__challenge=challenge
                ).values_list('question_id', flat=True)
            )[:5], start=1):
                StudentChallengeDayQuestion.objects.create(
                    challenge_day=day,
                    question=question,
                    question_order=order,
                    selected_answer='A',
                    is_correct=True,
                    marks=1,
                    answered_at=timezone.now(),
                )

        challenge.completed_days = 14
        challenge.save(update_fields=['completed_days'])
        result = get_or_create_today_challenge_day(
            self.student,
            self.course,
            self.batch,
            today=challenge.start_date + timedelta(days=14),
        )
        submit_challenge_day(
            self.student,
            result['day'],
            [{'question_id': item.question_id, 'selected_answer': 'A'} for item in result['questions']],
        )
        challenge.refresh_from_db()

        self.assertEqual(result['day'].day_number, 15)
        self.assertEqual(challenge.completed_days, 15)
        self.assertEqual(challenge.status, 'completed')

    def test_fast_learner_can_complete_all_days_and_gets_one_achievement(self):
        self.create_pool_questions(75)
        today = date.today()
        assigned_question_sets = []

        for expected_day in range(1, 16):
            result = get_or_create_today_challenge_day(
                self.student,
                self.course,
                self.batch,
                today=today,
            )
            self.assertEqual(result['state'], 'assigned')
            self.assertEqual(result['day'].day_number, expected_day)
            self.assertEqual(result['day'].challenge_date, today)
            question_ids = {item.question_id for item in result['questions']}
            self.assertEqual(len(question_ids), 5)
            for previous_ids in assigned_question_sets:
                self.assertTrue(question_ids.isdisjoint(previous_ids))
            assigned_question_sets.append(question_ids)
            submit_challenge_day(
                self.student,
                result['day'],
                [{'question_id': item.question_id, 'selected_answer': 'A'} for item in result['questions']],
            )

        challenge = StudentChallenge.objects.get(student=self.student, course=self.course, batch=self.batch)
        self.assertEqual(challenge.completed_days, 15)
        self.assertEqual(challenge.status, 'completed')
        self.assertEqual(challenge.current_streak, 15)
        self.assertEqual(challenge.days.filter(status='completed').count(), 15)
        self.assertEqual(StudentChallengeDayQuestion.objects.filter(challenge_day__challenge=challenge).count(), 75)

        achievement = StudentChallengeAchievement.objects.get(challenge=challenge)
        self.assertEqual(achievement.student, self.student)
        self.assertEqual(achievement.course, self.course)
        self.assertEqual(achievement.batch, self.batch)
        self.assertEqual(achievement.badge_title, 'Excellent Student')
        self.assertEqual(achievement.calendar_days_taken, 1)

        refresh = get_or_create_today_challenge_day(self.student, self.course, self.batch, today=today)
        self.assertEqual(refresh['state'], 'completed')
        self.assertEqual(StudentChallengeAchievement.objects.filter(challenge=challenge).count(), 1)

    def ai_payload(self, count=5):
        return json.dumps({
            'questions': [
                {
                    'question': f'What is concept {index}?',
                    'options': [f'Option {index}A', f'Option {index}B', f'Option {index}C', f'Option {index}D'],
                    'correct_answer': 'A',
                    'difficulty': 'easy',
                    'explanation': f'Explanation {index}',
                }
                for index in range(1, count + 1)
            ]
        })

    @override_settings(
        CHALLENGE_AI_PROVIDER='openai',
        CHALLENGE_AI_MODEL='mock-model',
        CHALLENGE_AI_API_KEY='mock-key',
    )
    @patch('connect.services.challenge_ai.call_ai_question_provider')
    def test_ai_generation_creates_question_pool_records(self, mocked_provider):
        mocked_provider.return_value = self.ai_payload(5)

        result = generate_questions_for_completed_session(self.completed_session, count=5)

        self.assertEqual(len(result['created']), 5)
        self.assertEqual(ChallengeQuestionPool.objects.count(), 5)
        self.assertEqual(ChallengeQuestionPool.objects.first().ai_model, 'mock-model')

    @patch('connect.services.challenge_ai.call_ai_question_provider')
    def test_incomplete_session_never_calls_ai_provider(self, mocked_provider):
        with self.assertRaises(ChallengeValidationError):
            generate_questions_for_completed_session(self.incomplete_session, count=5)

        mocked_provider.assert_not_called()

    def test_ai_response_requires_strict_json_with_questions(self):
        with self.assertRaises(ChallengeAIError):
            validate_ai_response('not json', self.completed_session)

        with self.assertRaises(ChallengeAIError):
            validate_ai_response(json.dumps({'items': []}), self.completed_session)

    def test_ai_response_requires_four_unique_options_and_valid_answer(self):
        duplicate_options = json.dumps({
            'questions': [{
                'question': 'What is Python?',
                'options': ['Language', 'Language', 'Snake', 'Tool'],
                'correct_answer': 'A',
            }]
        })
        bad_answer = json.dumps({
            'questions': [{
                'question': 'What is Python?',
                'options': ['Language', 'Snake', 'Tool', 'Framework'],
                'correct_answer': 'E',
            }]
        })

        with self.assertRaises(ChallengeAIError):
            validate_ai_response(duplicate_options, self.completed_session)
        with self.assertRaises(ChallengeAIError):
            validate_ai_response(bad_answer, self.completed_session)

    @override_settings(
        CHALLENGE_AI_PROVIDER='openai',
        CHALLENGE_AI_MODEL='mock-model',
        CHALLENGE_AI_API_KEY='mock-key',
    )
    @patch('connect.services.challenge_ai.call_ai_question_provider')
    def test_ai_generation_skips_duplicate_questions(self, mocked_provider):
        mocked_provider.return_value = self.ai_payload(5)

        first = generate_questions_for_completed_session(self.completed_session, count=5)
        second = generate_questions_for_completed_session(self.completed_session, count=5)

        self.assertEqual(len(first['created']), 5)
        self.assertEqual(len(second['created']), 0)
        self.assertEqual(len(second['skipped']), 5)
        self.assertEqual(ChallengeQuestionPool.objects.count(), 5)

    def test_session_content_includes_topics_and_completion_notes(self):
        DailySessionCompletion.objects.create(
            session=self.completed_session,
            faculty=self.staff,
            completion_date=date.today(),
            completed=True,
            notes='Explained variable assignment examples',
            topics_covered='Integers and strings',
        )

        content = extract_session_learning_content(self.completed_session)

        self.assertIn('Variables and types', content)
        self.assertIn('Explained variable assignment examples', content)
        self.assertIn('Integers and strings', content)

    @override_settings(
        CHALLENGE_AI_PROVIDER='openai',
        CHALLENGE_AI_MODEL='mock-model',
        CHALLENGE_AI_API_KEY='mock-key',
    )
    @patch('connect.services.challenge_ai.call_ai_question_provider')
    def test_generate_challenge_questions_api_is_staff_only(self, mocked_provider):
        mocked_provider.return_value = self.ai_payload(5)
        self.client.force_authenticate(user=self.student_user)

        denied = self.client.post(
            '/api/challenge/questions/generate/',
            {'session_id': self.completed_session.id, 'count': 5},
            format='json',
        )

        self.assertEqual(denied.status_code, 403)

        self.client.force_authenticate(user=self.staff_user)
        allowed = self.client.post(
            '/api/challenge/questions/generate/',
            {'session_id': self.completed_session.id, 'count': 5},
            format='json',
        )

        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(allowed.json()['created_count'], 5)
        self.assertNotIn('mock-key', str(allowed.json()))
