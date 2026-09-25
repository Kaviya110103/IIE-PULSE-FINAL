
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator , MaxValueValidator
from django.utils import timezone
from datetime import date

from django.core.validators import FileExtensionValidator


class Courses(models.Model):
    course_name = models.CharField(max_length=255, unique=True)
    course_type = models.CharField(max_length=100, blank=True, null=True)
    duration = models.CharField(max_length=50, blank=True, null=True)
    fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    course_logsheet = models.FileField (
            upload_to = 'course_logsheets/' ,
            validators = [ FileExtensionValidator ( allowed_extensions = [ 'pdf' ] ) ]
    )
    created_at = models.DateTimeField ( auto_now_add = True )
    updated_at = models.DateTimeField ( auto_now = True )
    
    def __str__ ( self ) :
        return self.course_name
    
    class Meta :
        verbose_name_plural = "Courses"


# In models.py, update the Employee model:

class Employee ( models.Model ) :
    DESIGNATION_CHOICES = [
            ('counselor' , 'Counselor') ,
            ('trainer' , 'Trainer') ,
            ('mentor' , 'Mentor') ,
            ('hr' , 'HR') ,
            ('admin_staff' , 'Admin Staff') ,
    ]
    
    BRANCH_CHOICES = [
            ('100ft' , '100ft Road') ,
            ('hopes' , 'Hopes College') ,
            ('kuniyamuthur' , 'Kuniyamuthur') ,
            ('other' , 'Other Branch') ,
    ]
    
    user = models.OneToOneField ( User , on_delete = models.CASCADE )
    staff_id = models.CharField ( max_length = 255 , unique = True )
    email = models.EmailField ( unique = True )
    first_name = models.CharField ( max_length = 20 )
    last_name = models.CharField(max_length=100, blank=True, null=True)  # Increased and made optional
    mobile_no = models.BigIntegerField ( )
    date_of_birth = models.DateField ( )
    photo = models.ImageField ( upload_to = 'employee_photos/' , blank = True , null = True )
    id_proof = models.FileField ( upload_to = 'employee_ids/' , blank = True , null = True )
    designation = models.CharField ( max_length = 50 , choices = DESIGNATION_CHOICES )
    branch = models.CharField ( max_length = 50 , choices = BRANCH_CHOICES )
    gender = models.CharField ( max_length = 20 )
    address = models.CharField ( max_length = 200 )
    created_at = models.DateTimeField ( auto_now_add = True )
    
    def __str__ ( self ) :
        return f"{self.first_name} {self.last_name}"
    
    def is_counselor ( self ) :
        return self.designation.lower ( ) == 'counselor'
    
    def is_trainer ( self ) :
        return self.designation.lower ( ) in [ 'trainer' , 'mentor' ]
    
    class Meta :
        db_table = 'employee'
        verbose_name = 'Employee'
        verbose_name_plural = 'Employees'


class Batches ( models.Model ) :
    BATCH_TIMING_CHOICES = [
            ('morning' , 'Morning (10:00 AM - 12:00 PM)') ,
            ('afternoon' , 'Afternoon (12:00 PM - 2:00 PM)') ,
            ('evening' , 'Evening (3:00 PM - 5:00 PM)') ,
            ('weekend' , 'Weekend (5:00 AM - 7:00 PM)') ,
    ]
    
    batch_number = models.CharField ( max_length = 50 , unique = True )
    batch_code = models.CharField ( max_length = 120 , unique = True , blank = True , null = True )
    course_type = models.CharField ( max_length = 50 )
    course_name = models.ForeignKey ( Courses , on_delete = models.CASCADE )
    faculty = models.ForeignKey ( Employee , on_delete = models.CASCADE )
    start_date = models.DateField ( )
    end_date = models.DateField ( )
    batch_timing = models.CharField ( max_length = 50 , choices = BATCH_TIMING_CHOICES )
    branch = models.CharField ( max_length = 200 )
    # ADD THIS FIELD to store the logsheet
    course_logsheet = models.FileField ( upload_to = 'batch_logsheets/' , blank = True , null = True )
    created_at = models.DateTimeField ( auto_now_add = True )
    
    class Meta :
        db_table = 'batches'
    
    def __str__ ( self ) :
        return self.batch_number
    
    def save ( self , *args , **kwargs ) :
        # Auto-copy logsheet from course if not provided
        if not self.course_logsheet and self.course_name.course_logsheet :
            import os
            from django.core.files.base import ContentFile
            
            original_file = self.course_name.course_logsheet
            if original_file and original_file.storage.exists(original_file.name) :
                filename = os.path.basename ( original_file.name )
                original_file.open('rb')
                try:
                    self.course_logsheet.save ( filename , ContentFile(original_file.read()) , save = False )
                finally:
                    original_file.close()
        
        super ( ).save ( *args , **kwargs )


class BatchTrainerAssignment ( models.Model ) :
    batch = models.ForeignKey (
            Batches ,
            on_delete = models.CASCADE ,
            related_name = 'trainer_assignments'
    )
    trainer = models.ForeignKey (
            Employee ,
            on_delete = models.CASCADE ,
            related_name = 'batch_trainer_assignments'
    )
    batch_timing = models.CharField ( max_length = 50 , blank = True , null = True )
    is_primary = models.BooleanField ( default = False )
    assigned_at = models.DateTimeField ( auto_now_add = True )

    class Meta :
        db_table = 'batch_trainer_assignments'
        unique_together = [ 'batch' , 'trainer' ]
        indexes = [
                models.Index ( fields = [ 'batch' , 'trainer' ] ) ,
                models.Index ( fields = [ 'trainer' ] ) ,
        ]

    def __str__ ( self ) :
        return f"{self.batch.batch_number} - {self.trainer.first_name}"
        
        
class Students ( models.Model ) :
    student_id = models.CharField ( max_length = 20 , unique = True )
    email = models.EmailField ( unique = True )
    first_name = models.CharField ( max_length = 100 )
    last_name = models.CharField ( max_length = 100 , blank = True )
    mobile_no = models.CharField ( max_length = 15 )
    date_of_birth = models.DateField ( )
    city = models.CharField ( max_length = 100 )
    state = models.CharField ( max_length = 100 )
    photo = models.ImageField ( upload_to = "student_photos/" , blank = True , null = True )
    qualification = models.CharField ( max_length = 100 )
    course = models.CharField ( max_length = 100 )
    gender = models.CharField (
            max_length = 10 , choices = [
                    ("Male" , "Male") ,
                    ("Female" , "Female") ,
                    ("Other" , "Other")
            ]
    )
    branch = models.CharField ( max_length = 100 )
    user = models.ForeignKey ( User , on_delete = models.CASCADE , null = True , blank = True )
    assigned_staff = models.ForeignKey (
            'Employee' ,
            on_delete = models.SET_NULL ,
            null = True ,
            blank = True ,
            related_name = 'assigned_students'
    )
    assigned_batch = models.ForeignKey (
            'Batches' ,
            on_delete = models.SET_NULL ,
            null = True ,
            blank = True ,
            related_name = 'batch_students'
    )
    
    # Leave related fields
    total_leave_days = models.IntegerField (
            default = 30 ,
            validators = [ MinValueValidator ( 0 ) , MaxValueValidator ( 90 ) ]
    )
    used_leave_days = models.IntegerField (
            default = 0 ,
            validators = [ MinValueValidator ( 0 ) ]
    )
    
    created_at = models.DateTimeField ( auto_now_add = True )
    updated_at = models.DateTimeField ( auto_now = True )

    is_transferred = models.BooleanField(default=False)
    previous_trainer = models.ForeignKey(
        'Employee', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='transferred_students'
    )
    previous_batch = models.ForeignKey(
        'Batches', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='transferred_from'
    )
    transfer_date = models.DateTimeField(null=True, blank=True)
    
    def __str__ ( self ) :
        return f"{self.first_name} {self.last_name} ({self.student_id})"
    
    class Meta :
        db_table = 'students'
    
    # Add these methods for leave management
    @property
    def remaining_leave_days ( self ) :
        """Calculate remaining leave days"""
        return self.total_leave_days - self.used_leave_days
    
    def get_pending_leaves ( self ) :
        """Get pending leave applications"""
        return self.leave_applications.filter ( status = 'pending' )
    
    def get_approved_leaves ( self ) :
        """Get approved leave applications"""
        return self.leave_applications.filter ( status = 'approved' )
    
    def get_rejected_leaves ( self ) :
        """Get rejected leave applications"""
        return self.leave_applications.filter ( status = 'rejected' )
    
    def can_apply_leave ( self , days_requested ) :
        """Check if student can apply for leave based on remaining days"""
        return self.remaining_leave_days >= days_requested
    
    def update_used_leave_days ( self ) :
        """Update used leave days count based on approved leaves"""
        approved_leaves = self.leave_applications.filter ( status = 'approved' )
        total_used = sum ( leave.number_of_days for leave in approved_leaves )
        self.used_leave_days = total_used
        self.save ( )


class StudentBatchEnrollment ( models.Model ) :
    student = models.ForeignKey (
            Students ,
            on_delete = models.CASCADE ,
            related_name = 'batch_enrollments'
    )
    batch = models.ForeignKey (
            Batches ,
            on_delete = models.CASCADE ,
            related_name = 'student_enrollments'
    )
    course_enrollment = models.ForeignKey (
            'StudentCourseEnrollment' ,
            on_delete = models.SET_NULL ,
            null = True ,
            blank = True ,
            related_name = 'batch_assignments'
    )
    assigned_by = models.ForeignKey (
            User ,
            on_delete = models.SET_NULL ,
            null = True ,
            blank = True ,
            related_name = 'student_batch_assignments'
    )
    is_active = models.BooleanField ( default = True )
    assigned_at = models.DateTimeField ( auto_now_add = True )

    class Meta :
        db_table = 'student_batch_enrollments'
        unique_together = [ 'student' , 'batch' ]
        indexes = [
                models.Index ( fields = [ 'student' , 'batch' ] ) ,
                models.Index ( fields = [ 'batch' , 'is_active' ] ) ,
        ]

    def __str__ ( self ) :
        return f"{self.student.student_id} - {self.batch.batch_number}"


class StudentCourseEnrollment ( models.Model ) :
    student = models.ForeignKey (
            Students ,
            on_delete = models.CASCADE ,
            related_name = 'course_enrollments'
    )
    course = models.ForeignKey (
            Courses ,
            on_delete = models.CASCADE ,
            related_name = 'student_enrollments'
    )
    enrolled_by = models.ForeignKey (
            User ,
            on_delete = models.SET_NULL ,
            null = True ,
            blank = True ,
            related_name = 'student_course_enrollments'
    )
    is_active = models.BooleanField ( default = True )
    enrolled_at = models.DateTimeField ( auto_now_add = True )
    updated_at = models.DateTimeField ( auto_now = True )

    class Meta :
        db_table = 'student_course_enrollments'
        unique_together = [ 'student' , 'course' ]
        indexes = [
                models.Index ( fields = [ 'student' , 'course' ] ) ,
                models.Index ( fields = [ 'course' , 'is_active' ] ) ,
        ]

    def __str__ ( self ) :
        return f"{self.student.student_id} - {self.course.course_name}"


class StudentAttendance ( models.Model ) :
    ATTENDANCE_STATUS = [
            ('Present' , 'Present') ,
            ('Absent' , 'Absent') ,
    ]
    
    student = models.ForeignKey ( 'Students' , on_delete = models.CASCADE )
    batch = models.ForeignKey ( 'Batches' , on_delete = models.CASCADE , null = True , blank = True )
    staff = models.ForeignKey ( 'Employee' , on_delete = models.CASCADE )
    session = models.ForeignKey ( 'CourseSession' , on_delete = models.SET_NULL , null = True , blank = True , related_name = 'attendance_records' )
    date = models.DateField ( default = date.today )
    status = models.CharField ( max_length = 10 , choices = ATTENDANCE_STATUS )
    remarks = models.CharField ( max_length = 255 , blank = True , null = True )
    created_at = models.DateTimeField ( auto_now_add = True )
    
    class Meta :
        db_table = 'student_attendance'
        unique_together = ('student' , 'batch' , 'staff' , 'date' , 'session')
        ordering = [ '-date' ]
    
    def __str__ ( self ) :
        return f"{self.student.first_name} - {self.date} - {self.status}"


class UserActivity ( models.Model ) :
    USER_TYPE_CHOICES = [
            ('employee' , 'Employee') ,
            ('student' , 'Student') ,
    ]

    user = models.ForeignKey ( User , on_delete = models.CASCADE , related_name = 'activity_logs' )
    user_type = models.CharField ( max_length = 20 , choices = USER_TYPE_CHOICES )
    employee = models.ForeignKey (
            'Employee' ,
            on_delete = models.SET_NULL ,
            null = True ,
            blank = True ,
            related_name = 'activity_logs'
    )
    student = models.ForeignKey (
            'Students' ,
            on_delete = models.SET_NULL ,
            null = True ,
            blank = True ,
            related_name = 'activity_logs'
    )
    login_time = models.DateTimeField ( default = timezone.now )
    logout_time = models.DateTimeField ( null = True , blank = True )
    last_seen = models.DateTimeField ( null = True , blank = True )
    created_at = models.DateTimeField ( auto_now_add = True )

    class Meta :
        db_table = 'user_activity'
        ordering = [ '-login_time' ]

    def __str__ ( self ) :
        return f"{self.user.username} - {self.user_type} - {self.login_time}"


class StudentLoginRatingEvent ( models.Model ) :
    EVENT_TYPE_CHOICES = [
            ('login' , 'Login') ,
            ('app_use' , 'App Use') ,
    ]

    user = models.ForeignKey ( User , on_delete = models.CASCADE , related_name = 'student_login_rating_events' )
    student = models.ForeignKey (
            'Students' ,
            on_delete = models.CASCADE ,
            related_name = 'login_rating_events'
    )
    event_type = models.CharField ( max_length = 20 , choices = EVENT_TYPE_CHOICES )
    occurred_at = models.DateTimeField ( default = timezone.now )
    created_at = models.DateTimeField ( auto_now_add = True )

    class Meta :
        db_table = 'student_login_rating_events'
        ordering = [ '-occurred_at' ]
        indexes = [
                models.Index ( fields = [ 'student' , 'occurred_at' ] ) ,
                models.Index ( fields = [ 'student' , 'event_type' , 'occurred_at' ] ) ,
        ]

    def __str__ ( self ) :
        return f"{self.student_id} - {self.event_type} - {self.occurred_at}"


class PublicUser(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField(blank=True, null=True)
    mobile = models.CharField(max_length=20, blank=True, null=True)
    qualification = models.CharField(max_length=120, blank=True, null=True)
    location = models.CharField(max_length=160, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    username = models.CharField(max_length=120, unique=True)
    password = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'public_users'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.username})"


class PublicUserActivity(models.Model):
    public_user = models.ForeignKey(PublicUser, on_delete=models.CASCADE, related_name='activity_logs')
    login_time = models.DateTimeField(default=timezone.now)
    logout_time = models.DateTimeField(null=True, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'public_user_activity'
        ordering = ['-login_time']

    def __str__(self):
        return f"{self.public_user.username} - {self.login_time}"


class PublicPracticeResult(models.Model):
    public_user = models.ForeignKey(PublicUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='practice_results')
    username = models.CharField(max_length=120)
    quiz_id = models.IntegerField()
    quiz_title = models.CharField(max_length=255)
    score = models.FloatField(default=0)
    total_marks = models.FloatField(default=0)
    percentage = models.FloatField(default=0)
    is_passed = models.BooleanField(default=False)
    correct_count = models.IntegerField(default=0)
    wrong_count = models.IntegerField(default=0)
    attempted_count = models.IntegerField(default=0)
    total_questions = models.IntegerField(default=0)
    completed_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'public_practice_results'
        ordering = ['-completed_at']

    def __str__(self):
        return f"{self.username} - {self.quiz_title} - {self.percentage}%"


class StudyMaterial ( models.Model ) :
    batch = models.ForeignKey ( 'Batches' , on_delete = models.CASCADE , null = True , blank = True )
    uploaded_by = models.ForeignKey ( 'Employee' , on_delete = models.CASCADE )
    title = models.CharField ( max_length = 200 )
    description = models.TextField ( blank = True , null = True )
    file = models.FileField ( upload_to = 'materials/' )
    is_library = models.BooleanField ( default = False )
    uploaded_at = models.DateTimeField ( auto_now_add = True )
    
    class Meta :
        db_table = 'study_materials'
        ordering = [ '-uploaded_at' ]
    
    def __str__ ( self ) :
        return self.title


class StudyMaterialAssignment ( models.Model ) :
    material = models.ForeignKey (
            'StudyMaterial' ,
            on_delete = models.CASCADE ,
            related_name = 'assignments'
    )
    batch = models.ForeignKey (
            'Batches' ,
            on_delete = models.CASCADE ,
            related_name = 'material_assignments'
    )
    assigned_by = models.ForeignKey (
            'Employee' ,
            on_delete = models.SET_NULL ,
            null = True ,
            blank = True ,
            related_name = 'material_assignments_created'
    )
    assigned_at = models.DateTimeField ( auto_now_add = True )

    class Meta :
        db_table = 'study_material_assignments'
        unique_together = [ 'material' , 'batch' ]
        ordering = [ '-assigned_at' ]

    def __str__ ( self ) :
        return f"{self.material.title} -> {self.batch.batch_number}"


class QuizTest ( models.Model ) :
    TEST_TYPE_CHOICES = [
            ('mcq' , 'MCQ Test') ,
            ('technical' , 'Technical Test') ,
    ]
    CREATION_METHOD_CHOICES = [
            ('manual' , 'Create Questions Manually') ,
            ('upload' , 'Upload Question Paper') ,
    ]

    title = models.CharField ( max_length = 200 )
    description = models.TextField ( blank = True , null = True )
    test_type = models.CharField ( max_length = 20 , choices = TEST_TYPE_CHOICES , default = 'mcq' )
    creation_method = models.CharField ( max_length = 20 , choices = CREATION_METHOD_CHOICES , default = 'manual' )
    course = models.ForeignKey ( 'Courses' , on_delete = models.SET_NULL , null = True , blank = True , related_name = 'technical_tests' )
    test_date = models.DateField ( null = True , blank = True )
    start_time = models.TimeField ( null = True , blank = True )
    duration_minutes = models.PositiveIntegerField ( default = 60 )
    instructions = models.TextField ( blank = True , null = True )
    question_paper = models.FileField ( upload_to = 'technical_tests/' , blank = True , null = True )
    created_by = models.ForeignKey('Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_tests')
    created_at = models.DateTimeField ( auto_now_add = True )
    
    def __str__ ( self ) :
        return self.title
    
    class Meta :
        db_table = 'QuizTest'


class Question ( models.Model ) :
    test = models.ForeignKey ( QuizTest , on_delete = models.CASCADE )
    question_text = models.CharField ( max_length = 500 )
    option1 = models.CharField ( max_length = 255 , blank = True )
    option2 = models.CharField ( max_length = 255 , blank = True )
    option3 = models.CharField ( max_length = 255 , blank = True )
    option4 = models.CharField ( max_length = 255 , blank = True )
    correct_answer = models.CharField ( max_length = 255 , blank = True )
    
    def __str__ ( self ) :
        return self.question_text
    
    class Meta :
        db_table = 'Question'


class AssignedTest ( models.Model ) :
    test = models.ForeignKey ( QuizTest , on_delete = models.CASCADE )
    batch = models.ForeignKey ( Batches , on_delete = models.CASCADE )
    assigned_date = models.DateTimeField ( auto_now_add = True )
    
    class Meta :
        db_table = 'assigned_test'
    
    def __str__ ( self ) :
        return f"{self.test.title} → {self.batch.batch_number}"


class StaffLeaveRequest ( models.Model ) :
    LEAVE_TYPE_CHOICES = [
            ('Sick Leave' , 'Sick Leave') ,
            ('Casual Leave' , 'Casual Leave') ,
            ('Emergency Leave' , 'Emergency Leave') ,
            ('Personal Leave' , 'Personal Leave') ,
            ('Other' , 'Other') ,
    ]
    
    STATUS_CHOICES = [
            ('Pending' , 'Pending') ,
            ('Approved' , 'Approved') ,
            ('Rejected' , 'Rejected') ,
    ]
    
    staff = models.ForeignKey ( Employee , on_delete = models.CASCADE )
    start_date = models.DateField ( )
    end_date = models.DateField ( )
    no_of_days = models.PositiveIntegerField ( )
    leave_type = models.CharField ( max_length = 50 , choices = LEAVE_TYPE_CHOICES )
    reason = models.TextField ( )
    contact_info = models.CharField ( max_length = 100 , blank = True , null = True )
    status = models.CharField ( max_length = 20 , choices = STATUS_CHOICES , default = 'Pending' )
    applied_at = models.DateTimeField ( auto_now_add = True )
    
    def __str__ ( self ) :
        return f"{self.staff.first_name} - {self.leave_type} ({self.status})"
    
    class Meta :
        db_table = "staff_leave_request"
        ordering = [ '-applied_at' ]

class SupportRequest ( models.Model ) :
    STATUS_CHOICES = [
            ('pending' , 'Pending') ,
            ('in_progress' , 'In Progress') ,
            ('resolved' , 'Resolved') ,
    ]
    
    staff = models.ForeignKey ( User , on_delete = models.CASCADE )
    message = models.TextField ( )
    status = models.CharField ( max_length = 20 , choices = STATUS_CHOICES , default = 'pending' )
    created_at = models.DateTimeField ( auto_now_add = True )
    updated_at = models.DateTimeField ( auto_now = True )
    
    def get_status_display ( self ) :
        return dict ( self.STATUS_CHOICES ).get ( self.status , self.status )
    
    def __str__ ( self ) :
        return f"Support #{self.id} - {self.staff.username}"


class TestResult ( models.Model ) :
    student = models.ForeignKey ( Students , on_delete = models.CASCADE )
    test = models.ForeignKey ( QuizTest , on_delete = models.CASCADE )
    score = models.IntegerField ( )
    total_questions = models.IntegerField ( )
    percentage = models.FloatField ( )
    submitted_at = models.DateTimeField ( auto_now_add = True )
    
    class Meta :
        unique_together = [ 'student' , 'test' ]
    
    def __str__ ( self ) :
        return f"{self.student.first_name} - {self.test.title} - {self.percentage}%"


# Student Leave Application Model
class StudentLeaveApplication ( models.Model ) :
    LEAVE_TYPE_CHOICES = [
            ('sick' , 'Sick Leave') ,
            ('casual' , 'Casual Leave') ,
            ('emergency' , 'Emergency Leave') ,
            ('personal' , 'Personal Leave') ,
            ('other' , 'Other') ,
    ]
    
    STATUS_CHOICES = [
            ('pending' , 'Pending') ,
            ('approved' , 'Approved') ,
            ('rejected' , 'Rejected') ,
    ]
    
    # Student who is applying for leave
    student = models.ForeignKey (
            'Students' ,
            on_delete = models.CASCADE ,
            related_name = 'leave_applications'
    )
    
    # Staff member who will approve/reject the leave
    assigned_staff = models.ForeignKey (
            'Employee' ,
            on_delete = models.CASCADE ,
            related_name = 'student_leave_applications'
    )
    
    # Leave details
    leave_type = models.CharField (
            max_length = 20 ,
            choices = LEAVE_TYPE_CHOICES ,
            default = 'casual'
    )
    
    start_date = models.DateField ( )
    end_date = models.DateField ( )
    number_of_days = models.PositiveIntegerField (
            validators = [ MinValueValidator ( 1 ) , MaxValueValidator ( 30 ) ]
    )
    
    # Application details
    reason = models.TextField ( )
    contact_info = models.CharField ( max_length = 255 )
    
    # Status and tracking
    status = models.CharField (
            max_length = 20 ,
            choices = STATUS_CHOICES ,
            default = 'pending'
    )
    
    staff_remarks = models.TextField ( blank = True , null = True )
    applied_at = models.DateTimeField ( auto_now_add = True )
    updated_at = models.DateTimeField ( auto_now = True )
    processed_at = models.DateTimeField ( blank = True , null = True )
    
    # Supporting documents (optional)
    supporting_document = models.FileField (
            upload_to = 'leave_documents/' ,
            blank = True ,
            null = True
    )
    
    class Meta :
        db_table = 'student_leave_applications'
        ordering = [ '-applied_at' ]
        verbose_name = 'Student Leave Application'
        verbose_name_plural = 'Student Leave Applications'
    
    def __str__ ( self ) :
        return f"{self.student.first_name} {self.student.last_name} - {self.get_leave_type_display ( )} ({self.get_status_display ( )})"
    
    def save ( self , *args , **kwargs ) :
        # Auto-calculate number of days if not provided
        if self.start_date and self.end_date and not self.number_of_days :
            delta = self.end_date - self.start_date
            self.number_of_days = delta.days + 1
        
        # Set processed_at when status changes from pending
        if self.pk :
            original = StudentLeaveApplication.objects.get ( pk = self.pk )
            if original.status == 'pending' and self.status != 'pending' :
                self.processed_at = timezone.now ( )
        
        super ( ).save ( *args , **kwargs )
    
    def is_approved ( self ) :
        return self.status == 'approved'
    
    def is_pending ( self ) :
        return self.status == 'pending'
    
    def is_rejected ( self ) :
        return self.status == 'rejected'
    
    @property
    def duration_display ( self ) :
        return f"{self.number_of_days} day{'s' if self.number_of_days > 1 else ''}"
    
    @property
    def date_range_display ( self ) :
        return f"{self.start_date.strftime ( '%b %d, %Y' )} - {self.end_date.strftime ( '%b %d, %Y' )}"


class StudentSupportRequest ( models.Model ) :
    STATUS_CHOICES = [
            ('pending' , 'Pending') ,
            ('in_progress' , 'In Progress') ,
            ('resolved' , 'Resolved') ,
    ]
    
    student = models.ForeignKey ( User , on_delete = models.CASCADE )
    message = models.TextField ( )
    status = models.CharField ( max_length = 20 , choices = STATUS_CHOICES , default = 'pending' )
    created_at = models.DateTimeField ( auto_now_add = True )
    updated_at = models.DateTimeField ( auto_now = True )
    
    def get_status_display ( self ) :
        return dict ( self.STATUS_CHOICES ).get ( self.status , self.status )
    
    def __str__ ( self ) :
        return f"Student Support #{self.id} - {self.student.username}"


class CourseSession ( models.Model ) :
    batch = models.ForeignKey ( Batches , on_delete = models.CASCADE )
    session_number = models.IntegerField ( )
    title = models.CharField ( max_length = 255 )
    topics = models.TextField ( blank = True , null = True )
    
    # ADD THESE MISSING FIELDS:
    staff_completed = models.BooleanField ( default = False )
    session_enabled = models.BooleanField ( default = True )
    completed_date = models.DateTimeField ( null = True , blank = True )
    completed_by = models.ForeignKey (
            Employee ,
            on_delete = models.SET_NULL ,
            null = True ,
            blank = True ,
            related_name = 'completed_course_sessions'
    )
    
    created_at = models.DateTimeField ( auto_now_add = True )
    updated_at = models.DateTimeField ( auto_now = True )
    
    class Meta :
        unique_together = [ 'batch' , 'session_number' ]
        ordering = [ 'session_number' ]
    
    def __str__ ( self ) :
        return f"{self.batch.batch_number} - Session {self.session_number}: {self.title}"

class DailySessionCompletion ( models.Model ) :
    session = models.ForeignKey ( CourseSession , on_delete = models.CASCADE )
    faculty = models.ForeignKey ( Employee , on_delete = models.CASCADE )
    completion_date = models.DateField ( default = timezone.now )
    completed = models.BooleanField ( default = False )
    completed_at = models.DateTimeField ( null = True , blank = True )
    notes = models.TextField ( blank = True , null = True )
    time_spent_minutes = models.IntegerField ( null = True , blank = True )
    topics_covered = models.TextField ( blank = True , null = True )
    created_at = models.DateTimeField ( auto_now_add = True )
    updated_at = models.DateTimeField ( auto_now = True )
    
    class Meta :
        unique_together = [ 'session' , 'faculty' , 'completion_date' ]
        ordering = [ 'completion_date' , 'session__session_number' ]
    
    def __str__ ( self ) :
        status = "Completed" if self.completed else "In Progress"
        return f"{self.session} - {self.completion_date} - {status}"


class BatchSessionProgress ( models.Model ) :
    batch = models.ForeignKey ( Batches , on_delete = models.CASCADE )
    faculty = models.ForeignKey ( Employee , on_delete = models.CASCADE )
    total_sessions = models.IntegerField ( default = 0 )
    completed_sessions = models.IntegerField ( default = 0 )
    progress_percentage = models.FloatField ( default = 0.0 )
    last_updated = models.DateTimeField ( auto_now = True )
    overall_completed = models.BooleanField ( default = False )
    completed_date = models.DateField ( null = True , blank = True )
    
    class Meta :
        unique_together = [ 'batch' , 'faculty' ]
    
    def update_progress ( self ) :
        """Update progress based on daily completions"""
        total_sessions = CourseSession.objects.filter ( batch = self.batch ).count ( )
        self.total_sessions = total_sessions
        
        # Count sessions that have at least one completion entry
        completed_count = DailySessionCompletion.objects.filter (
                session__batch = self.batch ,
                faculty = self.faculty ,
                completed = True
        ).values ( 'session' ).distinct ( ).count ( )
        
        self.completed_sessions = completed_count
        self.progress_percentage = (completed_count / total_sessions * 100) if total_sessions > 0 else 0
        
        # Mark as overall completed if all sessions are done
        if total_sessions > 0 and completed_count == total_sessions :
            self.overall_completed = True
            if not self.completed_date :
                self.completed_date = timezone.now ( ).date ( )
        else :
            self.overall_completed = False
        
        self.save ( )
    
    def __str__ ( self ) :
        return f"{self.batch.batch_number} - {self.progress_percentage:.1f}%"


# Add to models.py
# Add to models.py
# models.py - Add this model
class DoubtResponse ( models.Model ) :
    doubt = models.ForeignKey (
        'Student_Session_Progress' , on_delete = models.CASCADE , related_name = 'responses'
        )  # Changed to match actual model name
    staff = models.ForeignKey ( Employee , on_delete = models.CASCADE )
    message = models.TextField ( )
    created_at = models.DateTimeField ( auto_now_add = True )
    
    class Meta :
        ordering = [ 'created_at' ]
    
    def __str__ ( self ) :
        return f"Response to {self.doubt.student.first_name} - {self.created_at}"

# Also update the StudentSessionProgress model to track doubt status

# models.py - Add this model
# In your models.py - CORRECT THESE MODELS:

# This model name has underscores


# Add to your Student_Session_Progress model
class Student_Session_Progress ( models.Model ) :
    student = models.ForeignKey ( 'Students' , on_delete = models.CASCADE )
    session = models.ForeignKey ( 'CourseSession' , on_delete = models.CASCADE )
    completed = models.BooleanField ( default = False )
    has_doubt = models.BooleanField ( default = False )
    doubt_description = models.TextField ( blank = True , null = True )
    doubt_raised_at = models.DateTimeField ( null = True , blank = True )
    doubt_resolved = models.BooleanField ( default = False )
    doubt_resolved_at = models.DateTimeField ( null = True , blank = True )
    student_seen_response = models.BooleanField ( default = False )
    completed_date = models.DateTimeField ( null = True , blank = True )
    created_at = models.DateTimeField ( auto_now_add = True )
    updated_at = models.DateTimeField ( auto_now = True )
    
    # ADD THESE FIELDS for the new workflow:
    staff_completed = models.BooleanField ( default = False )  # Staff marked as done
    student_status = models.CharField (
            max_length = 20 ,
            choices = [
                    ('not_started' , 'Not Started') ,  # Staff hasn't completed yet
                    ('pending' , 'Pending Confirmation') ,  # Staff completed, waiting for student
                    ('completed' , 'Completed') ,  # Student confirmed completion
                    ('doubt' , 'Doubt Raised') ,  # Student raised doubt
            ] ,
            default = 'not_started'
    )
    staff_completed_at = models.DateTimeField ( null = True , blank = True )
    student_confirmed_at = models.DateTimeField ( null = True , blank = True )
    
    class Meta :
        unique_together = [ 'student' , 'session' ]
        db_table = 'student_session_progress'
    
    def __str__ ( self ) :
        return f"{self.student.first_name} - {self.session.title} - {self.student_status}"
    
    


# Add missing fields to SessionNotification
class SessionNotification ( models.Model ) :
    NOTIFICATION_TYPES = (
            ('session_completed' , 'Session Completed') ,
            ('doubt_raised' , 'Doubt Raised') ,
            ('doubt_resolved' , 'Doubt Resolved') ,
            ('leave_alert' , 'Leave Alert') ,
            ('assignment' , 'Assignment') ,
            ('batch_ending_soon' , 'Batch Ending Soon') ,
            ('batch_duration_exceeded' , 'Batch Duration Exceeded') ,
            ('quiz_result' , 'Quiz Result') ,
            ('leave_application' , 'Leave Application') ,
            ('announcement' , 'Announcement') ,
            ('support' , 'Support') ,
    )
    
    session = models.ForeignKey ( 'CourseSession' , on_delete = models.CASCADE , null = True , blank = True )
    from_user = models.ForeignKey ( User , related_name = 'sent_notifications' , on_delete = models.CASCADE )
    to_user = models.ForeignKey ( User , related_name = 'received_notifications' , on_delete = models.CASCADE )
    notification_type = models.CharField ( max_length = 50 , choices = NOTIFICATION_TYPES )
    message = models.TextField ( )
    is_read = models.BooleanField ( default = False )
    created_at = models.DateTimeField ( auto_now_add = True )
    
    # ADD THESE MISSING FIELDS that are referenced in views:
    title = models.CharField ( max_length = 255 , blank = True , null = True )
    user = models.ForeignKey (
        User , on_delete = models.CASCADE , related_name = 'user_notifications' , null = True , blank = True
        )
    related_session = models.ForeignKey (
        'CourseSession' , on_delete = models.CASCADE , related_name = 'session_notifications' , null = True ,
        blank = True
        )
    requires_action = models.BooleanField ( default = False )
    
    class Meta :
        ordering = [ '-created_at' ]
    
    def __str__ ( self ) :
        return f"{self.notification_type} - {self.from_user.username} to {self.to_user.username}"


# Models
# Corrected StudentSessionStatus model
class StudentSessionStatus ( models.Model ) :
    student = models.ForeignKey ( Students , on_delete = models.CASCADE )
    session = models.ForeignKey ( CourseSession , on_delete = models.CASCADE )  # Changed from Sessions to CourseSession
    staff_completed = models.BooleanField ( default = False )
    student_status = models.CharField (
            max_length = 20 ,
            choices = [ ('pending' , 'Pending') , ('completed' , 'Completed') , ('doubt' , 'Doubt') ] ,
            default = 'pending'
    )
    staff_completed_at = models.DateTimeField ( null = True , blank = True )
    student_confirmed_at = models.DateTimeField ( null = True , blank = True )
    
    class Meta :
        unique_together = [ 'student' , 'session' ]
        db_table = 'student_session_status'
    
    def __str__ ( self ) :
        return f"{self.student.first_name} - {self.session.title} - {self.student_status}"


class SessionCompletion ( models.Model ) :
    STATUS_CHOICES = [
            ('pending' , 'Pending') ,
            ('completed' , 'Completed') ,
            ('doubt' , 'Has Doubt')
    ]
    
    session = models.ForeignKey ( 'CourseSession' , on_delete = models.CASCADE )
    student = models.ForeignKey ( 'Students' , on_delete = models.CASCADE )
    status = models.CharField ( max_length = 20 , choices = STATUS_CHOICES , default = 'pending' )
    completed_at = models.DateTimeField ( auto_now_add = True )
    created_at = models.DateTimeField ( auto_now_add = True )
    
    class Meta :
        unique_together = [ 'session' , 'student' ]
        db_table = 'session_completion'
        ordering = [ '-completed_at' ]
    
    def __str__ ( self ) :
        return f"{self.student.first_name} - {self.session.title} - {self.status}"


class ChallengeQuestionPool ( models.Model ) :
    DIFFICULTY_CHOICES = [
            ('easy' , 'Easy') ,
            ('medium' , 'Medium') ,
            ('hard' , 'Hard') ,
    ]

    course = models.ForeignKey ( Courses , on_delete = models.CASCADE , related_name = 'challenge_questions' )
    batch = models.ForeignKey ( Batches , on_delete = models.CASCADE , related_name = 'challenge_questions' )
    source_session = models.ForeignKey (
            CourseSession ,
            on_delete = models.CASCADE ,
            related_name = 'challenge_questions'
    )
    topic_name = models.CharField ( max_length = 255 )
    difficulty = models.CharField ( max_length = 20 , choices = DIFFICULTY_CHOICES , default = 'medium' )
    question_text = models.TextField ( )
    option_a = models.CharField ( max_length = 500 )
    option_b = models.CharField ( max_length = 500 )
    option_c = models.CharField ( max_length = 500 )
    option_d = models.CharField ( max_length = 500 )
    correct_answer = models.CharField ( max_length = 1 )
    explanation = models.TextField ( blank = True , null = True )
    ai_provider = models.CharField ( max_length = 100 , blank = True , null = True )
    ai_model = models.CharField ( max_length = 100 , blank = True , null = True )
    source_hash = models.CharField ( max_length = 64 , blank = True )
    is_active = models.BooleanField ( default = True )
    created_at = models.DateTimeField ( auto_now_add = True )
    updated_at = models.DateTimeField ( auto_now = True )

    class Meta :
        db_table = 'challenge_question_pool'
        indexes = [
                models.Index ( fields = [ 'course' , 'batch' , 'is_active' ] ) ,
                models.Index ( fields = [ 'source_session' , 'is_active' ] ) ,
                models.Index ( fields = [ 'batch' , 'difficulty' , 'is_active' ] ) ,
        ]

    def __str__ ( self ) :
        return f"{self.batch.batch_number} - {self.topic_name} - {self.difficulty}"


class StudentChallenge ( models.Model ) :
    STATUS_CHOICES = [
            ('active' , 'Active') ,
            ('completed' , 'Completed') ,
            ('cancelled' , 'Cancelled') ,
    ]

    student = models.ForeignKey ( Students , on_delete = models.CASCADE , related_name = 'challenges' )
    course = models.ForeignKey ( Courses , on_delete = models.CASCADE , related_name = 'student_challenges' )
    batch = models.ForeignKey ( Batches , on_delete = models.CASCADE , related_name = 'student_challenges' )
    start_date = models.DateField ( null = True , blank = True )
    status = models.CharField ( max_length = 20 , choices = STATUS_CHOICES , default = 'active' )
    current_streak = models.PositiveIntegerField ( default = 0 )
    longest_streak = models.PositiveIntegerField ( default = 0 )
    completed_days = models.PositiveIntegerField ( default = 0 )
    total_score = models.PositiveIntegerField ( default = 0 )
    total_questions = models.PositiveIntegerField ( default = 0 )
    created_at = models.DateTimeField ( auto_now_add = True )
    updated_at = models.DateTimeField ( auto_now = True )

    class Meta :
        db_table = 'student_challenges'
        unique_together = [ 'student' , 'course' , 'batch' ]
        indexes = [
                models.Index ( fields = [ 'student' , 'status' ] ) ,
                models.Index ( fields = [ 'course' , 'batch' ] ) ,
                models.Index ( fields = [ 'batch' , 'status' ] ) ,
        ]

    def __str__ ( self ) :
        return f"{self.student.student_id} - {self.course.course_name} - {self.batch.batch_number}"


class StudentChallengeAchievement ( models.Model ) :
    BADGE_CHOICES = [
            ('excellent_student' , 'Excellent Student') ,
    ]

    student = models.ForeignKey ( Students , on_delete = models.CASCADE , related_name = 'challenge_achievements' )
    course = models.ForeignKey ( Courses , on_delete = models.CASCADE , related_name = 'challenge_achievements' )
    batch = models.ForeignKey ( Batches , on_delete = models.CASCADE , related_name = 'challenge_achievements' )
    challenge = models.OneToOneField (
            StudentChallenge ,
            on_delete = models.CASCADE ,
            related_name = 'achievement'
    )
    badge_code = models.CharField ( max_length = 50 , choices = BADGE_CHOICES , default = 'excellent_student' )
    badge_title = models.CharField ( max_length = 100 , default = 'Excellent Student' )
    completed_days = models.PositiveIntegerField ( default = 15 )
    final_score_percentage = models.DecimalField ( max_digits = 5 , decimal_places = 2 , default = 0 )
    calendar_days_taken = models.PositiveIntegerField ( default = 1 )
    completed_at = models.DateTimeField ( )
    created_at = models.DateTimeField ( auto_now_add = True )

    class Meta :
        db_table = 'student_challenge_achievements'
        unique_together = [ 'student' , 'course' , 'batch' , 'challenge' ]
        indexes = [
                models.Index ( fields = [ 'student' , 'course' , 'batch' ] ) ,
                models.Index ( fields = [ 'challenge' ] ) ,
        ]

    def __str__ ( self ) :
        return f"{self.student.student_id} - {self.badge_title}"


class StudentChallengeDay ( models.Model ) :
    STATUS_CHOICES = [
            ('assigned' , 'Assigned') ,
            ('completed' , 'Completed') ,
    ]

    challenge = models.ForeignKey ( StudentChallenge , on_delete = models.CASCADE , related_name = 'days' )
    day_number = models.PositiveIntegerField ( )
    challenge_date = models.DateField ( )
    status = models.CharField ( max_length = 20 , choices = STATUS_CHOICES , default = 'assigned' )
    score = models.PositiveIntegerField ( default = 0 )
    total_questions = models.PositiveIntegerField ( default = 0 )
    started_at = models.DateTimeField ( null = True , blank = True )
    completed_at = models.DateTimeField ( null = True , blank = True )
    created_at = models.DateTimeField ( auto_now_add = True )
    updated_at = models.DateTimeField ( auto_now = True )

    class Meta :
        db_table = 'student_challenge_days'
        unique_together = [ ( 'challenge' , 'day_number' ) ]
        indexes = [
                models.Index ( fields = [ 'challenge' , 'challenge_date' ] ) ,
                models.Index ( fields = [ 'challenge_date' , 'status' ] ) ,
        ]

    def __str__ ( self ) :
        return f"{self.challenge} - Day {self.day_number}"


class StudentChallengeDayQuestion ( models.Model ) :
    challenge_day = models.ForeignKey (
            StudentChallengeDay ,
            on_delete = models.CASCADE ,
            related_name = 'day_questions'
    )
    question = models.ForeignKey (
            ChallengeQuestionPool ,
            on_delete = models.CASCADE ,
            related_name = 'student_day_questions'
    )
    question_order = models.PositiveIntegerField ( )
    selected_answer = models.CharField ( max_length = 1 , blank = True , null = True )
    is_correct = models.BooleanField ( null = True , blank = True )
    marks = models.PositiveIntegerField ( default = 0 )
    answered_at = models.DateTimeField ( null = True , blank = True )

    class Meta :
        db_table = 'student_challenge_day_questions'
        unique_together = [ ( 'challenge_day' , 'question' ) , ( 'challenge_day' , 'question_order' ) ]
        ordering = [ 'question_order' ]
        indexes = [
                models.Index ( fields = [ 'challenge_day' , 'question_order' ] ) ,
                models.Index ( fields = [ 'question' ] ) ,
        ]

    def __str__ ( self ) :
        return f"{self.challenge_day} - Question {self.question_order}"


# models.py
from django.db import models
from django.contrib.auth.models import User


class Announcement ( models.Model ) :
    ANNOUNCEMENT_TYPES = [
            ('general' , 'General Announcement') ,
            ('important' , 'Important Notice') ,
            ('update' , 'System Update') ,
            ('holiday' , 'Holiday Notice') ,
            ('event' , 'Event Announcement') ,
            ('exam' , 'Exam Schedule') ,
            ('course' , 'Course Related') ,
    ]
    
    RECIPIENT_TYPES = [
            ('all' , 'All Users') ,
            ('students' , 'Students Only') ,
            ('mentors' , 'Mentors Only') ,
            ('counselors' , 'Counselors Only') ,
            ('staff' , 'All Staff (Mentors + Counselors)') ,
            ('specific' , 'Specific Users') ,
    ]
    
    title = models.CharField ( max_length = 200 )
    message = models.TextField ( )
    announcement_type = models.CharField ( max_length = 20 , choices = ANNOUNCEMENT_TYPES , default = 'general' )
    recipient_type = models.CharField ( max_length = 20 , choices = RECIPIENT_TYPES , default = 'all' )
    
    # Specific recipient selection
    specific_students = models.ManyToManyField ( 'Students' , blank = True , related_name = 'specific_announcements' )
    specific_mentors = models.ManyToManyField (
        'Employee' , blank = True , limit_choices_to = { 'designation' : 'mentor' } ,
        related_name = 'mentor_announcements'
        )
    specific_counselors = models.ManyToManyField (
        'Employee' , blank = True , limit_choices_to = { 'designation' : 'counselor' } ,
        related_name = 'counselor_announcements'
        )
    
    # Status
    is_published = models.BooleanField ( default = True )
    is_important = models.BooleanField ( default = False )
    allow_comments = models.BooleanField ( default = False )
    
    # Metadata
    created_by = models.ForeignKey ( User , on_delete = models.CASCADE , related_name = 'announcements_created' )
    created_at = models.DateTimeField ( auto_now_add = True )
    updated_at = models.DateTimeField ( auto_now = True )
    published_at = models.DateTimeField ( null = True , blank = True )
    
    # View tracking
    views_count = models.PositiveIntegerField ( default = 0 )
    
    class Meta :
        ordering = [ '-created_at' ]
        indexes = [
                models.Index ( fields = [ 'recipient_type' , 'is_published' , 'created_at' ] ) ,
        ]
    
    def __str__ ( self ) :
        return f"{self.title} ({self.get_recipient_type_display ( )})"
    
    def get_recipient_count ( self ) :
        """Get count of recipients"""
        if self.recipient_type == 'all' :
            return 'All Users'
        elif self.recipient_type == 'students' :
            return f"{self.specific_students.count ( )} Students"
        elif self.recipient_type == 'mentors' :
            return f"{self.specific_mentors.count ( )} Mentors"
        elif self.recipient_type == 'counselors' :
            return f"{self.specific_counselors.count ( )} Counselors"
        elif self.recipient_type == 'staff' :
            return 'All Staff'
        return 'Specific Users'
    
    def mark_as_viewed ( self , user ) :
        """Mark announcement as viewed by user"""
        AnnouncementView.objects.get_or_create (
                announcement = self ,
                user = user
        )
        self.views_count = AnnouncementView.objects.filter ( announcement = self ).count ( )
        self.save ( )


class AnnouncementView ( models.Model ) :
    """Track which users have viewed announcements"""
    announcement = models.ForeignKey ( Announcement , on_delete = models.CASCADE , related_name = 'views' )
    user = models.ForeignKey ( User , on_delete = models.CASCADE )
    viewed_at = models.DateTimeField ( auto_now_add = True )
    
    class Meta :
        unique_together = [ 'announcement' , 'user' ]
        
        
# In models.py, add these models

# In models.py

class CounselorLeaveRequest ( models.Model ) :
    LEAVE_TYPE_CHOICES = [
            ('Sick Leave' , 'Sick Leave') ,
            ('Casual Leave' , 'Casual Leave') ,
            ('Emergency Leave' , 'Emergency Leave') ,
            ('Personal Leave' , 'Personal Leave') ,
            ('Branch Visit' , 'Branch Visit') ,
            ('Other' , 'Other') ,
    ]
    
    STATUS_CHOICES = [
            ('Pending' , 'Pending') ,
            ('Approved' , 'Approved') ,
            ('Rejected' , 'Rejected') ,
    ]
    
    counselor = models.ForeignKey ( Employee , on_delete = models.CASCADE )
    start_date = models.DateField ( )
    end_date = models.DateField ( )
    no_of_days = models.PositiveIntegerField ( )
    leave_type = models.CharField ( max_length = 50 , choices = LEAVE_TYPE_CHOICES )
    reason = models.TextField ( )
    contact_info = models.CharField ( max_length = 100 , blank = True , null = True )
    status = models.CharField ( max_length = 20 , choices = STATUS_CHOICES , default = 'Pending' )
    applied_at = models.DateTimeField ( auto_now_add = True )
    
    def __str__ ( self ) :
        return f"{self.counselor.first_name} - {self.leave_type} ({self.status})"
    
    class Meta :
        db_table = "counselor_leave_request"
        ordering = [ '-applied_at' ]


class CounselorSupportRequest ( models.Model ) :
    STATUS_CHOICES = [
            ('pending' , 'Pending') ,
            ('in_progress' , 'In Progress') ,
            ('resolved' , 'Resolved') ,
    ]
    
    counselor = models.ForeignKey ( User , on_delete = models.CASCADE )
    message = models.TextField ( )
    status = models.CharField ( max_length = 20 , choices = STATUS_CHOICES , default = 'pending' )
    created_at = models.DateTimeField ( auto_now_add = True )
    updated_at = models.DateTimeField ( auto_now = True )
    
    def get_status_display ( self ) :
        return dict ( self.STATUS_CHOICES ).get ( self.status , self.status )
    
    def __str__ ( self ) :
        return f"Counselor Support #{self.id} - {self.counselor.username}"


from django.db import models
from django.contrib.auth.models import User
from .models import Batches , Employee , Students
import uuid


class Quiz ( models.Model ) :
    """Quiz created from uploaded file"""
    DIFFICULTY_CHOICES = [
            ('easy' , 'Easy') ,
            ('medium' , 'Medium') ,
            ('hard' , 'Hard') ,
    ]
    
    quiz_id = models.CharField ( max_length = 20 , unique = True , editable = False )
    title = models.CharField ( max_length = 200 )
    description = models.TextField ( blank = True )
    batch = models.ForeignKey ( Batches , on_delete = models.CASCADE , related_name = 'quizzes' , blank = True , null = True )
    created_by = models.ForeignKey ( Employee , on_delete = models.SET_NULL , null = True )
    source_file = models.FileField ( upload_to = 'quiz_files/' , blank = True , null = True )
    total_questions = models.IntegerField ( default = 0 )
    total_marks = models.IntegerField ( default = 0 )
    passing_marks = models.IntegerField ( default = 35 )
    duration_minutes = models.IntegerField ( default = 30 )
    difficulty = models.CharField ( max_length = 20 , choices = DIFFICULTY_CHOICES , default = 'medium' )
    category = models.CharField(max_length=100, blank=True)
    start_date = models.DateTimeField(blank=True, null=True)
    end_date = models.DateTimeField(blank=True, null=True)
    shuffle_questions = models.BooleanField(default=True)
    shuffle_options = models.BooleanField(default=False)
    number_of_questions = models.IntegerField(default=0)
    
    is_published = models.BooleanField ( default = False )
    publish_date = models.DateTimeField ( null = True , blank = True )
    deadline = models.DateTimeField ( null = True , blank = True )
    allow_retake = models.BooleanField ( default = False )
    max_attempts = models.IntegerField ( default = 1 )
    
    created_at = models.DateTimeField ( auto_now_add = True )
    updated_at = models.DateTimeField ( auto_now = True )

    
    class Meta :
        ordering = [ '-created_at' ]
    
    def save ( self , *args , **kwargs ) :
        if not self.quiz_id :
            # Generate unique quiz ID (e.g., QUIZ-2024-0001)
            last_quiz = Quiz.objects.order_by ( '-id' ).first ( )
            if last_quiz :
                last_num = int ( last_quiz.quiz_id.split ( '-' ) [ -1 ] )
                new_num = last_num + 1
            else :
                new_num = 1
            self.quiz_id = f"QUIZ-{timezone.now ( ).year}-{new_num:04d}"
        super ( ).save ( *args , **kwargs )
    
    def __str__ ( self ) :
        return f"{self.quiz_id} - {self.title}"


class QuizQuestion ( models.Model ) :
    """Individual questions from the uploaded file"""
    quiz = models.ForeignKey ( Quiz , on_delete = models.CASCADE , related_name = 'questions' )
    question_number = models.IntegerField ( )
    question_text = models.TextField ( )
    option_a = models.CharField ( max_length = 500 )
    option_b = models.CharField ( max_length = 500 )
    option_c = models.CharField ( max_length = 500 , blank = True , null = True )
    option_d = models.CharField ( max_length = 500 , blank = True , null = True )
    correct_answer = models.CharField (
        max_length = 1 , choices = [
                ('A' , 'A') , ('B' , 'B') , ('C' , 'C') , ('D' , 'D')
        ]
        )
    explanation = models.TextField ( blank = True , null = True )
    marks = models.IntegerField ( default = 1 )
    
    class Meta :
        ordering = [ 'question_number' ]
    
    def __str__ ( self ) :
        return f"Q{self.question_number}: {self.question_text [ :50 ]}"


class QuizAttempt ( models.Model ) :
    """Track student quiz attempts"""
    quiz = models.ForeignKey ( Quiz , on_delete = models.CASCADE , related_name = 'attempts' )
    student = models.ForeignKey ( Students , on_delete = models.CASCADE )
    attempt_number = models.IntegerField ( default = 1 )
    started_at = models.DateTimeField ( auto_now_add = True )
    submitted_at = models.DateTimeField ( null = True , blank = True )
    is_completed = models.BooleanField ( default = False )
    score = models.IntegerField ( default = 0 )
    percentage = models.FloatField ( default = 0 )
    is_passed = models.BooleanField ( default = False )
    total_questions = models.IntegerField(default=0)
    attempted_count = models.IntegerField(default=0)
    correct_count = models.IntegerField(default=0)
    wrong_count = models.IntegerField(default=0)
    question_order = models.JSONField(blank=True, default=list)
    option_orders = models.JSONField(blank=True, default=dict)
    auto_submitted = models.BooleanField(default=False)
    
    class Meta :
        unique_together = [ 'quiz' , 'student' , 'attempt_number' ]
        ordering = [ '-submitted_at' ]
    
    def __str__ ( self ) :
        return f"{self.student.first_name} - {self.quiz.title} (Attempt {self.attempt_number})"


class QuizAnswer ( models.Model ) :
    """Store student answers for each question"""
    attempt = models.ForeignKey ( QuizAttempt , on_delete = models.CASCADE , related_name = 'answers' )
    question = models.ForeignKey ( QuizQuestion , on_delete = models.CASCADE )
    selected_answer = models.CharField ( max_length = 1 , blank = True , null = True )
    is_correct = models.BooleanField ( default = False )
    marks_obtained = models.IntegerField ( default = 0 )
    answered_at = models.DateTimeField ( auto_now = True )
    
    class Meta :
        unique_together = [ 'attempt' , 'question' ]
        db_table = 'quiz_answer'  # Make sure this matches your database
    
    def __str__ ( self ) :
        return f"Answer for {self.question} - {self.selected_answer}"


# Add to your models.py
class CompletionReport ( models.Model ) :
    """Track completion reports sent to students"""
    student = models.ForeignKey ( Students , on_delete = models.CASCADE , related_name = 'completion_reports' )
    sent_at = models.DateTimeField ( auto_now_add = True )
    report_file = models.FileField ( upload_to = 'completion_reports/' , null = True , blank = True )
    
    class Meta :
        ordering = [ '-sent_at' ]
    
    def __str__ ( self ) :
        return f"Completion Report - {self.student.first_name} {self.student.last_name} - {self.sent_at.date ( )}"


class CompletedStudent(models.Model):
    """Store students who have completed their course"""
    
    COMPLETION_TYPE_CHOICES = [
        ('partial', 'Partial Completion - Reassigned'),
        ('full', 'Full Completion - Graduated'),
    ]
    
    # Original student details
    original_student_id = models.CharField(max_length=20)
    student_id = models.CharField(max_length=20)
    email = models.EmailField()
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    mobile_no = models.CharField(max_length=15)
    date_of_birth = models.DateField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    qualification = models.CharField(max_length=100)
    course = models.CharField(max_length=100)
    gender = models.CharField(max_length=10)
    branch = models.CharField(max_length=100)
    
    # Batch details at completion time
    batch_number = models.CharField(max_length=50)
    batch_id = models.CharField(max_length=20)
    batch_start_date = models.DateField()
    batch_end_date = models.DateField()
    faculty_name = models.CharField(max_length=200)

    # ✅ FIX THIS - Use choices properly
    completion_type = models.CharField(
        max_length=20, 
        choices=COMPLETION_TYPE_CHOICES,  # ← Use choices, not just default
        default='full'
    )
    
    # ✅ ADD THIS MISSING FIELD
    completion_percentage = models.FloatField(default=0)  # ← ADD THIS LINE
    
    # ✅ ADD THIS - Track reassigned trainer
    reassigned_to_trainer = models.ForeignKey(
        'Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='received_partial_completions'
    )

    # Track which trainer graduated this student
    graduated_from_trainer = models.ForeignKey(
        'Employee', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='graduated_students'
    )
    
    # Course details
    course_name = models.CharField(max_length=255)
    
    # Completion details
    completion_date = models.DateTimeField(auto_now_add=True)
    completed_sessions_count = models.IntegerField(default=0)
    total_sessions_count = models.IntegerField(default=0)
    attendance_percentage = models.FloatField(default=0)
    average_test_score = models.FloatField(default=0)
    
    # Generated report
    completion_report = models.FileField(upload_to='completed_reports/', null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-completion_date']
        verbose_name = 'Completed Student'
        verbose_name_plural = 'Completed Students'
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.course} - {self.completion_type} - {self.completion_percentage}%"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def duration_days(self):
        if self.batch_start_date and self.completion_date:
            delta = self.completion_date.date() - self.batch_start_date
            return delta.days
        return 0


class ReassignedStudentRecord(models.Model):
    """Immutable snapshot of a student's trainer progress at reassignment time."""

    completion_request = models.OneToOneField(
        'SessionCompletionRequest',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reassignment_record'
    )
    student = models.ForeignKey(
        'Students',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reassignment_records'
    )
    previous_trainer = models.ForeignKey(
        'Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reassigned_from_records'
    )
    reassigned_trainer = models.ForeignKey(
        'Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reassigned_to_records'
    )
    source_batch = models.ForeignKey(
        'Batches',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reassigned_from_records'
    )
    target_batch = models.ForeignKey(
        'Batches',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reassigned_to_records'
    )

    student_name = models.CharField(max_length=220)
    student_code = models.CharField(max_length=50)
    course_name = models.CharField(max_length=255, blank=True)
    source_batch_number = models.CharField(max_length=80, blank=True)
    target_batch_number = models.CharField(max_length=80, blank=True)
    previous_trainer_name = models.CharField(max_length=220, blank=True)
    reassigned_trainer_name = models.CharField(max_length=220, blank=True)
    reassignment_reason = models.TextField(blank=True, null=True)
    reassigned_at = models.DateTimeField()

    total_sessions = models.IntegerField(default=0)
    completed_sessions = models.IntegerField(default=0)
    completion_percentage = models.FloatField(default=0)
    completed_session_details = models.JSONField(default=list, blank=True)

    attendance_total = models.IntegerField(default=0)
    present_days = models.IntegerField(default=0)
    absent_days = models.IntegerField(default=0)
    attendance_percentage = models.FloatField(default=0)
    attendance_summary = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reassigned_student_records'
        ordering = ['-reassigned_at']
        indexes = [
            models.Index(fields=['previous_trainer', 'reassigned_at']),
            models.Index(fields=['student', 'source_batch']),
        ]

    def __str__(self):
        return f"{self.student_name} reassigned from {self.previous_trainer_name} to {self.reassigned_trainer_name}"

class SessionCompletionRequest ( models.Model ) :
    """Trainer requests counselor to mark sessions as complete"""
    student = models.ForeignKey ( 'Students' , on_delete = models.CASCADE , related_name = 'completion_requests' )
    batch = models.ForeignKey ( 'Batches' , on_delete = models.CASCADE )
    trainer = models.ForeignKey ( 'Employee' , on_delete = models.CASCADE , related_name = 'sent_requests' )
    counselor = models.ForeignKey ( 'Employee' , on_delete = models.CASCADE , related_name = 'received_requests' )
    
    # Topics covered
    topics_covered = models.TextField ( help_text = "Topics covered by the trainer" )
    sessions_completed = models.IntegerField ( default = 0 )
    total_sessions = models.IntegerField ( default = 0 )
    
    # Message from trainer
    message = models.TextField ( blank = True , null = True )
    
    # Status
    STATUS_CHOICES = [
            ('pending' , 'Pending Review') ,
            ('approved' , 'Approved - Ready for Transfer') ,
            ('reassigned' , 'Reassigned to New Trainer') ,
            ('completed' , 'Moved to Completed List') ,
    ]
    status = models.CharField ( max_length = 20 , choices = STATUS_CHOICES , default = 'pending' )
    
    # Tracking
    created_at = models.DateTimeField ( auto_now_add = True )
    updated_at = models.DateTimeField ( auto_now = True )
    reviewed_at = models.DateTimeField ( null = True , blank = True )
    reviewed_by = models.ForeignKey (
            User , on_delete = models.SET_NULL , null = True , blank = True , related_name = 'reviewed_requests'
    )
    
    # For reassignment
    new_trainer = models.ForeignKey (
            'Employee' , on_delete = models.SET_NULL , null = True , blank = True , related_name = 'assigned_requests'
    )
    reassigned_at = models.DateTimeField ( null = True , blank = True )
    
    # Counselor notes
    counselor_notes = models.TextField ( blank = True , null = True )
    
    class Meta :
        ordering = [ '-created_at' ]
    
    def __str__ ( self ) :
        return f"{self.student} - {self.get_status_display ( )}"
    
    

class TrainerSessionReport ( models.Model ) :
    """Detailed report of sessions taught by trainer"""
    student = models.ForeignKey ( 'Students' , on_delete = models.CASCADE )
    trainer = models.ForeignKey ( 'Employee' , on_delete = models.CASCADE )
    batch = models.ForeignKey ( 'Batches' , on_delete = models.CASCADE )
    session = models.ForeignKey ( 'CourseSession' , on_delete = models.CASCADE )
    
    # Session details
    topics_covered = models.TextField ( )
    completed_date = models.DateField ( auto_now_add = True )
    trainer_notes = models.TextField ( blank = True , null = True )
    
    # Status
    is_verified = models.BooleanField ( default = False )
    verified_by = models.ForeignKey (
        'Employee' , on_delete = models.SET_NULL , null = True , blank = True , related_name = 'verified_sessions'
        )
    verified_at = models.DateTimeField ( null = True , blank = True )
    
    class Meta :
        ordering = [ '-completed_date' ]
        unique_together = [ 'student' , 'session' , 'trainer' ]
    
    def __str__ ( self ) :
        return f"{self.student} - {self.session.title}"


class FeePayment(models.Model):
    student = models.ForeignKey(Students, on_delete=models.CASCADE, related_name='fee_payments')
    batch = models.ForeignKey(Batches, on_delete=models.CASCADE, related_name='fee_payments')
    total_fee = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=10, decimal_places=2)
    is_fully_paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        from decimal import Decimal
        self.balance = Decimal(str(self.total_fee)) - Decimal(str(self.amount_paid))
        self.is_fully_paid = self.balance <= Decimal('0')
        super().save(*args, **kwargs)

class FeeTransaction(models.Model):
    fee_payment = models.ForeignKey(FeePayment, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_mode = models.CharField(max_length=50, choices=[
        ('cash', 'Cash'),
        ('upi', 'UPI'),
        ('bank_transfer', 'Bank Transfer'),
        ('cheque', 'Cheque'),
    ], default='cash')
    notes = models.TextField(blank=True)
    paid_at = models.DateTimeField(auto_now_add=True)
    collected_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    bill_generated = models.BooleanField(default=False)

    def __str__(self):
        return f"₹{self.amount} - {self.fee_payment.student.first_name}"
    


class FeePaymentRequest(models.Model):
    student = models.ForeignKey(Students, on_delete=models.CASCADE, related_name='payment_requests')
    fee_payment = models.ForeignKey(FeePayment, on_delete=models.CASCADE, related_name='requests')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_mode = models.CharField(max_length=50, default='cash')
    notes = models.TextField(blank=True)
    screenshot = models.ImageField(upload_to='fee_screenshots/', null=True, blank=True)  # ← ADD
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ], default='pending')
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    def __str__(self):
        return f"{self.student.first_name} - ₹{self.amount} ({self.status})"
    

class CounselorAnnouncement(models.Model):
    ANNOUNCEMENT_TYPES = [
        ('general',   'General Announcement'),
        ('important', 'Important Notice'),
        ('holiday',   'Holiday Notice'),
        ('event',     'Event Announcement'),
        ('exam',      'Exam Schedule'),
        ('course',    'Course Related'),
        ('update',    'Update'),
    ]
    RECIPIENT_TYPES = [
        ('all',              'All — Students & Mentors'),
        ('students',         'All Students'),
        ('mentors',          'All Mentors'),
        ('specific_batch',   'Specific Batch'),
        ('specific_student', 'Specific Student'),
    ]

    title             = models.CharField(max_length=200)
    message           = models.TextField()
    announcement_type = models.CharField(max_length=20, choices=ANNOUNCEMENT_TYPES, default='general')
    recipient_type    = models.CharField(max_length=20, choices=RECIPIENT_TYPES, default='all')
    branch            = models.CharField(max_length=100)
    is_published      = models.BooleanField(default=True)
    is_important      = models.BooleanField(default=False)
    allow_comments    = models.BooleanField(default=False)
    published_at      = models.DateTimeField(null=True, blank=True)
    views_count       = models.PositiveIntegerField(default=0)
    created_by        = models.ForeignKey(User, on_delete=models.CASCADE, related_name='counselor_announcements_created')

    # Specific targeting
    specific_batch    = models.ForeignKey(
        'Batches', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='counselor_announcements'
    )
    specific_students = models.ManyToManyField(
        'Students',
        through='CounselorAnnouncementSpecificStudent',
        through_fields=('announcement', 'student'),
        blank=True,
        related_name='counselor_specific_announcements'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.title} [{self.branch}]'

    class Meta:
        db_table = 'counselor_announcement'
        ordering = ['-created_at']


class CounselorAnnouncementSpecificStudent(models.Model):
    announcement = models.ForeignKey(
        CounselorAnnouncement,
        on_delete=models.CASCADE,
        db_column='announcement_id',
    )
    student = models.ForeignKey(
        Students,
        on_delete=models.CASCADE,
        db_column='students_id',
    )

    class Meta:
        db_table = 'counselor_announcement_specific_students'
        managed = False


class CourseType(models.Model):
    """Dynamic course types manageable by admin."""
    name       = models.CharField(max_length=100, unique=True)
    value      = models.CharField(max_length=100, unique=True)  # slug e.g. 'software'
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
 
    def __str__(self):
        return self.name
 
    class Meta:
        db_table = 'course_type'
        ordering = ['name']


class GalleryItem(models.Model):
    """Event photo uploaded by admin for the gallery."""
    title = models.CharField(max_length=200)
    image = models.ImageField(
        upload_to='gallery/',
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])]
    )
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'gallery_items'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class VlogItem(models.Model):
    """Video uploaded by admin for vlogs."""
    title = models.CharField(max_length=200)
    video = models.FileField(
        upload_to='vlogs/',
        validators=[FileExtensionValidator(allowed_extensions=['mp4', 'mov', 'webm', 'mkv'])]
    )
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'vlog_items'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class NewsItem(models.Model):
    """News update shown in the public mobile news feed."""
    title = models.CharField(max_length=200)
    message = models.TextField()
    image = models.ImageField(
        upload_to='news/',
        blank=True,
        null=True,
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'webp'])]
    )
    image_url = models.URLField(max_length=1000, blank=True, default='')
    source = models.CharField(max_length=150, blank=True, default='')
    published_at = models.DateTimeField(null=True, blank=True)
    original_url = models.URLField(max_length=1000, blank=True, default='')
    rss_guid = models.CharField(max_length=500, blank=True, default='')
    content_hash = models.CharField(max_length=64, blank=True, default='')
    category = models.CharField(max_length=50, blank=True, default='Technology')
    news_type = models.CharField(max_length=20, blank=True, default='manual')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'news_items'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class CalendarEvent(models.Model):
    """Upcoming event posted by admin for the mobile calendar."""
    event_name = models.CharField(max_length=200)
    event_date = models.DateField()
    event_time = models.TimeField()
    message = models.TextField()
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'calendar_events'
        ordering = ['event_date', 'event_time', '-created_at']

    def __str__(self):
        return f"{self.event_name} - {self.event_date}"


class Referral(models.Model):
    """Referral submitted from the public mobile app."""
    name = models.CharField(max_length=120)
    mobile = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'referrals'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.mobile}"
