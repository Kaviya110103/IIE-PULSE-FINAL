from django.contrib.auth.models import User
from rest_framework import serializers
import re
from .models import (
    Courses, Employee, Batches, Students, BatchTrainerAssignment, StudentCourseEnrollment, StudentBatchEnrollment,
    StudentAttendance, StudyMaterial, StudyMaterialAssignment, QuizTest, Question, AssignedTest,
    StaffLeaveRequest, StudentLeaveApplication, SupportRequest, StudentSupportRequest,
    CourseSession, SessionCompletion, DailySessionCompletion,
    SessionNotification, StudentSessionStatus, Student_Session_Progress,
    DoubtResponse, Announcement, AnnouncementView, CounselorLeaveRequest,
    CounselorSupportRequest, Quiz, QuizQuestion, QuizAttempt, QuizAnswer,
    CompletedStudent, SessionCompletionRequest, TrainerSessionReport, TestResult,
    GalleryItem, VlogItem, NewsItem, CalendarEvent, Referral, CounselorAnnouncement,
    ReassignedStudentRecord, ChallengeQuestionPool, StudentChallenge,
    StudentChallengeAchievement, StudentChallengeDay, StudentChallengeDayQuestion
)
from .student_counts import active_students_for_batch
from .services.challenge_service import QUESTIONS_PER_DAY, get_available_questions, get_student_session_counts


def strip_unsupported_mysql_chars(value):
    """Remove 4-byte unicode chars such as emojis for older MySQL utf8 columns."""
    return ''.join(ch for ch in str(value or '') if ord(ch) <= 0xFFFF)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Courses
        fields = '__all__'

    def validate(self, attrs):
        duration = attrs.get('duration')
        if duration is None and self.instance is not None:
            duration = self.instance.duration
        if not str(duration or '').strip():
            raise serializers.ValidationError({'duration': 'Course duration is required. Use a value like 2 months or 20 days.'})
        return attrs

    def validate_duration(self, value):
        value = str(value or '').strip().lower()
        if not value:
            raise serializers.ValidationError('Course duration is required. Use a value like 2 months or 20 days.')
        if not re.fullmatch(r'[1-9]\d*\s*(day|days|month|months)', value):
            raise serializers.ValidationError('Enter a valid duration like 2 months or 20 days.')
        return value


class GalleryItemSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)

    class Meta:
        model = GalleryItem
        fields = '__all__'
        read_only_fields = ['uploaded_by', 'created_at']


class VlogItemSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)

    class Meta:
        model = VlogItem
        fields = '__all__'
        read_only_fields = ['uploaded_by', 'created_at']


class NewsItemSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    publishedDate = serializers.DateTimeField(source='published_at', read_only=True)
    originalUrl = serializers.URLField(source='original_url', read_only=True)
    imageUrl = serializers.URLField(source='image_url', read_only=True)
    newsType = serializers.CharField(source='news_type', read_only=True)

    class Meta:
        model = NewsItem
        fields = '__all__'
        read_only_fields = ['uploaded_by', 'created_at']


class CalendarEventSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)

    class Meta:
        model = CalendarEvent
        fields = '__all__'
        read_only_fields = ['uploaded_by', 'created_at']

    def validate_event_name(self, value):
        value = strip_unsupported_mysql_chars(value).strip()
        if len(value) < 2:
            raise serializers.ValidationError('Event name must be at least 2 characters.')
        return value

    def validate_message(self, value):
        value = strip_unsupported_mysql_chars(value).strip()
        if len(value) < 2:
            raise serializers.ValidationError('Message must be at least 2 characters.')
        return value


class ReferralSerializer(serializers.ModelSerializer):
    class Meta:
        model = Referral
        fields = '__all__'
        read_only_fields = ['created_at']

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError('Name must be at least 2 characters.')
        return value

    def validate_mobile(self, value):
        cleaned = ''.join(ch for ch in value if ch.isdigit())
        if len(cleaned) < 10 or len(cleaned) > 15:
            raise serializers.ValidationError('Enter a valid mobile number.')
        return cleaned


class EmployeeSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Employee
        fields = '__all__'
        extra_kwargs = {
            'address': {'allow_blank': True, 'required': False},
            'last_name': {'allow_blank': True, 'required': False},
            'gender': {'allow_blank': True, 'required': False},
        }

    def validate_branch(self, value):
        if value == 'kunniyamuthur':
            return 'kuniyamuthur'
        return value


# connect/serializers.py
# connect/serializers.py
from .models import Batches, Courses

class BatchSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    course_name_display = serializers.SerializerMethodField()
    faculty_name = serializers.SerializerMethodField()
    trainer_ids = serializers.SerializerMethodField()
    trainer_names = serializers.SerializerMethodField()
    trainers = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()
    course_fee = serializers.SerializerMethodField()   # ← ADD THIS
    course_logsheet_url = serializers.SerializerMethodField()
    class Meta:
        model = Batches
        fields = '__all__'

    def get_display_name(self, obj):
        return obj.batch_code or obj.batch_number

    def get_course_name_display(self, obj):
        try:
            if obj.course_name:
                if hasattr(obj.course_name, 'title'):
                    return obj.course_name.title
                elif hasattr(obj.course_name, 'name'):
                    return obj.course_name.name
                elif hasattr(obj.course_name, 'course_name'):
                    return obj.course_name.course_name
                else:
                    return str(obj.course_name)
            elif hasattr(obj, 'course') and obj.course:
                if hasattr(obj.course, 'title'):
                    return obj.course.title
                elif hasattr(obj.course, 'name'):
                    return obj.course.name
                else:
                    return str(obj.course)
        except Exception as e:
            print(f"Error getting course name: {e}")
        return '—'

    def get_faculty_name(self, obj):
        names = self.get_trainer_names(obj)
        if names:
            return ', '.join(names)
        if obj.faculty:
            return f"{obj.faculty.first_name} {obj.faculty.last_name or ''}".strip()
        return '—'

    def _trainer_assignments(self, obj):
        try:
            return list(obj.trainer_assignments.select_related('trainer').order_by('-is_primary', 'trainer__first_name'))
        except Exception:
            return []

    def get_trainer_ids(self, obj):
        ids = [assignment.trainer_id for assignment in self._trainer_assignments(obj)]
        if not ids and obj.faculty_id:
            ids = [obj.faculty_id]
        return ids

    def get_trainer_names(self, obj):
        names = []
        for assignment in self._trainer_assignments(obj):
            trainer = assignment.trainer
            names.append(f"{trainer.first_name} {trainer.last_name or ''}".strip())
        if not names and obj.faculty:
            names.append(f"{obj.faculty.first_name} {obj.faculty.last_name or ''}".strip())
        return names

    def get_trainers(self, obj):
        trainers = []
        for assignment in self._trainer_assignments(obj):
            trainer = assignment.trainer
            trainers.append({
                'id': trainer.id,
                'name': f"{trainer.first_name} {trainer.last_name or ''}".strip(),
                'designation': trainer.designation,
                'branch': trainer.branch,
                'batch_timing': assignment.batch_timing or obj.batch_timing,
                'is_primary': assignment.is_primary,
            })
        if not trainers and obj.faculty:
            trainers.append({
                'id': obj.faculty.id,
                'name': f"{obj.faculty.first_name} {obj.faculty.last_name or ''}".strip(),
                'designation': obj.faculty.designation,
                'branch': obj.faculty.branch,
                'batch_timing': obj.batch_timing,
                'is_primary': True,
            })
        return trainers

    def get_student_count(self, obj):
        count_map = self.context.get('student_count_map') if self.context else None
        if count_map is not None:
            return count_map.get(obj.id, 0)
        return active_students_for_batch(obj).count()

    def get_course_fee(self, obj):   # ← ADD THIS
        try:
            if obj.course_name and hasattr(obj.course_name, 'fee') and obj.course_name.fee:
                return obj.course_name.fee
        except Exception:
            pass
        return None
    def get_course_logsheet_url(self, obj):
        request = self.context.get('request')

        logsheet = None

        if obj.course_name and obj.course_name.course_logsheet:
            logsheet = obj.course_name.course_logsheet
        elif obj.course_logsheet:
            logsheet = obj.course_logsheet

        if logsheet:
            url = logsheet.url
            return request.build_absolute_uri(url) if request else url

        return None

class StudentSerializer(serializers.ModelSerializer):
    assigned_staff_name = serializers.SerializerMethodField()
    assigned_batch_number = serializers.CharField(source='assigned_batch.batch_number', read_only=True)
    assigned_batch_code = serializers.CharField(source='assigned_batch.batch_code', read_only=True)
    assigned_batches = serializers.SerializerMethodField()
    enrolled_courses = serializers.SerializerMethodField()
    course_ids = serializers.SerializerMethodField()
    course_names = serializers.SerializerMethodField()

    class Meta:
        model = Students
        fields = '__all__'

    def get_assigned_staff_name(self, obj):
        if obj.assigned_staff:
            return f"{obj.assigned_staff.first_name} {obj.assigned_staff.last_name or ''}"
        return None

    def _active_course_enrollments(self, obj):
        return obj.course_enrollments.filter(is_active=True).select_related('course').order_by('course__course_name')

    def _batch_summary(self, batch):
        if not self.context.get('lightweight_student_list'):
            return BatchSerializer(batch, context=self.context).data

        assignments = list(getattr(batch, '_prefetched_objects_cache', {}).get('trainer_assignments', []))
        trainers = []
        for assignment in assignments:
            trainer = assignment.trainer
            trainers.append({
                'id': trainer.id,
                'name': f"{trainer.first_name} {trainer.last_name or ''}".strip(),
                'batch_timing': assignment.batch_timing or batch.batch_timing,
                'is_primary': assignment.is_primary,
            })
        if not trainers and batch.faculty:
            trainers.append({
                'id': batch.faculty.id,
                'name': f"{batch.faculty.first_name} {batch.faculty.last_name or ''}".strip(),
                'batch_timing': batch.batch_timing,
                'is_primary': True,
            })
        return {
            'id': batch.id,
            'batch_number': batch.batch_number,
            'batch_code': batch.batch_code,
            'display_name': batch.batch_code or batch.batch_number,
            'batch_timing': batch.batch_timing,
            'course_name': batch.course_name_id,
            'course_name_display': batch.course_name.course_name if batch.course_name else '',
            'trainer_ids': [trainer['id'] for trainer in trainers],
            'trainer_names': [trainer['name'] for trainer in trainers],
            'trainers': trainers,
        }

    def get_enrolled_courses(self, obj):
        cache_name = '_cached_enrolled_courses_light' if self.context.get('lightweight_student_list') else '_cached_enrolled_courses_full'
        if hasattr(obj, cache_name):
            return getattr(obj, cache_name)
        enrollments = []
        for enrollment in self._active_course_enrollments(obj):
            course = enrollment.course
            batches = []
            for batch_enrollment in enrollment.batch_assignments.filter(is_active=True).select_related('batch', 'batch__course_name'):
                batches.append(self._batch_summary(batch_enrollment.batch))
            enrollments.append({
                'enrollment_id': enrollment.id,
                'course_id': course.id,
                'course_name': course.course_name,
                'course_type': course.course_type,
                'duration': course.duration,
                'fee': course.fee,
                'batches': batches,
            })
        setattr(obj, cache_name, enrollments)
        return enrollments

    def get_course_ids(self, obj):
        return [item['course_id'] for item in self.get_enrolled_courses(obj)]

    def get_course_names(self, obj):
        names = [item['course_name'] for item in self.get_enrolled_courses(obj)]
        if not names and obj.course:
            names = [part.strip() for part in str(obj.course).split(',') if part.strip()]
        return names

    def get_assigned_batches(self, obj):
        batches = []
        seen = set()
        enrollments = obj.batch_enrollments.filter(is_active=True).select_related('batch', 'batch__course_name').order_by('-assigned_at')
        for enrollment in enrollments:
            batch = enrollment.batch
            seen.add(batch.id)
            batches.append(self._batch_summary(batch))
        if obj.assigned_batch and obj.assigned_batch_id not in seen:
            batches.append(self._batch_summary(obj.assigned_batch))
        return batches

class AttendanceSerializer(serializers.ModelSerializer):
    batch_number = serializers.SerializerMethodField()
    batch_code = serializers.SerializerMethodField()
    marked_by = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()
    student_id_display = serializers.SerializerMethodField()
    session_number = serializers.SerializerMethodField()
    session_title = serializers.SerializerMethodField()
    completed_session_count = serializers.SerializerMethodField()

    class Meta:
        model = StudentAttendance
        fields = '__all__'

    def get_batch_number(self, obj):
        return obj.batch.batch_number if obj.batch else '—'

    def get_batch_code(self, obj):
        if obj.batch and obj.batch.batch_code:
            return obj.batch.batch_code
        return obj.batch.batch_number if obj.batch else None

    def get_marked_by(self, obj):
        if obj.staff:
            return f"{obj.staff.first_name} {obj.staff.last_name or ''}".strip()
        return '—'

    def get_student_name(self, obj):
        if obj.student:
            return f"{obj.student.first_name} {obj.student.last_name or ''}".strip()
        return '—'

    def get_student_id_display(self, obj):
        return obj.student.student_id if obj.student else '—'

    def get_session_number(self, obj):
        return obj.session.session_number if obj.session else None

    def get_session_title(self, obj):
        return obj.session.title if obj.session else ''

    def get_completed_session_count(self, obj):
        if not obj.batch_id or not obj.staff_id or not obj.date:
            return 0
        return CourseSession.objects.filter(
            batch_id=obj.batch_id,
            completed_by_id=obj.staff_id,
            completed_date__date=obj.date,
            staff_completed=True,
        ).count()

class StudyMaterialSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    uploaded_by_trainer_status = serializers.SerializerMethodField()
    batch_number = serializers.SerializerMethodField()
    batch_code = serializers.SerializerMethodField()
    assigned_batches = serializers.SerializerMethodField()
    file = serializers.FileField(required=False, allow_null=True)

    class Meta:
        model = StudyMaterial
        fields = '__all__'
        extra_kwargs = {
            'uploaded_by': {'read_only': True},
        }

    def get_uploaded_by_name(self, obj):
        return f"{obj.uploaded_by.first_name} {obj.uploaded_by.last_name or ''}"

    def get_uploaded_by_trainer_status(self, obj):
        batches = []
        if obj.batch:
            batches.append(obj.batch)
        batches.extend([assignment.batch for assignment in obj.assignments.all()])
        if any(
            ReassignedStudentRecord.objects.filter(
                source_batch=batch,
                previous_trainer=obj.uploaded_by,
            ).exists()
            for batch in batches
        ):
            return 'Previous Trainer'
        return 'Current Trainer'

    def get_assigned_batches(self, obj):
        batches = []
        seen = set()

        def add_batch(batch):
            if batch and batch.id not in seen:
                seen.add(batch.id)
                batches.append({
                    'id': batch.id,
                    'batch_number': batch.batch_number,
                    'batch_code': batch.batch_code,
                    'display_name': batch.batch_code or batch.batch_number,
                    'branch': batch.branch,
                    'course_name': getattr(batch.course_name, 'course_name', None) if batch.course_name else None,
                })

        add_batch(getattr(obj, 'batch', None))
        for assignment in getattr(obj, 'assignments', []).all():
            add_batch(assignment.batch)
        return batches

    def get_batch_number(self, obj):
        batches = self.get_assigned_batches(obj)
        return ', '.join(batch['batch_number'] for batch in batches) if batches else None

    def get_batch_code(self, obj):
        batches = self.get_assigned_batches(obj)
        return ', '.join(batch.get('display_name') or batch.get('batch_number') for batch in batches) if batches else None


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = '__all__'


class TestSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    course_name = serializers.CharField(source='course.course_name', read_only=True)
    question_paper_url = serializers.SerializerMethodField()
    
    class Meta:
        model = QuizTest
        fields = [
            'id', 'title', 'description', 'test_type', 'creation_method',
            'course', 'course_name', 'test_date', 'start_time',
            'duration_minutes', 'instructions', 'question_paper',
            'question_paper_url', 'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['created_by', 'created_at']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name or ''}"
        return None

    def get_question_paper_url(self, obj):
        request = self.context.get('request')
        if not obj.question_paper:
            return None
        url = obj.question_paper.url
        return request.build_absolute_uri(url) if request else url

class AssignedTestSerializer(serializers.ModelSerializer):
    test_name = serializers.CharField(source='test.title', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)
    batch_code = serializers.CharField(source='batch.batch_code', read_only=True)

    class Meta:
        model = AssignedTest
        fields = '__all__'


class ChallengeQuestionSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()
    source_session_number = serializers.IntegerField(source='question.source_session.session_number', read_only=True)
    source_session_title = serializers.CharField(source='question.source_session.title', read_only=True)

    class Meta:
        model = StudentChallengeDayQuestion
        fields = [
            'id', 'question_order', 'question', 'source_session_number',
            'source_session_title', 'question_text', 'options',
        ]

    question_text = serializers.CharField(source='question.question_text', read_only=True)

    def get_options(self, obj):
        question = obj.question
        return [
            {'key': 'A', 'text': question.option_a},
            {'key': 'B', 'text': question.option_b},
            {'key': 'C', 'text': question.option_c},
            {'key': 'D', 'text': question.option_d},
        ]


class StudentChallengeSummarySerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.course_name', read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)
    batch_code = serializers.CharField(source='batch.batch_code', read_only=True)
    progress_percentage = serializers.SerializerMethodField()
    completed_sessions = serializers.SerializerMethodField()
    total_sessions = serializers.SerializerMethodField()
    current_day = serializers.SerializerMethodField()
    next_day = serializers.SerializerMethodField()
    today_available = serializers.SerializerMethodField()
    review_only = serializers.SerializerMethodField()
    achievement = serializers.SerializerMethodField()
    completion_date = serializers.SerializerMethodField()
    calendar_days_taken = serializers.SerializerMethodField()
    final_score_percentage = serializers.SerializerMethodField()
    quick_completion = serializers.SerializerMethodField()

    class Meta:
        model = StudentChallenge
        fields = [
            'id', 'course', 'course_name', 'batch', 'batch_number',
            'batch_code', 'start_date', 'status', 'current_streak',
            'longest_streak', 'completed_days', 'total_score',
            'total_questions', 'progress_percentage',
            'completed_sessions', 'total_sessions',
            'current_day', 'next_day', 'today_available', 'review_only',
            'achievement', 'completion_date', 'calendar_days_taken',
            'final_score_percentage', 'quick_completion',
        ]

    def get_progress_percentage(self, obj):
        return round((obj.completed_days / 15) * 100, 2) if obj.completed_days else 0

    def _session_counts(self, obj):
        if not hasattr(obj, '_student_challenge_session_counts'):
            obj._student_challenge_session_counts = get_student_session_counts(
                obj.student,
                obj.course,
                obj.batch,
            )
        return obj._student_challenge_session_counts

    def get_completed_sessions(self, obj):
        return self._session_counts(obj)['completed_sessions']

    def get_total_sessions(self, obj):
        return self._session_counts(obj)['total_sessions']

    def _latest_day(self, obj):
        if not obj.pk:
            return None
        if not hasattr(obj, '_student_challenge_latest_day'):
            obj._student_challenge_latest_day = obj.days.order_by('-day_number').first()
        return obj._student_challenge_latest_day

    def _unused_available_count(self, obj):
        if not hasattr(obj, '_student_challenge_unused_available_count'):
            used_ids = []
            if obj.pk:
                used_ids = StudentChallengeDayQuestion.objects.filter(
                    challenge_day__challenge=obj,
                ).values_list('question_id', flat=True)
            obj._student_challenge_unused_available_count = get_available_questions(
                obj.student,
                obj.course,
                obj.batch,
            ).exclude(id__in=used_ids).count()
        return obj._student_challenge_unused_available_count

    def get_current_day(self, obj):
        latest_day = self._latest_day(obj)
        return latest_day.day_number if latest_day else None

    def get_next_day(self, obj):
        latest_day = self._latest_day(obj)
        if obj.status == 'completed':
            return None
        if not latest_day:
            return 1
        if latest_day.status != 'completed':
            return latest_day.day_number
        next_day = latest_day.day_number + 1
        return next_day if next_day <= 15 else None

    def get_today_available(self, obj):
        latest_day = self._latest_day(obj)
        if obj.status == 'completed':
            return False
        if latest_day and latest_day.status != 'completed':
            return True
        return self._unused_available_count(obj) >= QUESTIONS_PER_DAY

    def get_review_only(self, obj):
        latest_day = self._latest_day(obj)
        return bool(
            latest_day and
            latest_day.status == 'completed' and
            not self.get_today_available(obj)
        )

    def _achievement(self, obj):
        if not obj.pk:
            return None
        if not hasattr(obj, '_student_challenge_achievement'):
            obj._student_challenge_achievement = StudentChallengeAchievement.objects.filter(
                challenge=obj,
            ).first()
        return obj._student_challenge_achievement

    def get_achievement(self, obj):
        achievement = self._achievement(obj)
        if not achievement:
            return None
        return {
            'id': achievement.id,
            'badge_code': achievement.badge_code,
            'badge_title': achievement.badge_title,
            'completed_days': achievement.completed_days,
            'final_score_percentage': float(achievement.final_score_percentage),
            'calendar_days_taken': achievement.calendar_days_taken,
            'completed_at': achievement.completed_at,
        }

    def get_completion_date(self, obj):
        achievement = self._achievement(obj)
        if achievement:
            return achievement.completed_at
        latest_day = self._latest_day(obj)
        if obj.status == 'completed' and latest_day:
            return latest_day.completed_at
        return None

    def get_calendar_days_taken(self, obj):
        achievement = self._achievement(obj)
        if achievement:
            return achievement.calendar_days_taken
        completion_date = self.get_completion_date(obj)
        if not obj.start_date or not completion_date:
            return None
        return max((completion_date.date() - obj.start_date).days + 1, 1)

    def get_final_score_percentage(self, obj):
        achievement = self._achievement(obj)
        if achievement:
            return float(achievement.final_score_percentage)
        if not obj.total_questions:
            return 0
        return round((obj.total_score / obj.total_questions) * 100, 2)

    def get_quick_completion(self, obj):
        days_taken = self.get_calendar_days_taken(obj)
        return bool(obj.status == 'completed' and days_taken and days_taken < 15)


class StudentChallengeDaySerializer(serializers.ModelSerializer):
    questions = ChallengeQuestionSerializer(source='day_questions', many=True, read_only=True)

    class Meta:
        model = StudentChallengeDay
        fields = [
            'id', 'day_number', 'challenge_date', 'status', 'score',
            'total_questions', 'started_at', 'completed_at', 'questions',
        ]


class StudentChallengeHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentChallengeDay
        fields = [
            'id', 'day_number', 'challenge_date', 'status', 'score',
            'total_questions', 'started_at', 'completed_at',
        ]


class StudentChallengeSubmitSerializer(serializers.Serializer):
    answers = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False,
    )

    def validate_answers(self, value):
        for answer in value:
            if 'question_id' not in answer:
                raise serializers.ValidationError('question_id is required for every answer.')
            if 'selected_answer' not in answer:
                raise serializers.ValidationError('selected_answer is required for every answer.')
            selected = str(answer.get('selected_answer') or '').upper()
            if selected not in ['A', 'B', 'C', 'D', '']:
                raise serializers.ValidationError('selected_answer must be A, B, C, or D.')
        return value


class StaffLeaveRequestSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffLeaveRequest
        fields = '__all__'
        extra_kwargs = {
            'staff': {'read_only': True},
        }

    def get_staff_name(self, obj):
        return f"{obj.staff.first_name} {obj.staff.last_name or ''}"


class StudentLeaveApplicationSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_id = serializers.SerializerMethodField()
    
    class Meta:
        model = StudentLeaveApplication
        fields = ['id', 'student', 'student_name', 'student_id', 'assigned_staff', 
                  'leave_type', 'start_date', 'end_date', 'number_of_days', 
                  'reason', 'contact_info', 'status', 'applied_at', 'processed_at', 
                  'staff_remarks']
    
    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name or ''}".strip()
    
    def get_student_id(self, obj):
        return obj.student.student_id

class SupportRequestSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()

    class Meta:
        model = SupportRequest
        fields = '__all__'
        extra_kwargs = {
            'staff': {'read_only': True},
        }

    def get_staff_name(self, obj):
        try:
            return obj.staff.username
        except Exception:
            return ''


class StudentSupportRequestSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = StudentSupportRequest
        fields = '__all__'
        extra_kwargs = {
            'student': {'read_only': True},
        }

    def get_student_name(self, obj):
        try:
            return obj.student.username
        except Exception:
            return ''


class CourseSessionSerializer(serializers.ModelSerializer):
    completed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CourseSession
        fields = '__all__'

    def get_completed_by_name(self, obj):
        if obj.completed_by:
            return f"{obj.completed_by.first_name} {obj.completed_by.last_name or ''}".strip()
        return None


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Announcement
        fields = '__all__'
        extra_kwargs = {
            'created_by': {'read_only': True},
        }


class CounselorLeaveRequestSerializer(serializers.ModelSerializer):
    counselor_name = serializers.SerializerMethodField()

    class Meta:
        model = CounselorLeaveRequest
        fields = '__all__'
        extra_kwargs = {
            'counselor': {'read_only': True},
        }

    def get_counselor_name(self, obj):
        return f"{obj.counselor.first_name} {obj.counselor.last_name or ''}"


class CounselorSupportRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = CounselorSupportRequest
        fields = '__all__'
        extra_kwargs = {
            'counselor': {'read_only': True},
        }


class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = '__all__'


class QuizSerializer(serializers.ModelSerializer):
    questions = QuizQuestionSerializer(many=True, read_only=True)
    batch_number = serializers.CharField(source='batch.batch_number', read_only=True)
    batch_code = serializers.CharField(source='batch.batch_code', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    created_by_trainer_status = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = '__all__'
        extra_kwargs = {
            'created_by': {'read_only': True},
        }

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name or ''}"
        return None

    def get_created_by_trainer_status(self, obj):
        if obj.batch and obj.created_by and ReassignedStudentRecord.objects.filter(
            source_batch=obj.batch,
            previous_trainer=obj.created_by,
        ).exists():
            return 'Previous Trainer'
        return 'Current Trainer'


class QuizAttemptSerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = QuizAttempt
        fields = '__all__'

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name or ''}"


class QuizAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizAnswer
        fields = '__all__'


class CompletedStudentSerializer(serializers.ModelSerializer):
    original_student_db_id = serializers.SerializerMethodField()

    class Meta:
        model = CompletedStudent
        fields = '__all__'

    def get_original_student_db_id(self, obj):
        if hasattr(obj, '_original_student_db_id'):
            return obj._original_student_db_id
        original_id = str(obj.original_student_id or '').strip()
        if original_id.isdigit():
            return int(original_id)
        student = Students.objects.filter(student_id=original_id).only('id').first()
        return student.id if student else None


class SessionCompletionRequestSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    trainer_name = serializers.SerializerMethodField()

    class Meta:
        model = SessionCompletionRequest
        fields = '__all__'

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name or ''}"

    def get_trainer_name(self, obj):
        return f"{obj.trainer.first_name} {obj.trainer.last_name or ''}"


class TestResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestResult
        fields = '__all__'


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    user_type = serializers.ChoiceField(choices=['admin', 'employee', 'student'])


 
class CounselorAnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    specific_batch_name = serializers.SerializerMethodField()
    specific_student_names = serializers.SerializerMethodField()
    specific_batch_details = serializers.SerializerMethodField()
    branch = serializers.CharField(read_only=True)

    class Meta:
        model = CounselorAnnouncement
        fields = '__all__'
        read_only_fields = ['created_by', 'branch']
        extra_kwargs = {
            'created_by': {'read_only': True},
        }
    def create(self, validated_data):
        return super().create(validated_data)

    def get_specific_batch_name(self, obj):
        try:
            sb = getattr(obj, 'specific_batch', None)
            return sb.batch_number if sb else None
        except Exception:
            return None

    def get_specific_batch_details(self, obj):
        try:
            sb = getattr(obj, 'specific_batch', None)
            if sb:
                return {
                    'id': sb.id,
                    'batch_number': sb.batch_number,
                    'course_name': getattr(sb.course_name, 'course_name', None) if sb.course_name else None,
                    'batch_timing': sb.batch_timing,
                    'trainer_name': f"{sb.faculty.first_name} {sb.faculty.last_name or ''}".strip() if sb.faculty else None,
                }
        except Exception:
            pass
        return None

    def get_specific_student_names(self, obj):
        try:
            students = getattr(obj, 'specific_students', None)
            if students is None:
                return []
            return [
                {'id': s.id, 'name': f'{s.first_name} {s.last_name}', 'student_id': s.student_id}
                for s in students.all()
            ]
        except Exception:
            return []

    def get_branch(self, obj):
        # Announcement model does not have a branch column in some DB imports.
        # Fallback to the creator's Employee.branch if available.
        try:
            br = getattr(obj, 'branch', None)
            if br:
                return br
            creator = getattr(obj, 'created_by', None)
            if creator:
                emp = Employee.objects.filter(user=creator).first()
                if emp and getattr(emp, 'branch', None):
                    return emp.branch
        except Exception:
            pass
        return None
