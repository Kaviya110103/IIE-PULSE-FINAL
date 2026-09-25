import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const S = {
  sidebar: {
    width: 250, background: '#1a2035', minHeight: '100vh',
    display: 'flex', flexDirection: 'column', position: 'fixed',
    top: 0, left: 0, height: '100vh', overflowY: 'auto', zIndex: 100,
    fontFamily: "'Public Sans', sans-serif",
  },
  logoBox: {
    padding: '14px 16px', background: '#fff',
    display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
    borderBottom: '3px solid #1572e8',
  },
  logoText: { fontWeight: 800, fontSize: 16, color: '#1a2035', lineHeight: 1.1 },
  logoSub: { fontSize: 10, color: '#888', marginTop: 2 },
  userBox: {
    padding: '10px 16px', background: 'rgba(255,255,255,.05)',
    borderBottom: '1px solid rgba(255,255,255,.07)', flexShrink: 0,
  },
  userName: { color: '#fff', fontWeight: 600, fontSize: 13 },
  userRole: { color: 'rgba(255,255,255,.4)', fontSize: 11, textTransform: 'capitalize' },
  sectionLabel: {
    padding: '14px 16px 4px', fontSize: 10, fontWeight: 700,
    color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.12em',
  },
  navLink: (active) => ({
    display: 'flex', alignItems: 'center', gap: 11, padding: '9px 16px',
    color: active ? '#fff' : 'rgba(255,255,255,.65)',
    textDecoration: 'none', fontSize: 13.5, fontWeight: active ? 600 : 400,
    background: active ? 'rgba(21,114,232,.25)' : 'transparent',
    borderLeft: active ? '3px solid #1572e8' : '3px solid transparent',
    transition: 'all .15s', cursor: 'pointer',
  }),
  groupHeader: (open) => ({
    display: 'flex', alignItems: 'center', gap: 11, padding: '9px 16px',
    color: open ? '#fff' : 'rgba(255,255,255,.65)',
    cursor: 'pointer', fontSize: 13.5, fontWeight: open ? 600 : 400,
    background: open ? 'rgba(21,114,232,.15)' : 'transparent',
    borderLeft: open ? '3px solid #1572e8' : '3px solid transparent',
    transition: 'all .15s', userSelect: 'none',
  }),
  subItem: (active) => ({
    display: 'block', padding: '7px 16px 7px 46px', fontSize: 13,
    color: active ? '#fff' : 'rgba(255,255,255,.55)',
    textDecoration: 'none', fontWeight: active ? 600 : 400,
    background: active ? 'rgba(21,114,232,.2)' : 'transparent',
    borderLeft: active ? '3px solid #1572e8' : '3px solid transparent',
    transition: 'all .15s',
  }),
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px',
    width: '100%', background: 'none', border: 'none',
    color: 'rgba(255,255,255,.55)', cursor: 'pointer', fontSize: 13.5,
    borderTop: '1px solid rgba(255,255,255,.07)', marginTop: 'auto',
  },
}

function Icon({ name }) {
  return <i className={`fas ${name}`} style={{ width: 18, textAlign: 'center', fontSize: 14 }} />
}

function NavItem({ to, icon, label }) {
  return (
    <NavLink to={to} end={to.split('/').filter(Boolean).length <= 1}
      style={({ isActive }) => S.navLink(isActive)}>
      <Icon name={icon} />
      <span>{label}</span>
    </NavLink>
  )
}

function NavGroup({ icon, label, children }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div style={S.groupHeader(open)} onClick={() => setOpen(o => !o)}>
        <Icon name={icon} />
        <span style={{ flex: 1 }}>{label}</span>
        <i className="fas fa-chevron-right" style={{
          fontSize: 10, transition: 'transform .2s',
          transform: open ? 'rotate(90deg)' : 'none',
          color: 'rgba(255,255,255,.35)'
        }} />
      </div>
      {open && <div style={{ background: 'rgba(0,0,0,.15)' }}>{children}</div>}
    </>
  )
}

function SubLink({ to, label }) {
  return (
    <NavLink to={to} style={({ isActive }) => S.subItem(isActive)}>
      {label}
    </NavLink>
  )
}

function SectionLabel({ label }) {
  return <div style={S.sectionLabel}>{label}</div>
}

// ── ADMIN NAV ──────────────────────────────────────────────────────────────
function AdminNav() {
  return (
    <>
      <NavItem to="/admin" icon="fa-home" label="Dashboard" />
      <SectionLabel label="Components" />
      <NavGroup icon="fa-plus-square" label="Add">
        <SubLink to="/admin/course-types" label="Course Types" />
        <SubLink to="/admin/courses/add" label="Add Course" />
        <SubLink to="/admin/employees/add" label="Add Employee" />
      </NavGroup>
      <NavGroup icon="fa-user-graduate" label="Students">
        <SubLink to="/admin/students" label="View Students" />
        {/* <SubLink to="/admin/assigned" label="View Assigned Students" /> */}
      </NavGroup>
      <NavGroup icon="fa-users" label="Batches">
        <SubLink to="/admin/batches" label="View Batches" />
      </NavGroup>
      <NavItem to="/admin/announcements" icon="fa-bullhorn" label="Announcements" />
      <NavGroup icon="fa-comments" label="Support">
        <SubLink to="/admin/staff-support" label="Mentor Support Request" />
        <SubLink to="/admin/staff-support-history" label="Mentor Support History" />
        <SubLink to="/admin/counselor-support" label="Counselor Support Request" />
        <SubLink to="/admin/counselor-support-history" label="Counselor Support History" />
        <SubLink to="/admin/student-support" label="Student Support Request" />
        <SubLink to="/admin/student-support-history" label="Student Support History" />
      </NavGroup>
      <NavGroup icon="fa-calendar-check" label="Leave Request">
        <SubLink to="/admin/staff-leave" label="Mentor Leave Request" />
        <SubLink to="/admin/staff-leave-history" label="Mentor Leave History" />
        <SubLink to="/admin/counselor-leave" label="Counsellor Leave Request" />
        <SubLink to="/admin/counselor-leave-history" label="Counsellor Leave History" />
      </NavGroup>
      <NavGroup icon="fa-user-check" label="Over All Branch Details">
        <SubLink to="/admin/attendance" label="Branch Wise Students Details" />
      </NavGroup>
      <NavGroup icon="fa-book-open" label="Materials">
        <SubLink to="/admin/materials" label="View Materials" />
      </NavGroup>
      <NavGroup icon="fa-pencil-alt" label="Quiz Management">
        <SubLink to="/admin/quiz/upload" label="Upload Quiz" />
        <SubLink to="/admin/quiz" label="Manage Quizzes" />
        <SubLink to="/admin/quiz-results" label="Quiz Results" />
      </NavGroup>
      <NavGroup icon="fa-user-clock" label="User Monitoring">
        <SubLink to="/admin/monitoring/employees" label="Employee Monitoring" />
        <SubLink to="/admin/monitoring/students" label="Student Monitoring" />
        <SubLink to="/admin/employee-tracking" label="Employee Tracking" />
      </NavGroup>
      <NavItem to="/admin/gallery" icon="fa-images" label="Gallery" />
      <NavItem to="/admin/vlogs" icon="fa-video" label="Vlogs" />
      <NavItem to="/admin/news" icon="fa-newspaper" label="News" />
      <NavItem to="/admin/calendar" icon="fa-calendar-alt" label="Calendar" />
      <NavItem to="/admin/referrals" icon="fa-user-plus" label="Referrals" />
      <NavItem to="/admin/public-users" icon="fa-users-viewfinder" label="Public Users" />
      <NavItem to="/admin/completed" icon="fa-graduation-cap" label="Completed Students" />
      <NavItem to="/admin/fees" icon="fa-rupee-sign" label="Fee Management" />  {/* ← ADD */}

    </>
  )
}

// ── COUNSELOR NAV ──────────────────────────────────────────────────────────
function CounselorNav() {
  return (
    <>
      <NavItem to="/counselor" icon="fa-home" label="Dashboard" />
      <SectionLabel label="Components" />
      <NavGroup icon="fa-plus-square" label="Add">
        <SubLink to="/counselor/course-types" label="Course Types" />
        <SubLink to="/counselor/courses/add" label="Add Course" />
        <SubLink to="/counselor/add-batch" label="Add Batch" />
        <SubLink to="/counselor/add-student" label="Add Student" />
      </NavGroup>
      <NavGroup icon="fa-user-graduate" label="Students">
        {/* <SubLink to="/counselor/students" label="View Students" /> */}
        <SubLink to="/counselor/assigned-students" label="View Assigned Students" />
      </NavGroup>
      <NavItem to="/counselor/fees" icon="fa-rupee-sign" label="Fee Records" />
      {/* <NavItem to="/counselor/fees" icon="fa-rupee-sign" label="Fee Records" /> */}

      {/* <NavGroup icon="fa-users" label="Batches">
        <SubLink to="/counselor/batches" label="View Batches" />
      </NavGroup> */}
      <NavGroup icon="fa-user-check" label="Over All Branch Details">
        <SubLink to="/counselor/students" label="Branch Wise Students Details" />
      </NavGroup>
      <NavItem to="/counselor/admin-announcements" icon="fa-bullhorn" label="Admin Announcements" />
      <NavItem to="/counselor/announcements" icon="fa-pen-nib" label="My Announcements" />
      <NavGroup icon="fa-calendar-check" label="Leave Request">
        <SubLink to="/counselor/leave/apply" label="Apply Leave" />
        {/* <SubLink to="/counselor/leave" label="Leave Status" /> */}
      </NavGroup>
      <NavGroup icon="fa-headset" label="Support Request">
        <SubLink to="/counselor/support/new" label="Support Request" />
        {/* <SubLink to="/counselor/support" label="Support Request Status" /> */}
      </NavGroup>
      <NavGroup icon="fa-clipboard-check" label="Completion Requests">
        <SubLink to="/counselor/pending" label="Pending Requests" />
        <SubLink to="/counselor/approved" label="Processed History" />
      </NavGroup>
      {/* ADD THIS - Completed Students Menu Item */}
      <NavItem to="/counselor/completed-students" icon="fa-graduation-cap" label="Completed Students" />

    </>
  )
}

// ── EMPLOYEE NAV ───────────────────────────────────────────────────────────
function EmployeeNav() {
  return (
    <>
      <NavItem to="/employee" icon="fa-home" label="Dashboard" />
      <SectionLabel label="My Activities" />
      <NavGroup icon="fa-user-graduate" label="My Students">
        <SubLink to="/employee/students" label="View Students" />
        <SubLink to="/employee/reassigned-students" label="Reassigned Students" />
        <SubLink to="/employee/attendance" label="Attendance" />
      </NavGroup>
      <NavGroup icon="fa-users" label="My Batches">
        <SubLink to="/employee/batches" label="View Batches" />
      </NavGroup>
      <NavItem to="/employee/doubts" icon="fa-question-circle" label="Student Doubts" />
      <NavItem to="/employee/trainer-announcements" icon="fa-paper-plane" label="My Announcements" />
      <NavItem to="/employee/announcements" icon="fa-bullhorn" label="Admin Announcements" />
      <NavItem to="/employee/branch-announcements" icon="fa-map-marker-alt" label="Branch Announcements" />
      <NavItem to="/employee/monitoring/students" icon="fa-user-clock" label="Student Login Records" />

      <NavGroup icon="fa-book" label="Materials">
        <SubLink to="/employee/materials/upload" label="Upload Materials" />
        <SubLink to="/employee/material-library" label="Material Library" />
        {/* <SubLink to="/employee/materials" label="View Materials" /> */}
      </NavGroup>
      <NavGroup icon="fa-pencil-alt" label="Technical Tests">
        <SubLink to="/employee/tests/create" label="Create Technical Test" />
        <SubLink to="/employee/tests" label="Manage Technical Tests" />
        <SubLink to="/employee/test-results" label="Test Results" />
      </NavGroup>
      <NavGroup icon="fa-pencil-alt" label="Quizzes">
        <SubLink to="/employee/quiz/upload" label="Upload Quiz" />
        <SubLink to="/employee/quiz" label="Manage Quizzes" />
        <SubLink to="/employee/quiz-results" label="Quiz Results" />
      </NavGroup>
      <NavGroup icon="fa-calendar-alt" label="Leave Management">
        <SubLink to="/employee/student-leave/pending" label="Student Leave Requests" />
        {/* <SubLink to="/employee/student-leave/history" label="Student Leave History" /> */}
        <SubLink to="/employee/leave/apply" label="Apply Leave" />
        {/* <SubLink to="/employee/leave/history" label="My Leave History" /> */}
      </NavGroup>
      <NavGroup icon="fa-headset" label="Support Request">
        <SubLink to="/employee/support/new" label="Support Request" />
        {/* <SubLink to="/employee/support" label="Support Request Status" /> */}
      </NavGroup>
      <NavItem to="/employee/completed" icon="fa-graduation-cap" label="My Graduates" />
    </>
  )
}

// ── STUDENT NAV ────────────────────────────────────────────────────────────
function StudentNav() {
  return (
    <>
      <NavItem to="/student" icon="fa-home" label="Dashboard" />
      <SectionLabel label="My Learning" />
      <NavItem to="/student/announcements" icon="fa-bullhorn" label="Announcements" />
      <NavItem to="/student/attendance" icon="fa-user-check" label="Attendance" />
      <NavItem to="/student/batches" icon="fa-layer-group" label="My Batches" />
      <NavItem to="/student/challenge" icon="fa-bolt" label="15-Day Challenge" />
      <NavGroup icon="fa-flask" label="Tests & Quizzes">
        <SubLink to="/student/tests" label="Upcoming Tests" />
        <SubLink to="/student/quiz" label="Excel Quizzes" />
      </NavGroup>
      <NavItem to="/student/materials" icon="fa-book" label="Study Materials" />
      <NavGroup icon="fa-calendar-plus" label="Leave Request">
        <SubLink to="/student/leave/apply" label="Apply Leave" />
        {/* <SubLink to="/student/leave" label="Leave History" /> */}
      </NavGroup>
      <NavGroup icon="fa-headset" label="Support Request">
        <SubLink to="/student/support/new" label="Support Request" />
        {/* <SubLink to="/student/support" label="Support Request Status" /> */}
      </NavGroup>
      <NavItem to="/student/fee" icon="fa-rupee-sign" label="Fee Details" />
    </>
  )
}

// ── MAIN EXPORT ────────────────────────────────────────────────────────────
export default function Sidebar({ role }) {
  const { user, logout } = useAuth()

  const navMap = { admin: AdminNav, counselor: CounselorNav, employee: EmployeeNav, student: StudentNav }
  const Nav = navMap[role] || AdminNav

  const roleIcon = { admin: 'fa-user-shield', counselor: 'fa-user-tie', employee: 'fa-chalkboard-teacher', student: 'fa-user-graduate' }

  return (
    <div style={S.sidebar}>
      {/* Logo */}
      <div style={S.logoBox}>
        <div style={{
          width: 38, height: 38, borderRadius: 8, background: '#1572e8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', flexShrink: 0,
        }}>
          <i className={`fas ${roleIcon[role] || 'fa-user'}`} style={{ fontSize: 16 }} />
        </div>
        <div>
          <div style={S.logoText}>IIE Pulse</div>
          <div style={S.logoSub}>Indra Institute of Education</div>
        </div>
      </div>

      {/* User info */}
      <div style={S.userBox}>
        <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.35)', marginBottom: 2 }}>Welcome,</div>
        <div style={S.userName}>{user?.name || user?.username}</div>
        <div style={S.userRole}>{role === 'employee' ? (user?.designation || 'Employee') : role}</div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, paddingBottom: 8 }}>
        <Nav />
      </nav>

      {/* Logout */}
      <button style={S.logoutBtn} onClick={logout}
        onMouseEnter={e => e.currentTarget.style.color = '#ff6b6b'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.55)'}
      >
        <Icon name="fa-sign-out-alt" />
        <span>Logout</span>
      </button>
    </div>
  )
}
