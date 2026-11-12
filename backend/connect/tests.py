import json
import tempfile
from uuid import uuid4
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import (
    Batches,
    BatchSessionProgress,
    ChallengeQuestionPool,
    CompletedStudent,
    CourseSession,
    Courses,
    DailySessionCompletion,
    Employee,
    FeePayment,
    ReassignedStudentRecord,
    Quiz,
    QuizQuestion,
    StudyMaterial,
    StudyMaterialAssignment,
    StudentLeaveApplication,
    StudentBatchEnrollment,
    StudentChallenge,
    StudentChallengeAchievement,
    StudentChallengeDay,
    StudentChallengeDayQuestion,
    StudentCourseEnrollment,
    StudentSupportRequest,
    StudentSessionStatus,
    Student_Session_Progress,
    SessionCompletion,
    SessionNotification,
    Students,
    AssignedTest,
    QuizTest,
    TestResult,
    UserActivity,
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
from .api_views import _send_batch_duration_notifications
from .student_counts import completed_students_for_staff


class AccountEmailWorkflowTests(TestCase):
    """Verify account email workflows without delivering mail to real recipients."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='account-test-admin',
            email='account-test-admin@example.com',
            password='pass123',
        )
        self.course = Courses.objects.create(
            course_name='Account Workflow Course',
            course_type='software',
            duration='1 month',
            fee=1000,
        )

    @patch('connect.api_views.send_email_async')
    def test_creating_student_queues_welcome_credentials_email(self, send_email_async_mock):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post('/api/students/create/', {
            'student_id': 'EMAIL-STU-1',
            'first_name': 'Email',
            'last_name': 'Student',
            'email': 'email.student@example.com',
            'mobile_no': '9000000111',
            'date_of_birth': '2000-01-01',
            'city': 'Coimbatore',
            'state': 'Tamil Nadu',
            'qualification': 'Graduate',
            'gender': 'Female',
            'branch': '100ft',
            'course_ids': [self.course.id],
        }, format='json')

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['email_status'], 'queued')
        send_email_async_mock.assert_called_once()
        self.assertEqual(send_email_async_mock.call_args.kwargs['recipient_list'], ['email.student@example.com'])
        self.assertIn('email.student@example.com', send_email_async_mock.call_args.kwargs['message'])
        self.assertIn('9000000111', send_email_async_mock.call_args.kwargs['message'])

    @patch('connect.api_views.send_email_async')
    def test_creating_student_accepts_the_browser_multipart_form_payload(self, _send_email_async_mock):
        """Keep the counselor's FormData request contract covered by QA."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.post('/api/students/create/', {
            'student_id': 'MULTIPART-STU-1',
            'first_name': 'Multipart',
            'last_name': 'Student',
            'email': 'multipart.student@example.com',
            'mobile_no': '9000000113',
            'date_of_birth': '2000-01-01',
            'city': 'Coimbatore',
            'state': 'Tamil Nadu',
            'qualification': 'Graduate',
            'gender': 'Male',
            'branch': '100ft',
            'course': self.course.course_name,
            'course_ids': str(self.course.id),
            'course_fee_overrides': json.dumps({
                str(self.course.id): {
                    'course_fee': self.course.fee,
                    'eligible_discount': 0,
                    'actual_fee': self.course.fee,
                },
            }),
        }, format='multipart')

        self.assertEqual(response.status_code, 201, response.data)

    @patch('connect.api_views.send_configured_email')
    @patch('connect.api_views.random.randint', return_value=123456)
    def test_student_can_request_otp_and_reset_password(self, _random_mock, send_email_mock):
        user = User.objects.create_user(
            username='reset.student@example.com',
            email='reset.student@example.com',
            password='old-password',
        )
        Students.objects.create(
            user=user,
            student_id='RESET-STU-1',
            email='reset.student@example.com',
            first_name='Reset',
            last_name='Student',
            mobile_no='9000000112',
            date_of_birth=date(2000, 1, 1),
            city='Coimbatore',
            state='Tamil Nadu',
            qualification='Graduate',
            course=self.course.course_name,
            gender='Female',
            branch='100ft',
        )

        forgot_response = self.client.post('/api/auth/forgot-password/', {
            'email': 'reset.student@example.com',
        }, format='json')
        self.assertEqual(forgot_response.status_code, 200)
        send_email_mock.assert_called_once()
        self.assertEqual(send_email_mock.call_args.kwargs['to_email'], 'reset.student@example.com')

        reset_response = self.client.post('/api/auth/reset-password/', {
            'email': 'reset.student@example.com',
            'otp': '123456',
            'new_password': 'New-Password-123',
        }, format='json')
        self.assertEqual(reset_response.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.check_password('New-Password-123'))
        self.assertIsNone(cache.get('password_reset_otp_reset.student@example.com'))


class CompletedStudentOwnershipTests(TestCase):
    def setUp(self):
        self.owner_user = User.objects.create_user('graduate-owner', password='pass123')
        self.other_user = User.objects.create_user('graduate-other', password='pass123')
        self.owner = Employee.objects.create(
            user=self.owner_user, staff_id='GRAD-OWNER', email='graduate-owner@example.com',
            first_name='Graduate', last_name='Owner', mobile_no='9000000113',
            date_of_birth=date(1990, 1, 1), designation='mentor', branch='100ft', gender='Male', address='Coimbatore',
        )
        self.other = Employee.objects.create(
            user=self.other_user, staff_id='GRAD-OTHER', email='graduate-other@example.com',
            first_name='Graduate', last_name='Other', mobile_no='9000000114',
            date_of_birth=date(1991, 1, 1), designation='mentor', branch='100ft', gender='Female', address='Coimbatore',
        )
        self.course = Courses.objects.create(course_name='Graduate Ownership Course', course_type='software', duration='1 month', fee=1000)
        self.batch = Batches.objects.create(
            batch_number='GRAD-OWN-B1', course_type='software', course_name=self.course,
            faculty=self.owner, start_date=date(2026, 1, 1), end_date=date(2026, 2, 1), batch_timing='Morning', branch='100ft',
        )

    def _completed(self, student_id, trainer=None):
        return CompletedStudent.objects.create(
            original_student_id=student_id, student_id=student_id, email=f'{student_id}@example.com',
            first_name='Graduate', last_name='Student', mobile_no='9000000115', date_of_birth=date(2000, 1, 1),
            city='Coimbatore', state='Tamil Nadu', qualification='Graduate', course=self.course.course_name,
            gender='Female', branch='100ft', batch_number=self.batch.batch_number, batch_id=str(self.batch.id),
            batch_start_date=self.batch.start_date, batch_end_date=self.batch.end_date, faculty_name='Graduate Owner',
            course_name=self.course.course_name, graduated_from_trainer=trainer,
        )

    def test_explicit_graduating_trainer_owns_completed_student(self):
        owned = self._completed('OWNED-STU', trainer=self.owner)
        other_trainers_graduate = self._completed('OTHER-STU', trainer=self.other)
        legacy = self._completed('LEGACY-STU')

        owner_rows = completed_students_for_staff(self.owner)
        other_rows = completed_students_for_staff(self.other)
        self.assertIn(owned, owner_rows)
        self.assertIn(legacy, owner_rows)
        self.assertNotIn(other_trainers_graduate, owner_rows)
        self.assertIn(other_trainers_graduate, other_rows)
        self.assertNotIn(owned, other_rows)


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

    @override_settings(
        CHALLENGE_AI_PROVIDER='openai',
        CHALLENGE_AI_MODEL='mock-model',
        CHALLENGE_AI_API_KEY='mock-key',
    )
    @patch('connect.services.challenge_ai.call_ai_question_provider')
    def test_completed_sessions_auto_generate_missing_question_pool(self, mocked_provider):
        mocked_provider.return_value = self.ai_payload(5)
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

    def test_materials_are_limited_to_active_student_batches(self):
        current_material = StudyMaterial.objects.create(
            batch=self.batch,
            uploaded_by=self.staff,
            title='Current batch material',
            file='materials/current.pdf',
        )
        old_material = StudyMaterial.objects.create(
            batch=self.other_batch,
            uploaded_by=self.staff,
            title='Other batch material',
            file='materials/other.pdf',
        )
        ReassignedStudentRecord.objects.create(
            student=self.student,
            previous_trainer=self.staff,
            reassigned_trainer=self.staff,
            source_batch=self.other_batch,
            target_batch=self.batch,
            student_name='Student One',
            student_code='STU001',
            course_name='Python',
            source_batch_number='BAT002',
            target_batch_number='BAT001',
            previous_trainer_name='Mentor One',
            reassigned_trainer_name='Mentor One',
            reassigned_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.student_user)

        response = self.client.get('/api/materials/')

        self.assertEqual(response.status_code, 200)
        material_ids = {item['id'] for item in response.json()['results']}
        self.assertIn(current_material.id, material_ids)
        self.assertNotIn(old_material.id, material_ids)
        denied = self.client.get(f'/api/materials/{old_material.id}/preview/')
        self.assertEqual(denied.status_code, 403)

    def test_student_can_preview_an_assigned_material(self):
        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                material = StudyMaterial.objects.create(
                    batch=self.batch,
                    uploaded_by=self.staff,
                    title='Student notes',
                    file=SimpleUploadedFile('student-notes.txt', b'Python variables are used to store values.'),
                )
                self.client.force_authenticate(user=self.student_user)

                response = self.client.get(f'/api/materials/{material.id}/preview/')

        self.assertEqual(response.status_code, 200)
        self.assertIn(b'Python variables are used to store values.', response.content)

    def test_admin_and_staff_quiz_management_are_separate(self):
        admin_user = User.objects.create_superuser(
            username='quiz-admin', email='quiz-admin@example.com', password='pass123'
        )
        admin_quiz = Quiz.objects.create(
            title='Global quiz', quiz_scope='admin_global', audience='both', is_published=True
        )
        staff_quiz = Quiz.objects.create(
            title='Batch quiz', quiz_scope='staff_batch', created_by=self.staff
        )

        self.client.force_authenticate(user=admin_user)
        admin_titles = {item['title'] for item in self.client.get('/api/quiz/').json()['results']}
        self.assertIn(admin_quiz.title, admin_titles)
        self.assertNotIn(staff_quiz.title, admin_titles)

        self.client.force_authenticate(user=self.staff_user)
        staff_titles = {item['title'] for item in self.client.get('/api/quiz/').json()['results']}
        self.assertIn(staff_quiz.title, staff_titles)
        self.assertNotIn(admin_quiz.title, staff_titles)

    def test_staff_quiz_can_be_assigned_to_multiple_batches(self):
        quiz = Quiz.objects.create(
            title='Multi batch quiz', quiz_scope='staff_batch', created_by=self.staff
        )
        QuizQuestion.objects.create(
            quiz=quiz,
            question_number=1,
            question_text='What is Python?',
            option_a='A language',
            option_b='A database',
            correct_answer='A',
        )
        self.client.force_authenticate(user=self.staff_user)

        response = self.client.post(
            f'/api/quiz/{quiz.id}/assign/',
            {'batch_ids': [self.batch.id, self.other_batch.id]},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        quiz.refresh_from_db()
        self.assertTrue(quiz.is_published)
        self.assertSetEqual(
            set(quiz.assigned_batches.values_list('id', flat=True)),
            {self.batch.id, self.other_batch.id},
        )

    def test_student_sees_only_global_and_assigned_batch_quizzes(self):
        global_quiz = Quiz.objects.create(
            title='All students quiz', quiz_scope='admin_global', audience='students', is_published=True
        )
        assigned_quiz = Quiz.objects.create(
            title='Assigned batch quiz', quiz_scope='staff_batch', created_by=self.staff, is_published=True
        )
        assigned_quiz.assigned_batches.add(self.batch)
        hidden_quiz = Quiz.objects.create(
            title='Other batch quiz', quiz_scope='staff_batch', created_by=self.staff, is_published=True
        )
        hidden_quiz.assigned_batches.add(self.other_batch)
        self.client.force_authenticate(user=self.student_user)

        response = self.client.get('/api/quiz/student/')

        self.assertEqual(response.status_code, 200)
        titles = {item['title'] for item in response.json()['results']}
        self.assertIn(global_quiz.title, titles)
        self.assertIn(assigned_quiz.title, titles)
        self.assertNotIn(hidden_quiz.title, titles)


class ParallelCourseWorkflowTests(TransactionTestCase):
    """Regression coverage for multi-batch students and shared course sessions."""

    def setUp(self):
        self.client = APIClient()
        # Keep every fixture independent when the reusable local test database
        # contains data from an interrupted prior run.
        fixture_suffix = uuid4().hex[:8]
        self.trainer_one_user = User.objects.create_user(f'parallel-trainer-1-{fixture_suffix}', password='pass123')
        self.trainer_two_user = User.objects.create_user(f'parallel-trainer-2-{fixture_suffix}', password='pass123')
        self.student_user = User.objects.create_user(f'parallel-student-{fixture_suffix}', password='pass123')
        self.trainer_one = Employee.objects.create(
            user=self.trainer_one_user, staff_id=f'PAR001-{fixture_suffix}', email=f'parallel-one-{fixture_suffix}@example.com',
            first_name='Parallel', last_name='One', mobile_no=9000000001,
            date_of_birth=date(1990, 1, 1), designation='mentor', branch='100ft',
            gender='Male', address='Coimbatore',
        )
        self.trainer_two = Employee.objects.create(
            user=self.trainer_two_user, staff_id=f'PAR002-{fixture_suffix}', email=f'parallel-two-{fixture_suffix}@example.com',
            first_name='Parallel', last_name='Two', mobile_no=9000000002,
            date_of_birth=date(1991, 1, 1), designation='mentor', branch='100ft',
            gender='Female', address='Coimbatore',
        )
        self.course = Courses.objects.create(
            course_name='Parallel Python', course_type='software', duration='2 months', fee=1000,
        )
        self.batch_one = Batches.objects.create(
            batch_number=f'PAR-B1-{fixture_suffix}', course_type='software', course_name=self.course,
            faculty=self.trainer_one, start_date=date(2026, 1, 1), end_date=date(2026, 3, 1),
            batch_timing='morning', branch='100ft',
        )
        self.batch_two = Batches.objects.create(
            batch_number=f'PAR-B2-{fixture_suffix}', course_type='software', course_name=self.course,
            faculty=self.trainer_two, start_date=date(2026, 1, 1), end_date=date(2026, 3, 1),
            batch_timing='evening', branch='100ft',
        )
        self.student = Students.objects.create(
            student_id=f'PAR-STU-{fixture_suffix}', email=f'parallel-student-{fixture_suffix}@example.com', first_name='Parallel',
            last_name='Student', mobile_no='9000000003', date_of_birth=date(2001, 1, 1),
            city='Coimbatore', state='Tamil Nadu', qualification='UG', course='Parallel Python',
            gender='Female', branch='100ft', user=self.student_user,
            assigned_staff=self.trainer_one, assigned_batch=self.batch_one,
        )
        enrollment = StudentCourseEnrollment.objects.create(
            student=self.student, course=self.course, enrolled_by=self.trainer_one_user,
        )
        for batch in (self.batch_one, self.batch_two):
            StudentBatchEnrollment.objects.create(
                student=self.student, batch=batch, course_enrollment=enrollment,
                assigned_by=self.trainer_one_user,
            )

    def test_student_sees_materials_from_every_active_batch(self):
        first = StudyMaterial.objects.create(
            batch=self.batch_one, uploaded_by=self.trainer_one, title='Morning notes', file='materials/morning.pdf',
        )
        second = StudyMaterial.objects.create(
            batch=self.batch_two, uploaded_by=self.trainer_two, title='Evening notes', file='materials/evening.pdf',
        )
        self.client.force_authenticate(user=self.student_user)

        response = self.client.get('/api/materials/')

        self.assertEqual(response.status_code, 200)
        material_ids = {item['id'] for item in response.json()['results']}
        self.assertSetEqual(material_ids, {first.id, second.id})

    def test_download_restores_a_missing_legacy_material_file(self):
        with tempfile.TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                material = StudyMaterial.objects.create(
                    batch=self.batch_one,
                    uploaded_by=self.trainer_one,
                    title='Legacy notes',
                    file=SimpleUploadedFile('legacy-notes.pdf', b'old file content'),
                )
                Path(material.file.path).unlink()
                restored_response = type('LegacyResponse', (), {
                    'raise_for_status': lambda self: None,
                    'iter_content': lambda self, chunk_size: [b'old file content'],
                })()
                self.client.force_authenticate(user=self.student_user)
                with patch('connect.api_views.requests.get', return_value=restored_response):
                    response = self.client.get(f'/api/materials/{material.id}/download/')
                    response_body = b''.join(response.streaming_content)
                    response.close()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response_body, b'old file content')

    def test_students_remain_single_device_but_staff_can_log_in_more_than_once(self):
        first_student_client = APIClient()
        second_student_client = APIClient()
        first = first_student_client.post('/api/auth/login/', {
            'username': self.student.email, 'password': 'pass123', 'user_type': 'student',
        }, format='json')
        second = second_student_client.post('/api/auth/login/', {
            'username': self.student.email, 'password': 'pass123', 'user_type': 'student',
        }, format='json')
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 409)

        first_staff_client = APIClient()
        second_staff_client = APIClient()
        first_staff = first_staff_client.post('/api/auth/login/', {
            'username': self.trainer_one_user.username, 'password': 'pass123', 'user_type': 'employee',
        }, format='json')
        second_staff = second_staff_client.post('/api/auth/login/', {
            'username': self.trainer_one_user.username, 'password': 'pass123', 'user_type': 'employee',
        }, format='json')
        self.assertEqual(first_staff.status_code, 200)
        self.assertEqual(second_staff.status_code, 200)

    def test_completion_propagates_to_parallel_course_batches_and_counts_once_per_batch(self):
        first_session = CourseSession.objects.create(
            batch=self.batch_one, session_number=1, title='Shared lesson', topics='Basics',
        )
        second_session = CourseSession.objects.create(
            batch=self.batch_two, session_number=1, title='Shared lesson', topics='Basics',
        )
        self.client.force_authenticate(user=self.trainer_one_user)

        response = self.client.post(f'/api/sessions/{first_session.id}/staff-complete/')

        self.assertEqual(response.status_code, 200)
        first_session.refresh_from_db()
        second_session.refresh_from_db()
        self.assertTrue(first_session.staff_completed)
        self.assertTrue(second_session.staff_completed)
        self.assertTrue(Student_Session_Progress.objects.get(student=self.student, session=first_session).staff_completed)
        self.assertTrue(Student_Session_Progress.objects.get(student=self.student, session=second_session).staff_completed)

        progress = BatchSessionProgress.objects.create(batch=self.batch_two, faculty=self.trainer_two)
        progress.update_progress()
        progress.refresh_from_db()
        self.assertEqual(progress.total_sessions, 1)
        self.assertEqual(progress.completed_sessions, 1)


class StaffWorkflowRegressionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.current_user = User.objects.create_user('current-trainer', password='pass123')
        self.previous_user = User.objects.create_user('previous-trainer', password='pass123')
        self.student_user = User.objects.create_user('workflow-student', password='pass123')
        self.current_staff = Employee.objects.create(
            user=self.current_user, staff_id='WORK001', email='current@example.com',
            first_name='Current', last_name='Trainer', mobile_no=9000000101,
            date_of_birth=date(1990, 1, 1), designation='mentor', branch='100ft',
            gender='Male', address='Coimbatore',
        )
        self.previous_staff = Employee.objects.create(
            user=self.previous_user, staff_id='WORK002', email='previous@example.com',
            first_name='Previous', last_name='Trainer', mobile_no=9000000102,
            date_of_birth=date(1991, 1, 1), designation='mentor', branch='100ft',
            gender='Female', address='Coimbatore',
        )
        self.course = Courses.objects.create(
            course_name='Workflow Course', course_type='software', duration='2 months', fee=1000,
        )
        self.batch = Batches.objects.create(
            batch_number='WORK-B1', course_type='software', course_name=self.course,
            faculty=self.current_staff, start_date=date(2026, 1, 1), end_date=date(2026, 3, 1),
            batch_timing='morning', branch='100ft',
        )
        self.student = Students.objects.create(
            student_id='WORK-STU-1', email='workflow@example.com', first_name='Workflow',
            last_name='Student', mobile_no='9000000103', date_of_birth=date(2001, 1, 1),
            city='Coimbatore', state='Tamil Nadu', qualification='UG', course='Workflow Course',
            gender='Female', branch='100ft', user=self.student_user,
            assigned_staff=self.current_staff, assigned_batch=self.batch,
        )

    def test_staff_batch_count_uses_trainer_session_records_only(self):
        session = CourseSession.objects.create(batch=self.batch, session_number=1, title='Session one')
        Student_Session_Progress.objects.create(
            student=self.student, session=session, staff_completed=True, student_status='pending',
        )
        self.client.force_authenticate(user=self.current_user)

        response = self.client.get(f'/api/batches/{self.batch.id}/staff-detail-report/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['summary']['staff_completed_sessions'], 0)
        self.assertEqual(response.data['summary']['student_completed_sessions'], 0)

        session.staff_completed = True
        session.completed_date = timezone.now()
        session.completed_by = self.current_staff
        session.save(update_fields=['staff_completed', 'completed_date', 'completed_by'])
        response = self.client.get(f'/api/batches/{self.batch.id}/staff-detail-report/')
        self.assertEqual(response.data['summary']['staff_completed_sessions'], 1)

    def test_support_and_leave_are_visible_only_to_current_trainer(self):
        StudentSupportRequest.objects.create(student=self.student_user, message='Need help')
        StudentLeaveApplication.objects.create(
            student=self.student, assigned_staff=self.previous_staff, leave_type='casual',
            start_date=date(2026, 2, 1), end_date=date(2026, 2, 1), number_of_days=1,
            reason='Test leave', contact_info='9000000103', status='pending',
        )

        self.client.force_authenticate(user=self.current_user)
        support_response = self.client.get('/api/employee/student-support/')
        leave_response = self.client.get('/api/staff/student-leave/')

        self.assertEqual(support_response.status_code, 200)
        self.assertEqual(len(support_response.data['results']), 1)
        self.assertEqual(leave_response.status_code, 200)
        self.assertEqual(leave_response.data['results'], [])

    def test_material_library_month_summary_includes_uploads_and_assignments(self):
        material = StudyMaterial.objects.create(
            title='Monthly material', file='materials/monthly.pdf', uploaded_by=self.current_staff,
            is_library=True,
        )
        StudyMaterialAssignment.objects.create(
            material=material, batch=self.batch, assigned_by=self.current_staff,
        )
        self.client.force_authenticate(user=self.current_user)
        current_month = timezone.localdate().strftime('%Y-%m')

        response = self.client.get(f'/api/material-library/?month={current_month}')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['summary']['month_upload_count'], 1)
        self.assertEqual(response.data['summary']['month_assignment_count'], 1)
        self.assertEqual(response.data['summary']['overall_upload_count'], 1)
        self.assertEqual(response.data['summary']['overall_assignment_count'], 1)
        self.assertTrue(response.data['results'][0]['assigned_batches'][0]['assigned_at'])

    def test_current_trainer_can_resolve_student_support_request(self):
        request = StudentSupportRequest.objects.create(student=self.student_user, message='Need help')
        self.client.force_authenticate(user=self.current_user)

        response = self.client.patch(f'/api/employee/student-support/{request.id}/resolve/')

        self.assertEqual(response.status_code, 200)
        request.refresh_from_db()
        self.assertEqual(request.status, 'resolved')

    def test_student_completion_does_not_auto_complete_trainer_session(self):
        session = CourseSession.objects.create(batch=self.batch, session_number=1, title='Completed legacy session')
        Student_Session_Progress.objects.create(
            student=self.student,
            session=session,
            staff_completed=False,
            completed=True,
            student_status='completed',
        )
        self.client.force_authenticate(user=self.student_user)

        response = self.client.get('/api/sessions/student/')

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['results'][0]['staff_completed'])
        self.assertEqual(response.data['results'][0]['student_status'], 'completed')

    def test_staff_completion_repairs_stale_student_session_state(self):
        session = CourseSession.objects.create(
            batch=self.batch,
            session_number=1,
            title='Trainer completed lesson',
            staff_completed=True,
            completed_date=timezone.now(),
            completed_by=self.current_staff,
        )
        Student_Session_Progress.objects.create(
            student=self.student,
            session=session,
            staff_completed=False,
            student_status='not_started',
        )
        StudentSessionStatus.objects.create(
            student=self.student,
            session=session,
            staff_completed=False,
            student_status='not_started',
        )
        self.client.force_authenticate(user=self.student_user)

        response = self.client.get('/api/sessions/student/')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['results'][0]['staff_completed'])
        self.assertEqual(response.data['results'][0]['student_status'], 'pending')
        self.assertTrue(Student_Session_Progress.objects.get(student=self.student, session=session).staff_completed)
        self.assertTrue(StudentSessionStatus.objects.get(student=self.student, session=session).staff_completed)

    def test_daily_completion_audit_repairs_legacy_student_waiting_state(self):
        """A legacy audit-only completion must not leave students waiting."""
        session = CourseSession.objects.create(
            batch=self.batch,
            session_number=1,
            title='Audit-only trainer completion',
            staff_completed=False,
        )
        Student_Session_Progress.objects.create(
            student=self.student,
            session=session,
            staff_completed=False,
            student_status='not_started',
        )
        StudentSessionStatus.objects.create(
            student=self.student,
            session=session,
            staff_completed=False,
            student_status='pending',
        )
        completed_at = timezone.now() - timedelta(days=1)
        DailySessionCompletion.objects.create(
            session=session,
            faculty=self.current_staff,
            completion_date=completed_at.date(),
            completed=True,
            completed_at=completed_at,
        )

        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/sessions/student/')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['results'][0]['staff_completed'])
        self.assertEqual(response.data['results'][0]['student_status'], 'pending')
        session.refresh_from_db()
        self.assertTrue(session.staff_completed)
        self.assertEqual(session.completed_by, self.current_staff)
        self.assertTrue(Student_Session_Progress.objects.get(student=self.student, session=session).staff_completed)
        self.assertTrue(StudentSessionStatus.objects.get(student=self.student, session=session).staff_completed)

    def test_batch_ending_reminder_is_created_once_from_ten_days_before_end(self):
        self.batch.end_date = timezone.localdate() + timedelta(days=10)
        self.batch.save(update_fields=['end_date'])

        first_sent = _send_batch_duration_notifications(
            self.batch, self.current_staff, self.current_user, timezone.localdate()
        )
        second_sent = _send_batch_duration_notifications(
            self.batch, self.current_staff, self.current_user, timezone.localdate()
        )

        self.assertEqual(first_sent, 1)
        self.assertEqual(second_sent, 0)
        self.assertEqual(SessionNotification.objects.filter(
            to_user=self.current_user,
            notification_type='batch_ending_soon',
        ).count(), 1)


class StudentCompletionReportTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.student_user = User.objects.create_user(username='report.student@example.com', password='pass123')
        self.other_user = User.objects.create_user(username='other.student@example.com', password='pass123')
        staff_user = User.objects.create_user(username='report.trainer@example.com', password='pass123')
        self.trainer = Employee.objects.create(
            user=staff_user, staff_id='RPT001', email='report.trainer@example.com',
            first_name='Report', last_name='Trainer', mobile_no='9000000001',
            date_of_birth=date(1990, 1, 1), designation='mentor', branch='100ft', gender='Male', address='Coimbatore',
        )
        course = Courses.objects.create(course_name='Report Course', course_type='software', duration='1 month', fee=1200)
        self.batch = Batches.objects.create(
            batch_number='RPT-BATCH', course_type='software', course_name=course, faculty=self.trainer,
            start_date=date(2026, 1, 1), end_date=date(2026, 2, 1), batch_timing='Morning', branch='100ft',
        )
        self.student = Students.objects.create(
            student_id='RPT-STU-1', email='report.student@example.com', first_name='Report', last_name='Student',
            mobile_no='9000000002', date_of_birth=date(2000, 1, 1), city='Coimbatore', state='Tamil Nadu',
            qualification='Graduate', course='Report Course', gender='Female', branch='100ft', user=self.student_user,
        )
        self.completed = CompletedStudent.objects.create(
            original_student_id=str(self.student.id), student_id=self.student.student_id, email=self.student.email,
            first_name=self.student.first_name, last_name=self.student.last_name, mobile_no=self.student.mobile_no,
            date_of_birth=self.student.date_of_birth, city=self.student.city, state=self.student.state,
            qualification=self.student.qualification, course='Report Course', gender=self.student.gender, branch='100ft',
            batch_number=self.batch.batch_number, batch_id=str(self.batch.id), batch_start_date=self.batch.start_date,
            batch_end_date=self.batch.end_date, faculty_name='Report Trainer', course_name='Report Course',
            completed_sessions_count=1, total_sessions_count=1, graduated_from_trainer=self.trainer,
        )
        self.session = CourseSession.objects.create(
            batch=self.batch, session_number=1, title='Report Session', staff_completed=True, completed_date=timezone.now(),
            completed_by=self.trainer,
        )
        Student_Session_Progress.objects.create(
            student=self.student, session=self.session, staff_completed=True, completed=True,
            student_status='completed', staff_completed_at=timezone.now(), student_confirmed_at=timezone.now(),
        )
        FeePayment.objects.create(student=self.student, batch=self.batch, total_fee=1200, amount_paid=700, balance=500)

    def test_student_can_only_access_own_detailed_completion_report(self):
        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/student/completion-report/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)
        report = response.data['results'][0]
        self.assertEqual(report['course_batch']['batch_id'], 'RPT-BATCH')
        self.assertEqual(report['sessions'][0]['title'], 'Report Session')
        self.assertTrue(report['sessions'][0]['trainer_completed'])
        self.assertTrue(report['sessions'][0]['student_completed'])
        self.assertEqual(report['fees']['pending_balance'], 500.0)

        pdf_response = self.client.get(f'/api/student/completion-report/download/?report_id={self.completed.id}')
        self.assertEqual(pdf_response.status_code, 200)
        self.assertEqual(pdf_response['Content-Type'], 'application/pdf')

        self.client.force_authenticate(user=self.other_user)
        other_response = self.client.get('/api/student/completion-report/')
        self.assertEqual(other_response.status_code, 403)

    def test_active_course_report_is_visible_but_has_no_pdf_download(self):
        active_course = Courses.objects.create(course_name='Active Course', course_type='software', duration='1 month', fee=900)
        active_batch = Batches.objects.create(
            batch_number='ACTIVE-RPT-BATCH', course_type='software', course_name=active_course, faculty=self.trainer,
            start_date=date(2026, 3, 1), end_date=date(2026, 4, 1), batch_timing='Morning', branch='100ft',
        )
        StudentBatchEnrollment.objects.create(student=self.student, batch=active_batch, is_active=True)
        CourseSession.objects.create(batch=active_batch, session_number=1, title='Active Session')

        self.client.force_authenticate(user=self.student_user)
        response = self.client.get('/api/student/completion-report/')

        self.assertEqual(response.status_code, 200)
        active_report = next(item for item in response.data['results'] if item['id'] == f'active-{active_batch.id}')
        self.assertFalse(active_report['is_completed'])
        self.assertEqual(active_report['course_batch']['course_name'], 'Active Course')

    def test_technical_test_accepts_answer_file_submission(self):
        StudentBatchEnrollment.objects.create(student=self.student, batch=self.batch, is_active=True)
        test = QuizTest.objects.create(
            title='Technical File Submission', test_type='technical', creation_method='manual',
            course=self.batch.course_name, created_by=self.trainer,
        )
        AssignedTest.objects.create(test=test, batch=self.batch)
        self.client.force_authenticate(user=self.student_user)
        answer = SimpleUploadedFile('answer.py', b'print("done")', content_type='text/x-python')
        response = self.client.post(f'/api/tests/{test.id}/take/', {'submission_file': answer}, format='multipart')

        self.assertEqual(response.status_code, 201)
        self.assertTrue(TestResult.objects.filter(student=self.student, test=test, submission_file__isnull=False).exists())
