import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ArrowRight, LogOut, ShieldCheck } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/auth/Login'
import logo from './assets/IIE.png'
import UserNotifications from './pages/common/UserNotifications'
import './styles/global.css'

// ── Admin ──────────────────────────────────────────────────────────────────
import { StudentsList, EmployeesList, CoursesList, BatchesList, AdminCourseTypes } from './pages/admin/Lists'
import {
  AdminDashboard, AdminBranchAttendance, AdminMaterialsOverview,
  AdminSupportRequests, CompletedStudents, AdminAssignedStudents, ViewMentors,
  QuizResults, StaffDoubts, AdminTestResults,
  AdminMentorLeaveRequest, AdminMentorLeaveHistory,
  AdminCounselorLeaveRequest, AdminCounselorLeaveHistory,
  AdminMentorSupportRequest, AdminMentorSupportHistory,
  AdminCounselorSupportRequest, AdminCounselorSupportHistory,
  AdminStudentSupportRequest, AdminStudentSupportHistory, AdminAnnouncements, AdminFeeManagement,
  AdminCalendar, AdminGallery, AdminNews, AdminReferrals, AdminVlogs,
  AdminEmployeeMonitoring, AdminStudentMonitoring, AdminEmployeeTracking, AdminPublicUsers,
} from './pages/admin/AdminPages'

// ── Employee ───────────────────────────────────────────────────────────────
import {
  EmployeeDashboard, ViewBatches, MarkAttendance, AttendanceHistoryPage,
  StudyMaterials, MaterialLibrary, StaffLeaveApply, CounselorLeaveApply, StaffSupportRequest,
  CounselorSupportRequest, StudentLeaveRequests, StaffCompletedStudents,
  StaffAnnouncements, TrainerAnnouncements, BranchAnnouncements, StaffDoubts as EmployeeDoubts, ViewStudents,
  StaffStudentLeaveRequests, StaffOwnLeaveHistory,
  CreateTest, ViewTests, TestResults, AddQuestions,
  UploadQuiz, ManageQuizzes, StaffQuizResults, MentorStudentMonitoring, ReassignedStudents
} from './pages/employee/EmployeePages'

// ── Counselor ──────────────────────────────────────────────────────────────
import {
  CounselorDashboard, CounselorStudents, CounselorPendingRequests,
  CounselorApprovedRequests, CounselorCompletedStudents, CounselorAssignedStudents, CounselorFeeManagement,
  CounselorAnnouncements,
} from './pages/counselor/CounselorPages'

// ── Student ────────────────────────────────────────────────────────────────
import {
  StudentDashboard, StudentAnnouncements, StudentAttendance, StudentBatches, StudentSessions, StudentNotifications,
  StudentQuizList, StudentTests, StudentLeave, StudentMaterials, StudentSupport, StudentFeeDetails,
  StudentChallenge, StudentLoginRatingHistory,
} from './pages/student/StudentPages'

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  const role = (user.user_type === 'employee' && user.designation === 'counselor') ? 'counselor' : user.user_type
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/" replace />
  return children
}

function getDashboardPath(user) {
  if (user?.user_type === 'admin') return '/admin'
  if (user?.user_type === 'student') return '/student'
  if (user?.designation === 'counselor') return '/counselor'
  return '/employee'
}

function DashboardLanding() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const path = getDashboardPath(user)
  const role =
    user?.user_type === 'employee'
      ? user?.designation || 'Employee'
      : user?.user_type || 'User'

  if (user?.user_type !== 'student') {
    return <Navigate to={path} replace />
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      background: '#f1f5f9',
      fontFamily: "'Public Sans', sans-serif",
    }}>
      <div style={{
        width: '100%',
        maxWidth: 920,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.05fr) minmax(300px, .95fr)',
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        boxShadow: '0 18px 50px rgba(15, 23, 42, .12)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: 36, background: '#0f1b2d', color: '#fff' }}>
          <div style={{ width: 128, padding: 10, background: '#fff', borderRadius: 8, marginBottom: 28 }}>
            <img src={logo} alt="IIE" style={{ width: '100%', display: 'block' }} />
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 11px', borderRadius: 999, background: 'rgba(244,169,64,.14)', color: '#fcd17a', fontSize: 12, fontWeight: 700, marginBottom: 18 }}>
            <ShieldCheck size={15} /> Session verified
          </div>
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.12, fontFamily: 'Georgia, serif' }}>Welcome back to IIE Pulse</h1>
          <p style={{ margin: '14px 0 0', color: 'rgba(255,255,255,.68)', fontSize: 14, lineHeight: 1.7, maxWidth: 420 }}>
            Your session is active. Continue to your workspace to manage classes, records, and daily activity.
          </p>
        </div>

        <div style={{ padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Signed in as</div>
          <h2 style={{ margin: '8px 0 4px', color: '#0f1b2d', fontSize: 26 }}>{user?.name || user?.username || 'User'}</h2>
          <div style={{ color: '#64748b', fontSize: 14, textTransform: 'capitalize' }}>{role}</div>

          <button
            type="button"
            onClick={() => navigate(path)}
            style={{
              marginTop: 28,
              width: '100%',
              minHeight: 48,
              border: 'none',
              borderRadius: 8,
              background: '#1572e8',
              color: '#fff',
              fontWeight: 800,
              fontSize: 14,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
            }}
          >
            Go to Dashboard <ArrowRight size={18} />
          </button>
          <button
            type="button"
            onClick={logout}
            style={{
              marginTop: 12,
              width: '100%',
              minHeight: 44,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#fff',
              color: '#64748b',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#5523D2' }}>
        Loading...
      </div>
    )
  }

  if (!user) return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
  return (
    <Routes>
      <Route path="/" element={user.user_type === 'student' ? <DashboardLanding /> : <Navigate to={getDashboardPath(user)} replace />} />
      <Route path="/dashboard" element={<DashboardLanding />} />

      {/* ── ADMIN ─────────────────────────────────────────────────── */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout role="admin" /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="courses/add" element={<CoursesList />} />
        <Route path="course-types" element={<AdminCourseTypes />} />
        <Route path="employees/add" element={<EmployeesList />} />
        <Route path="courses" element={<CoursesList />} />
        <Route path="employees" element={<EmployeesList />} />
        <Route path="mentors" element={<ViewMentors />} />
        <Route path="students" element={<StudentsList adminView />} />
        <Route path="assigned" element={<AdminAssignedStudents />} />
        <Route path="batches" element={<BatchesList />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="gallery" element={<AdminGallery />} />
        <Route path="vlogs" element={<AdminVlogs />} />
        <Route path="news" element={<AdminNews />} />
        <Route path="calendar" element={<AdminCalendar />} />
        <Route path="referrals" element={<AdminReferrals />} />
        <Route path="public-users" element={<AdminPublicUsers />} />
        <Route path="fees" element={<AdminFeeManagement />} />   {/* ← ADD inside /admin routes */}

        <Route path="monitoring/employees" element={<AdminEmployeeMonitoring />} />
        <Route path="monitoring/students" element={<AdminStudentMonitoring />} />
        <Route path="employee-tracking" element={<AdminEmployeeTracking />} />

        {/* Support pages - USING ADMIN VERSIONS */}
        <Route path="staff-support" element={<AdminMentorSupportRequest />} />
        <Route path="staff-support-history" element={<AdminMentorSupportHistory />} />
        <Route path="counselor-support" element={<AdminCounselorSupportRequest />} />
        <Route path="counselor-support-history" element={<AdminCounselorSupportHistory />} />
        <Route path="student-support" element={<AdminStudentSupportRequest />} />
        <Route path="student-support-history" element={<AdminStudentSupportHistory />} />

        {/* Leave pages */}
        <Route path="staff-leave" element={<AdminMentorLeaveRequest />} />
        <Route path="staff-leave-history" element={<AdminMentorLeaveHistory />} />
        <Route path="counselor-leave" element={<AdminCounselorLeaveRequest />} />
        <Route path="counselor-leave-history" element={<AdminCounselorLeaveHistory />} />

        <Route path="attendance" element={<AdminBranchAttendance />} />
        <Route path="materials" element={<AdminMaterialsOverview />} />
        <Route path="test-results" element={<AdminTestResults />} />
        <Route path="quiz/upload" element={<UploadQuiz />} />
        <Route path="quiz" element={<ManageQuizzes />} />
        <Route path="quiz-results" element={<QuizResults />} />
        <Route path="completed" element={<CompletedStudents />} />
        <Route path="notifications" element={<UserNotifications />} />
      </Route>

      {/* ── EMPLOYEE ──────────────────────────────────────────────── */}
      {/* ── EMPLOYEE ──────────────────────────────────────────────── */}
      <Route path="/employee" element={<ProtectedRoute allowedRoles={['employee']}><AppLayout role="employee" /></ProtectedRoute>}>
        <Route index element={<EmployeeDashboard />} />
        <Route path="students" element={<ViewStudents />} />
        <Route path="reassigned-students" element={<ReassignedStudents />} />
        <Route path="attendance" element={<MarkAttendance />} />
        <Route path="attendance-history" element={<AttendanceHistoryPage />} />
        <Route path="batches" element={<ViewBatches />} />
        <Route path="doubts" element={<EmployeeDoubts />} />
        <Route path="announcements" element={<StaffAnnouncements />} />
        <Route path="trainer-announcements" element={<TrainerAnnouncements />} />
        <Route path="branch-announcements" element={<BranchAnnouncements />} />
        <Route path="monitoring/students" element={<MentorStudentMonitoring />} />

        {/* Leave Management Routes */}
        <Route path="student-leave/pending" element={<StaffStudentLeaveRequests />} />
        <Route path="student-leave/history" element={<StaffStudentLeaveRequests />} />
        <Route path="leave/history" element={<StaffOwnLeaveHistory />} />
        <Route path="leave" element={<StaffLeaveApply />} />
        <Route path="leave/apply" element={<StaffLeaveApply />} />

        <Route path="materials" element={<StudyMaterials />} />
        <Route path="materials/upload" element={<StudyMaterials />} />
        <Route path="material-library" element={<MaterialLibrary />} />

        {/* Test Routes */}
        <Route path="tests/create" element={<CreateTest />} />
        <Route path="tests/:testId/add-questions" element={<AddQuestions />} />
        <Route path="tests" element={<ViewTests />} />
        <Route path="test-results" element={<TestResults />} />

        {/* Quiz Routes - FIXED: Use StaffQuizResults for employee */}
        <Route path="quiz/upload" element={<UploadQuiz />} />
        <Route path="quiz" element={<ManageQuizzes />} />
        <Route path="quiz-results" element={<StaffQuizResults />} />  {/* ← Changed from QuizResults */}

        <Route path="support" element={<StaffSupportRequest />} />
        <Route path="support/new" element={<StaffSupportRequest />} />
        <Route path="completed" element={<StaffCompletedStudents />} />
        <Route path="notifications" element={<UserNotifications />} />
      </Route>

      {/* ── COUNSELOR ─────────────────────────────────────────────── */}
      {/* ── COUNSELOR ─────────────────────────────────────────────── */}
      <Route path="/counselor" element={<ProtectedRoute allowedRoles={['counselor', 'employee']}><AppLayout role="counselor" /></ProtectedRoute>}>
        <Route index element={<CounselorDashboard />} />
        <Route path="course-types" element={<AdminCourseTypes />} />
        <Route path="courses/add" element={<CoursesList />} />
        <Route path="courses" element={<CoursesList />} />
        <Route path="add-batch" element={<BatchesList />} />
        <Route path="add-student" element={<StudentsList adminView />} />
        <Route path="students" element={<CounselorStudents />} />
        <Route path="/counselor/assigned-students" element={<CounselorAssignedStudents />} />
        <Route path="batches" element={<BatchesList staffView />} />
        <Route path="announcements" element={<CounselorAnnouncements />} />
        <Route path="admin-announcements" element={<StaffAnnouncements />} />
        <Route path="fees" element={<CounselorFeeManagement />} />
        <Route path="leave" element={<CounselorLeaveApply />} />
        <Route path="leave/apply" element={<CounselorLeaveApply />} />
        <Route path="support" element={<CounselorSupportRequest />} />
        <Route path="support/new" element={<CounselorSupportRequest />} />
        <Route path="pending" element={<CounselorPendingRequests />} />
        <Route path="approved" element={<CounselorApprovedRequests />} />
        <Route path="completed-students" element={<CounselorCompletedStudents />} />
        <Route path="notifications" element={<UserNotifications />} />
      </Route>

      {/* ── STUDENT ───────────────────────────────────────────────── */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><AppLayout role="student" /></ProtectedRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="announcements" element={<StudentAnnouncements />} />
        <Route path="branch-announcements" element={<BranchAnnouncements />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="batches" element={<StudentBatches />} />
        <Route path="sessions" element={<StudentSessions />} />
        <Route path="challenge" element={<StudentChallenge />} />
        <Route path="login-rating-history" element={<StudentLoginRatingHistory />} />

        {/* Test Routes - Fixed: Different paths for different features */}
        <Route path="tests" element={<StudentTests />} />        {/* For assigned tests */}
        <Route path="quiz" element={<StudentQuizList />} />      {/* For Excel quizzes */}

        <Route path="materials" element={<StudentMaterials />} />
        <Route path="leave" element={<StudentLeave />} />
        <Route path="leave/apply" element={<StudentLeave />} />
        <Route path="support" element={<StudentSupport />} />
        <Route path="support/new" element={<StudentSupport />} />
        <Route path="notifications" element={<StudentNotifications />} />
        <Route path="fee" element={<StudentFeeDetails />} />


      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
