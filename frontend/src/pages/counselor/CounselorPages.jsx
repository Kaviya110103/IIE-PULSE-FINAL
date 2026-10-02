import { useState, useEffect, useCallback } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'  // ← ADD THIS LINE
import { useLocation, useNavigate } from 'react-router-dom'  // ← ADD THIS

// ── Design tokens (same as EmployeePages) ─────────────────────────────────────────
const T = {
  navy: '#0f1b2d',
  navyMid: '#1a2e4a',
  navyLight: '#243b55',
  amber: '#f4a940',
  amberLight: '#fcd17a',
  teal: '#2ec4b6',
  rose: '#e84855',
  sage: '#4caf81',
  slate: '#8099b3',
  slateLight: '#b8ccdf',
  white: '#f8fafc',
  border: 'rgba(15,27,45,0.08)',
  shadow: '0 4px 24px rgba(15,27,45,0.10)',
  shadowMd: '0 8px 40px rgba(15,27,45,0.14)',
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  .counselor-root { font-family: 'DM Sans', sans-serif; color: ${T.navy}; }
  .counselor-root h1, .counselor-root h2, .counselor-root h3, .counselor-root h4, .counselor-root h5 { font-family: 'Playfair Display', serif; }

  .counselor-card {
    background: #fff; border-radius: 16px;
    box-shadow: ${T.shadow}; border: 1px solid ${T.border}; overflow: hidden;
  }
  .counselor-card-header {
    padding: 16px 22px; border-bottom: 1px solid ${T.border};
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
  }
  .counselor-card-header h5 { margin: 0; font-family: 'Playfair Display'; font-size: 17px; font-weight: 600; }

  .counselor-page-header {
    margin-bottom: 24px; padding-bottom: 18px; border-bottom: 2px solid ${T.border};
    display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  }
  .counselor-page-header h3 {
    margin: 0 0 4px; font-size: 24px;
    background: linear-gradient(135deg,${T.navy},${T.navyLight});
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .counselor-page-header p { margin: 0; color: ${T.slate}; font-size: 13.5px; }

  .counselor-table { width: 100%; border-collapse: collapse; }
  .counselor-table th {
    background: linear-gradient(135deg,${T.navy},${T.navyMid});
    color: white; font-size: 11px; font-weight: 600;
    letter-spacing: .7px; text-transform: uppercase;
    padding: 13px 14px; text-align: left; white-space: nowrap;
  }
  .counselor-table td {
    padding: 12px 14px; border-bottom: 1px solid ${T.border};
    font-size: 13.5px; color: ${T.navy};
  }
  .counselor-table tr:last-child td { border-bottom: none; }
  .counselor-table tr { transition: background .15s; }
  .counselor-table tr:hover td { background: rgba(244,169,64,.04); }

  .counselor-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 18px; border-radius: 10px; border: none;
    font-family: 'DM Sans'; font-weight: 600; font-size: 13px;
    cursor: pointer; transition: all .18s; white-space: nowrap;
  }
  .counselor-btn-primary { background: ${T.amber}; color: ${T.navy}; }
  .counselor-btn-primary:hover { background: ${T.amberLight}; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(244,169,64,.35); }
  .counselor-btn-ghost { background: transparent; color: ${T.slate}; border: 1.5px solid ${T.border}; }
  .counselor-btn-ghost:hover { background: ${T.white}; color: ${T.navy}; border-color: ${T.slateLight}; }
  .counselor-btn-danger { background: ${T.rose}; color: white; }
  .counselor-btn-danger:hover { filter: brightness(1.1); }
  .counselor-btn-teal { background: ${T.teal}; color: white; }
  .counselor-btn-teal:hover { filter: brightness(1.08); }
  .counselor-btn-success { background: ${T.sage}; color: white; }
  .counselor-btn-success:hover { filter: brightness(1.08); }
  .counselor-btn-sm { padding: 5px 12px; font-size: 12px; border-radius: 8px; }
  .counselor-btn-icon { padding: 7px 10px; border-radius: 8px; }

  .counselor-input {
    padding: 9px 13px; border: 1.5px solid ${T.border};
    border-radius: 10px; font-family: 'DM Sans'; font-size: 13px;
    outline: none; transition: border .18s, box-shadow .18s; background: ${T.white};
    width: 100%; box-sizing: border-box; color: ${T.navy};
  }
  .counselor-input:focus { border-color: ${T.amber}; box-shadow: 0 0 0 3px rgba(244,169,64,.15); }

  .counselor-select {
    padding: 9px 13px; border: 1.5px solid ${T.border};
    border-radius: 10px; font-family: 'DM Sans'; font-size: 13px;
    outline: none; transition: border .18s; background: ${T.white};
    width: 100%; box-sizing: border-box; color: ${T.navy};
    -webkit-appearance: none; appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238099b3' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px;
  }
  .counselor-select:focus { border-color: ${T.amber}; box-shadow: 0 0 0 3px rgba(244,169,64,.15); }

  .counselor-label { display: block; font-weight: 600; font-size: 13px; margin-bottom: 5px; color: ${T.navy}; }
  .counselor-fg { margin-bottom: 16px; }
  .counselor-hint { color: ${T.slate}; font-size: 11.5px; margin-top: 4px; display: block; }
  .counselor-req { color: ${T.rose}; margin-left: 3px; }

  /* Stat Grid */
  .counselor-stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 28px;
  }
  .counselor-stat-card {
    background: #fff;
    border-radius: 20px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    border: 1px solid ${T.border};
    transition: all 0.2s ease;
    box-shadow: ${T.shadow};
  }
  .counselor-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: ${T.shadowMd};
  }
  .counselor-stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }
  .counselor-stat-value {
    font-size: 28px;
    font-weight: 700;
    color: ${T.navy};
    line-height: 1.2;
  }
  .counselor-stat-label {
    font-size: 13px;
    color: ${T.slate};
    font-weight: 500;
  }

  /* Modal */
  .counselor-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow-y: auto;
  }
  .counselor-modal {
    background: #fff;
    border-radius: 20px;
    width: 100%;
    max-height: 90vh;
    margin: 20px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }
  .counselor-modal-header {
    padding: 20px 28px;
    background: #fff;
    border-bottom: 1px solid ${T.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 20px 20px 0 0;
  }
  .counselor-modal-header h5 {
    margin: 0;
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 600;
    color: ${T.navy};
  }
  .counselor-modal-close {
    background: #f1f5f9;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    color: ${T.slate};
  }
  .counselor-modal-close:hover {
    background: #e2e8f0;
    color: ${T.navy};
  }
  .counselor-modal-body {
    padding: 28px;
    overflow-y: auto;
    flex: 1;
  }

  /* Badge */
  .counselor-badge {
    display: inline-flex; align-items: center; padding: 3px 10px;
    border-radius: 20px; font-size: 11.5px; font-weight: 600; white-space: nowrap; letter-spacing: .2px;
  }

  .counselor-avatar {
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; color: white; flex-shrink: 0; font-family: 'DM Sans';
  }

  .counselor-empty { padding: 60px; text-align: center; color: ${T.slate}; }
  .counselor-empty-icon { font-size: 48px; opacity: 0.2; margin-bottom: 16px; }

  .counselor-alert-info { background: #e4f2fd; border: none; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #1260a0; }
  .counselor-alert-success { background: #e8f8f0; border: none; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #1a6b3e; }
  .counselor-alert-warning { background: #fef5e4; border: none; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #8a5a00; }

  .counselor-divider { border: none; border-top: 1px solid ${T.border}; margin: 20px 0; }

  .counselor-row-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media(max-width:640px) { .counselor-row-grid-2 { grid-template-columns: 1fr; } }

  @keyframes counselorSpin { to { transform: rotate(360deg); } }
  .counselor-spin {
    width: 40px; height: 40px;
    border: 3px solid ${T.border};
    border-top-color: ${T.amber};
    border-radius: 50%;
    animation: counselorSpin 1s linear infinite;
    margin: 40px auto;
  }

  /* Stats mini cards */
  .counselor-stats-mini {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 24px;
  }
  .counselor-stats-mini-item {
    border-radius: 12px;
    padding: 12px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    min-width: 140px;
  }
`

// ── Shared components ─────────────────────────────────────────────────────────
function Styles() { return <style>{css}</style> }

const Spin = () => (
  <div style={{ padding: 56, textAlign: 'center' }}>
    <div className="counselor-spin" />
  </div>
)

const Empty = ({ msg = 'No data found.', icon = 'fa-inbox' }) => (
  <div className="counselor-empty">
    <div className="counselor-empty-icon"><i className={`fas ${icon}`} /></div>
    <p style={{ margin: 0, fontFamily: "'Playfair Display'", fontSize: 16 }}>{msg}</p>
  </div>
)

const gradients = [
  'linear-gradient(135deg,#f4a940,#e8843a)',
  'linear-gradient(135deg,#2ec4b6,#1a9e93)',
  'linear-gradient(135deg,#e84855,#c62d39)',
  'linear-gradient(135deg,#4caf81,#2d8a5e)',
  'linear-gradient(135deg,#667eea,#764ba2)',
]

const avatarGrad = (name = '') => gradients[(name.charCodeAt(0) || 0) % gradients.length]

function Avatar({ name = '', size = 34, radius = 9 }) {
  return (
    <div className="counselor-avatar" style={{ width: size, height: size, borderRadius: radius, background: avatarGrad(name), fontSize: size * 0.38 }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

function Badge({ text, variant = 'default' }) {
  const variants = {
    success: { bg: '#e8f8f0', color: '#1a6b3e' },
    danger: { bg: '#fdeaec', color: '#9b1c27' },
    warning: { bg: '#fef5e4', color: '#8a5a00' },
    info: { bg: '#e4f2fd', color: '#1260a0' },
    teal: { bg: '#e0f7f5', color: '#1a7a72' },
    primary: { bg: '#fef0d9', color: '#8a5a00' },
    approved: { bg: '#d1e7dd', color: '#0a3622' },
    pending: { bg: '#fff3cd', color: '#664d03' },
    reassigned: { bg: '#cfe2ff', color: '#084298' },
    default: { bg: '#f0f3f7', color: T.slate },
  }
  const s = variants[variant] || variants.default
  return <span className="counselor-badge" style={{ background: s.bg, color: s.color }}>{text}</span>
}

// Modal
function Modal({ open, onClose, title, children, size = 'lg' }) {
  if (!open) return null
  const maxW = { xl: 960, lg: 820, md: 600, sm: 460 }[size] || 820
  return (
    <div className="counselor-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="counselor-modal" style={{ maxWidth: maxW }}>
        <div className="counselor-modal-header">
          <h5>{title}</h5>
          <button className="counselor-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="counselor-modal-body">{children}</div>
      </div>
    </div>
  )
}

// Page header
function PH({ title, sub, btn }) {
  return (
    <div className="counselor-page-header">
      <div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>
      {btn}
    </div>
  )
}

// Section header
function SH({ title, count, actions }) {
  return (
    <div className="counselor-card-header">
      <h5>{title}{count != null && <span style={{ color: T.slate, fontWeight: 400, fontFamily: "'DM Sans'", fontSize: 14, marginLeft: 8 }}>({count})</span>}</h5>
      {actions}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COUNSELOR DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export function CounselorDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()  // ← ADD THIS

  useEffect(() => {
    api.get('/dashboard/counselor/').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="counselor-root"><Styles /><Spin /></div>

  const stats = [
    { label: 'Total Students', value: data?.student_count, icon: 'fa-users', color: T.navy, bgColor: 'rgba(15,27,45,0.1)', to: '/counselor/add-student' },
    { label: 'Total Batches', value: data?.batch_count, icon: 'fa-clipboard-list', color: T.teal, bgColor: 'rgba(46,196,182,0.1)', to: '/counselor/batches' },
    { label: 'Pending Requests', value: data?.pending_completion_requests, icon: 'fa-clock', color: T.amber, bgColor: 'rgba(244,169,64,0.1)', to: '/counselor/pending' },
    { label: 'Total Mentors', value: data?.mentor_count, icon: 'fa-chalkboard-user', color: T.sage, bgColor: 'rgba(76,175,129,0.1)', to: '/counselor/students' },
  ]

  return (
    <div className="counselor-root">
      <Styles />
      <PH
        title={`👋 Welcome, ${data?.counselor?.first_name || 'Counselor'}!`}
        sub={`Counselor — ${data?.counselor?.branch || 'Branch'} Branch`}
      />

      <div className="counselor-stat-grid">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="counselor-stat-card"
            onClick={() => stat.to && navigate(stat.to)}
            style={{
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: '1px solid transparent',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = `0 8px 24px ${stat.color}33`
              e.currentTarget.style.borderColor = stat.color
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = ''
              e.currentTarget.style.borderColor = 'transparent'
            }}
          >
            <div className="counselor-stat-icon" style={{ background: stat.bgColor, color: stat.color }}>
              <i className={`fas ${stat.icon}`} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="counselor-stat-value">{stat.value ?? 0}</div>
              <div className="counselor-stat-label">{stat.label}</div>
            </div>
            <i className="fas fa-arrow-right" style={{ color: stat.color, opacity: 0.4, fontSize: 12 }} />
          </div>
        ))}
      </div>

      {/* {data?.announcements?.length > 0 && (
        <div className="counselor-card">
          <SH title="📢 Recent Announcements" />
          <div style={{ padding: '0 22px 22px 22px' }}>
            {data.announcements.slice(0, 5).map((a, idx) => (
              <div key={a.id} style={{
                padding: '14px 0',
                borderBottom: idx < data.announcements.slice(0, 5).length - 1 ? `1px solid ${T.border}` : 'none'
              }}>
                <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14, color: T.navy }}>{a.title}</div>
                <p style={{ color: T.slate, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{a.message}</p>
                <div style={{ fontSize: 11, color: T.slateLight, marginTop: 8 }}>
                  <i className="far fa-calendar-alt" style={{ marginRight: 6 }} />
                  {new Date(a.created_at).toLocaleDateString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )} */}
    </div>
  )
}


export function CounselorStudents() {
  const { user } = useAuth()
  const location = useLocation()
  const deepLink = new URLSearchParams(location.search)
  const targetStaffId = deepLink.get('staff_id')
  const targetBatchId = deepLink.get('batch_id')
  const targetStudentId = deepLink.get('student_id')
  const targetTab = deepLink.get('tab') || 'overview'
  const [staffList, setStaffList] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [staffStudents, setStaffStudents] = useState([])
  const [staffBatches, setStaffBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('staff')
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [batchViewMode, setBatchViewMode] = useState('batches')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const counselorBranch = user?.branch

  const loadStaff = async () => {
    setLoading(true)
    try {
      const staffRes = await api.get(`/employees/?branch=${counselorBranch}`)
      const allStaff = staffRes.data.results || staffRes.data || []
      const mentorsAndTrainers = allStaff.filter(staff =>
        staff.designation?.toLowerCase() === 'mentor' ||
        staff.designation?.toLowerCase() === 'trainer'
      )
      const staffWithCounts = await Promise.all(
        mentorsAndTrainers.map(async (staff) => {
          try {
            const [studentsRes, batchesRes] = await Promise.all([
              api.get(`/students/?assigned_staff=${staff.id}`),
              api.get(`/batches/?faculty=${staff.id}`)
            ])
            const students = studentsRes.data.results || studentsRes.data || []
            const batches = batchesRes.data.results || batchesRes.data || []
            return { ...staff, student_count: students.length, batch_count: batches.length }
          } catch (err) {
            return { ...staff, student_count: 0, batch_count: 0 }
          }
        })
      )
      setStaffList(staffWithCounts)
      setViewMode('staff')
      if (targetStaffId) {
        const targetStaff = staffWithCounts.find(staff => String(staff.id) === String(targetStaffId))
        if (targetStaff) loadStaffDetails(targetStaff, { fromNotification: true })
      }
    } catch (err) {
      toast.error("Failed to load staff data")
    } finally {
      setLoading(false)
    }
  }

  const loadStaffDetails = async (staff, options = {}) => {
    setLoading(true)
    setSelectedStaff(staff)
    setBatchViewMode('batches')
    setSelectedBatch(null)

    try {
      if (options.fromNotification && targetStudentId) {
        try {
          setViewMode('details')
          const detailRes = await api.get(`/counselor/students/${targetStudentId}/detail/`)
          setSelectedStudent(detailRes.data)
          setModalOpen(true)
          setLoading(false)
        } catch (err) {
          console.error('Counselor notification detail error:', err)
        }
      }

      // Fetch ALL students directly assigned to this staff (for total count)
      const allStudentsRes = await api.get(`/students/?assigned_staff=${staff.id}`)
      const allDirectStudents = allStudentsRes.data.results || allStudentsRes.data || []

      // Fetch batches for this staff
      const batchesRes = await api.get(`/batches/?faculty=${staff.id}`)
      const batches = batchesRes.data.results || batchesRes.data || []

      // Get additional details for each student from admin endpoint
      let studentDetailsMap = {}
      try {
        const progressRes = await api.get(`/admin/branch-attendance/?staff_id=${staff.id}`)
        const staffAttendanceData = progressRes.data
        if (staffAttendanceData.student_details) {
          staffAttendanceData.student_details.forEach(sd => {
            studentDetailsMap[sd.student.id] = sd
          })
        }
      } catch (e) {
        console.error('Admin endpoint error:', e)
      }

      // Create a map of student ID to enriched student data
      const studentMap = new Map()
      allDirectStudents.forEach(student => {
        const sd = studentDetailsMap[student.id]
        studentMap.set(student.id, {
          ...student,
          attendance_present: sd?.attendance_present || 0,
          attendance_total: sd?.attendance_total || 0,
          attendance_percentage: sd?.attendance_percentage || 0,
          attendance_records: sd?.attendance_records || [],
          test_results: sd?.test_results || [],
          test_count: sd?.test_count || 0,
          average_score: sd?.average_score || 0,
          quiz_results: sd?.quiz_results || [],
          quiz_count: sd?.quiz_count || 0,
          leave_requests: sd?.leave_requests || [],
          leaves_count: sd?.leaves_count || 0,
          sessions_completed: sd?.sessions_completed || 0,
          total_sessions: sd?.total_sessions || 0,
          progress_percentage: sd?.progress_percentage || 0,
          doubts_count: sd?.doubts_count || 0,
          resolved_doubts: sd?.resolved_doubts || 0,
          last_activity: sd?.last_activity || null,
        })
      })

      // For each batch, fetch students and filter ONLY those assigned to this batch
      const batchesWithFilteredStudents = await Promise.all(
        batches.map(async (batch) => {
          // Fetch students for this specific batch
          const studentsRes = await api.get(`/batches/${batch.id}/students/`)
          const batchStudentsRaw = studentsRes.data.results || studentsRes.data || []

          // IMPORTANT: Only include students whose assigned_batch matches this batch ID
          // Also deduplicate within the batch
          const uniqueBatchStudentsMap = new Map()
          batchStudentsRaw.forEach(student => {
            // Check if student is actually assigned to this batch
            if (Number(student.assigned_batch) === Number(batch.id) && !uniqueBatchStudentsMap.has(student.id)) {
              const enrichedStudent = { ...(studentMap.get(student.id) || {}), ...student }
              uniqueBatchStudentsMap.set(student.id, enrichedStudent)
            }
          })

          const filteredBatchStudents = Array.from(uniqueBatchStudentsMap.values())

          return {
            ...batch,
            students: filteredBatchStudents
          }
        })
      )

      // Store all unique students (for the header count)
      const allUniqueStudents = Array.from(studentMap.values())

      setStaffBatches(batchesWithFilteredStudents)
      setStaffStudents(allUniqueStudents)
      setViewMode('details')
      if (options.fromNotification && targetBatchId) {
        const targetBatch = batchesWithFilteredStudents.find(batch => String(batch.id) === String(targetBatchId))
        if (targetBatch) {
          setSelectedBatch(targetBatch)
          setBatchViewMode('students')
        }
      }

      // Log for debugging
      console.log('Batches with students:', batchesWithFilteredStudents.map(b => ({
        batch: b.batch_number,
        studentCount: b.students.length,
        students: b.students.map(s => s.first_name)
      })))

      if (!options.fromNotification) {
        toast.success(`Loaded ${batches.length} batches with ${allUniqueStudents.length} total students for ${staff.first_name}`)
      }
    } catch (err) {
      console.error("Error loading staff details:", err)
      toast.error("Failed to load staff details")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (counselorBranch) {
      loadStaff()
    } else if (user) {
      setLoading(false)
    }
  }, [counselorBranch, user, location.search])

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    try {
      return new Date(dateStr).toLocaleDateString('en-IN')
    } catch {
      return dateStr
    }
  }

  const formatBatchDuration = (batch) => {
    if (!batch?.start_date || !batch?.end_date) return 'Duration not set'
    return `${formatDate(batch.start_date)} - ${formatDate(batch.end_date)}`
  }

  const handleBatchClick = (batch) => {
    setSelectedBatch(batch)
    setBatchViewMode('students')
  }

  const handleBackToBatches = () => {
    setBatchViewMode('batches')
    setSelectedBatch(null)
  }

  const handleStudentClick = (student) => {
    setSelectedStudent(student)
    setModalOpen(true)
  }

  if (loading) return <div className="counselor-root"><Styles /><Spin /></div>

  if (!counselorBranch) {
    return (
      <div className="counselor-root">
        <Styles />
        <div className="counselor-card" style={{ padding: 40, textAlign: 'center' }}>
          <i className="fas fa-building" style={{ fontSize: 48, color: T.slate, marginBottom: 16 }} />
          <h4>No Branch Assigned</h4>
          <p style={{ color: T.slate }}>You don't have a branch assigned to your account.</p>
        </div>
      </div>
    )
  }

  // STAFF LIST VIEW
  if (viewMode === 'staff') {
    const totalStudents = staffList.reduce((sum, staff) => sum + (staff.student_count || 0), 0)
    const totalBatches = staffList.reduce((sum, staff) => sum + (staff.batch_count || 0), 0)

    return (
      <div className="counselor-root">
        <Styles />
        <div className="counselor-page-header">
          <div>
            <h3>👨‍🏫 Trainers & Mentors — {counselorBranch} Branch</h3>
            <p>Click on any trainer/mentor to view their batches and students</p>
          </div>
        </div>

        <div className="counselor-stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            ['Total Trainers', staffList.length, 'fa-chalkboard-user', T.teal, '46,196,182'],
            ['Total Batches', totalBatches, 'fa-layer-group', T.amber, '244,169,64'],
            ['Total Students', totalStudents, 'fa-user-graduate', T.sage, '76,175,129'],
          ].map(([label, value, icon, color, rgb]) => (
            <div key={label} className="counselor-stat-card">
              <div className="counselor-stat-icon" style={{ background: `rgba(${rgb},0.1)`, color }}>
                <i className={`fas ${icon}`} />
              </div>
              <div>
                <div className="counselor-stat-value">{value}</div>
                <div className="counselor-stat-label">{label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="counselor-row-grid-2">
          {staffList.length === 0 ? (
            <div className="counselor-card" style={{ padding: 40, textAlign: 'center', gridColumn: '1/-1' }}>
              <Empty msg="No trainers or mentors found in this branch" icon="fa-user-slash" />
            </div>
          ) : staffList.map(staff => (
            <div
              key={staff.id}
              onClick={() => loadStaffDetails(staff)}
              className="counselor-card"
              style={{ cursor: 'pointer', padding: 20, transition: 'all 0.2s ease', border: `1px solid ${T.border}` }}
              onMouseEnter={e => e.currentTarget.style.borderColor = T.amber}
              onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Avatar name={staff.first_name} size={50} radius={12} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{staff.first_name} {staff.last_name || ''}</div>
                  <div style={{ fontSize: 12, color: T.slate, marginTop: 4 }}>
                    <Badge text={staff.designation} variant="info" />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Badge text={`${staff.student_count || 0} Students`} variant="teal" />
                  <div style={{ marginTop: 6 }}>
                    <Badge text={`${staff.batch_count || 0} Batches`} variant="info" />
                  </div>
                  <i className="fas fa-chevron-right" style={{ color: T.slateLight, marginTop: 8, display: 'block' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // STAFF DETAILS VIEW
  const totalStudents = staffStudents.length
  const totalBatchesCount = staffBatches.length

  return (
    <div className="counselor-root">
      <Styles />

      <button
        onClick={() => { setViewMode('staff'); loadStaff() }}
        className="counselor-btn counselor-btn-ghost"
        style={{ marginBottom: 20 }}
      >
        <i className="fas fa-arrow-left" /> Back to Trainers List
      </button>

      {/* Staff Header */}
      <div className="counselor-card" style={{ marginBottom: 20, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <Avatar name={selectedStaff?.first_name} size={60} radius={14} />
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontFamily: "'Playfair Display'" }}>
              {selectedStaff?.first_name} {selectedStaff?.last_name || ''}
            </h3>
            <div style={{ display: 'flex', gap: 16, fontSize: 13, color: T.slate, flexWrap: 'wrap', marginTop: 8 }}>
              <span><i className="fas fa-id-card" style={{ marginRight: 6 }} />{selectedStaff?.staff_id}</span>
              <span><i className="fas fa-building" style={{ marginRight: 6 }} />{selectedStaff?.branch}</span>
              <span><i className="fas fa-briefcase" style={{ marginRight: 6 }} />{selectedStaff?.designation}</span>
              <span><i className="fas fa-envelope" style={{ marginRight: 6 }} />{selectedStaff?.email}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ textAlign: 'center', background: 'rgba(46,196,182,0.1)', borderRadius: 12, padding: '8px 16px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.teal }}>{totalStudents}</div>
              <div style={{ fontSize: 11, color: T.slate }}>Total Students</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(244,169,64,0.1)', borderRadius: 12, padding: '8px 16px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.amber }}>{totalBatchesCount}</div>
              <div style={{ fontSize: 11, color: T.slate }}>Total Batches</div>
            </div>
          </div>
        </div>
      </div>

      {/* Back Button when in students view */}
      {batchViewMode === 'students' && (
        <button
          onClick={handleBackToBatches}
          className="counselor-btn counselor-btn-ghost"
          style={{ marginBottom: 20 }}
        >
          <i className="fas fa-arrow-left" /> Back to Batches
        </button>
      )}

      {/* Batches View - Show Batch Cards */}
      {batchViewMode === 'batches' && (
        <div className="counselor-row-grid-2">
          {loading && staffBatches.length === 0 ? (
            <div className="counselor-card" style={{ padding: 40, textAlign: 'center', gridColumn: '1/-1' }}>
              <Spin />
            </div>
          ) : staffBatches.length === 0 ? (
            <div className="counselor-card" style={{ padding: 40, textAlign: 'center', gridColumn: '1/-1' }}>
              <Empty msg="No batches found for this staff" icon="fa-layer-group" />
            </div>
          ) : (
            staffBatches.map(batch => (
              <div
                key={batch.id}
                onClick={() => handleBatchClick(batch)}
                className="counselor-card"
                style={{
                  cursor: 'pointer',
                  padding: 20,
                  transition: 'all 0.2s ease',
                  border: `1px solid ${T.border}`
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = T.shadowMd
                  e.currentTarget.style.borderColor = T.amber
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = T.shadow
                  e.currentTarget.style.borderColor = T.border
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: `linear-gradient(135deg, ${T.navyMid}, ${T.navyLight})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className="fas fa-layer-group" style={{ color: T.amber, fontSize: 20 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{batch.batch_number}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Badge text={`${batch.students?.length || 0} Students`} variant="info" />
                      <Badge text={batch.batch_timing || 'Timing'} variant="primary" />
                      <Badge text={formatBatchDuration(batch)} variant="teal" />
                    </div>
                  </div>
                  <i className="fas fa-chevron-right" style={{ color: T.slateLight, fontSize: 14 }} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Students View - Show Students of Selected Batch */}
      {batchViewMode === 'students' && selectedBatch && (
        <div>
          {/* Batch Header */}
          <div className="counselor-card" style={{ marginBottom: 20, padding: '16px 20px', background: `linear-gradient(135deg, ${T.navy}, ${T.navyMid})` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <i className="fas fa-layer-group" style={{ color: T.amber, fontSize: 20 }} />
              <div>
                <div style={{ fontWeight: 700, color: 'white', fontSize: 16 }}>{selectedBatch.batch_number}</div>
                <div style={{ fontSize: 12, color: T.slateLight, marginTop: 2 }}>
                  Duration: {formatBatchDuration(selectedBatch)}
                  <br />
                  {selectedBatch.batch_timing || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Students Grid */}
          <div className="counselor-row-grid-2">
            {loading && !selectedBatch.students ? (
              <div className="counselor-card" style={{ padding: 40, textAlign: 'center', gridColumn: '1/-1' }}>
                <Spin />
              </div>
            ) : (selectedBatch.students || []).length === 0 ? (
              <div className="counselor-card" style={{ padding: 40, textAlign: 'center', gridColumn: '1/-1' }}>
                <Empty msg="No students in this batch" icon="fa-user-slash" />
              </div>
            ) : (
              (selectedBatch.students || []).map((student) => (
                <div
                  key={student.id}
                  onClick={() => handleStudentClick(student)}
                  className="counselor-card"
                  style={{
                    cursor: 'pointer',
                    padding: 18,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = T.shadowMd
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = T.shadow
                  }}
                >
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <Avatar name={student.first_name} size={44} radius={12} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{student.first_name} {student.last_name}</div>
                      <div style={{ fontSize: 12, color: T.slate, marginBottom: 10 }}>{student.student_id} · {student.course}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Badge text={`${student.test_count || 0} Tests`} variant="info" />
                        <Badge text={`${student.quiz_count || 0} Quizzes`} variant="primary" />
                        <Badge text={`${student.leaves_count || 0} Leaves`} variant="warning" />
                        <Badge text={`${student.progress_percentage || 0}% Progress`} variant="success" />
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: T.slate }}>Progress:</span>
                          <div style={{ flex: 1, background: '#e9ecef', borderRadius: 4, height: 4 }}>
                            <div style={{ width: `${student.progress_percentage || 0}%`, background: T.sage, borderRadius: 4, height: 4 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600 }}>{student.progress_percentage || 0}%</span>
                        </div>
                      </div>
                    </div>
                    <i className="fas fa-chevron-right" style={{ color: T.slateLight, fontSize: 12 }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      <StudentDetailModal
        open={modalOpen}
        student={selectedStudent}
        onClose={() => setModalOpen(false)}
        formatDate={formatDate}
        initialTab={targetTab}
      />
    </div>
  )
}

// ── STUDENT DETAIL MODAL COMPONENT ──────────────────────────────────────────
function StudentDetailModal({ open, student, onClose, formatDate, initialTab = 'overview' }) {
  const [modalTab, setModalTab] = useState(initialTab || 'overview')

  useEffect(() => {
    if (open) setModalTab(initialTab || 'overview')
  }, [open, initialTab])

  if (!student) return null

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'fa-user' },
    { id: 'attendance', label: 'Attendance', icon: 'fa-calendar-check' },
    { id: 'tests', label: 'Tests', icon: 'fa-file-alt', count: student.test_count },
    { id: 'quiz', label: 'Quizzes', icon: 'fa-question-circle', count: student.quiz_count },
    { id: 'leaves', label: 'Leaves', icon: 'fa-calendar-minus', count: student.leaves_count },
    { id: 'progress', label: 'Progress', icon: 'fa-chart-line' },
  ]

  return (
    <Modal open={open} onClose={onClose} title={`Student Details: ${student.first_name} ${student.last_name}`} size="lg">
      {/* Student Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
        padding: 16,
        background: '#f8fafc',
        borderRadius: 12,
        border: `1px solid ${T.border}`
      }}>
        <Avatar name={student.first_name} size={56} radius={14} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 18, fontFamily: "'Playfair Display'" }}>
            {student.first_name} {student.last_name}
          </div>
          <div style={{ fontSize: 13, color: T.slate, marginTop: 4 }}>
            <i className="fas fa-id-card" style={{ marginRight: 6 }} />{student.student_id}
            <span style={{ marginLeft: 16 }}><i className="fas fa-graduation-cap" style={{ marginRight: 6 }} />{student.course || '—'}</span>
            <span style={{ marginLeft: 16 }}><i className="fas fa-envelope" style={{ marginRight: 6 }} />{student.email || '—'}</span>
          </div>
        </div>
      </div>

      {/* Modal Tabs */}
      <div style={{
        display: 'flex',
        gap: 4,
        borderBottom: `2px solid ${T.border}`,
        marginBottom: 20,
        flexWrap: 'wrap'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setModalTab(tab.id)}
            style={{
              background: 'none', border: 'none', padding: '10px 16px', fontSize: 13,
              fontWeight: modalTab === tab.id ? 600 : 400,
              color: modalTab === tab.id ? T.amber : T.slate,
              borderBottom: modalTab === tab.id ? `2px solid ${T.amber}` : '2px solid transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: "'DM Sans'",
            }}
          >
            <i className={`fas ${tab.icon}`} />
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span style={{
                background: modalTab === tab.id ? T.amber : '#e9ecef',
                color: modalTab === tab.id ? 'white' : T.slate,
                borderRadius: 10, padding: '0 6px', fontSize: 10, marginLeft: 4
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
        {/* Overview Tab */}
        {modalTab === 'overview' && (
          <div>
            <div className="counselor-stat-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 16 }}>
              <div className="counselor-stat-card" style={{ padding: 12 }}>
                <div><i className="fas fa-calendar-check" style={{ color: T.sage }} /></div>
                <div><strong>Attendance</strong><br />{student.attendance_percentage || 0}%</div>
              </div>
              <div className="counselor-stat-card" style={{ padding: 12 }}>
                <div><i className="fas fa-file-alt" style={{ color: T.teal }} /></div>
                <div><strong>Tests</strong><br />{student.test_count || 0} taken</div>
              </div>
              <div className="counselor-stat-card" style={{ padding: 12 }}>
                <div><i className="fas fa-question-circle" style={{ color: T.amber }} /></div>
                <div><strong>Quizzes</strong><br />{student.quiz_count || 0} taken</div>
              </div>
              <div className="counselor-stat-card" style={{ padding: 12 }}>
                <div><i className="fas fa-chart-line" style={{ color: T.rose }} /></div>
                <div><strong>Progress</strong><br />{student.progress_percentage || 0}%</div>
              </div>
            </div>


          </div>
        )}

        {/* Attendance Tab */}
        {modalTab === 'attendance' && (
          student.attendance_records?.length === 0 ? (
            <Empty msg="No attendance records" icon="fa-calendar-alt" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="counselor-table">
                <thead><tr><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  {(student.attendance_records || []).map((a, i) => (
                    <tr key={i}>
                      <td>{formatDate(a.date)}</td>
                      <td><Badge text={a.status} variant={a.status === 'Present' ? 'success' : 'danger'} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Tests Tab */}
        {modalTab === 'tests' && (
          student.test_results?.length === 0 ? (
            <Empty msg="No test results" icon="fa-file-alt" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="counselor-table">
                <thead>
                  <tr>
                    <th>Test Name</th>
                    <th>Score</th>
                    <th>Percentage</th>
                    <th>Result</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(student.test_results || []).map((t, i) => {
                    // Fix: Calculate total questions if missing
                    let totalQuestions = t.total_questions || t.total_marks || t.total

                    // If still no total, try to get from percentage
                    if (!totalQuestions && t.score && t.percentage) {
                      totalQuestions = Math.round((t.score / t.percentage) * 100)
                    }

                    // If still no total, show just the score
                    const scoreDisplay = totalQuestions ? `${t.score}/${totalQuestions}` : `${t.score}`

                    return (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{t.test_name || t.test?.title || '—'}</td>
                        <td style={{ textAlign: 'center' }}>{scoreDisplay}</td>
                        <td style={{ textAlign: 'center' }}><strong>{t.percentage?.toFixed(1) || 0}%</strong></td>
                        <td style={{ textAlign: 'center' }}>
                          <Badge
                            text={(t.percentage || 0) >= 50 ? 'Passed' : 'Failed'}
                            variant={(t.percentage || 0) >= 50 ? 'success' : 'danger'}
                          />
                        </td>
                        <td>{formatDate(t.submitted_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Quizzes Tab */}
        {modalTab === 'quiz' && (
          student.quiz_results?.length === 0 ? (
            <Empty msg="No quiz results" icon="fa-question-circle" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="counselor-table">
                <thead><tr><th>Quiz Name</th><th>Score</th><th>Percentage</th><th>Result</th><th>Date</th></tr></thead>
                <tbody>
                  {(student.quiz_results || []).map((q, i) => (
                    <tr key={i}>
                      <td>{q.quiz_title || '—'}</td>
                      <td>{q.score}/{q.total_marks}</td>
                      <td><strong>{(q.percentage || 0).toFixed(1)}%</strong></td>
                      <td><Badge text={(q.percentage || 0) >= 50 ? 'Passed' : 'Failed'} variant={(q.percentage || 0) >= 50 ? 'success' : 'danger'} /></td>
                      <td>{formatDate(q.submitted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Leaves Tab */}
        {modalTab === 'leaves' && (
          student.leave_requests?.length === 0 ? (
            <Empty msg="No leave requests" icon="fa-calendar-alt" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="counselor-table">
                <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th></tr></thead>
                <tbody>
                  {(student.leave_requests || []).map((l, i) => {
                    let days = l.number_of_days || l.no_of_days || 0
                    if (days === 0 && l.start_date && l.end_date) {
                      const start = new Date(l.start_date)
                      const end = new Date(l.end_date)
                      days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
                    }
                    return (
                      <tr key={i}>
                        <td><Badge text={l.leave_type || '—'} variant="info" /></td>
                        <td>{formatDate(l.start_date)}</td>
                        <td>{formatDate(l.end_date)}</td>
                        <td><Badge text={`${days} day${days !== 1 ? 's' : ''}`} variant="primary" /></td>
                        <td style={{ maxWidth: 200 }}>{l.reason || '—'}</td>
                        <td><Badge text={l.status || 'pending'} variant={l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'danger' : 'warning'} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Progress Tab */}
        {modalTab === 'progress' && (
          <div>
            <div className="counselor-fg">
              <label className="counselor-label">Sessions Completed</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, background: '#e9ecef', borderRadius: 8, height: 8 }}>
                  <div style={{ width: `${student.progress_percentage || 0}%`, background: T.sage, borderRadius: 8, height: 8 }} />
                </div>
                <span>{student.sessions_completed || 0}/{student.total_sessions || 0}</span>
              </div>
            </div>
            <div className="counselor-fg">
              <label className="counselor-label">Doubts</label>
              <div><Badge text={`Raised: ${student.doubts_count || 0}`} variant="warning" /> → <Badge text={`Resolved: ${student.resolved_doubts || 0}`} variant="success" /></div>
            </div>
            <div className="counselor-fg">
              <label className="counselor-label">Last Activity</label>
              <div>{formatDate(student.last_activity)}</div>
            </div>
          </div>
        )}


      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PENDING COMPLETION REQUESTS
// ════════════════════
export function CounselorPendingRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [counselors, setCounselors] = useState([])
  const [reassignModal, setReassignModal] = useState(null)
  const [detailModal, setDetailModal] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/counselor/pending-requests/').then(r => setRequests(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api.get('/employees/?designation=counselor').then(r => setCounselors(r.data.results || r.data || []))
  }, [])

  const approve = async (id) => {
    if (!window.confirm('Approve this completion request? The student will be marked as completed.')) return
    try {
      await api.patch(`/counselor/requests/${id}/process/`, { status: 'approved' })
      toast.success('Request approved!')
      load()
    } catch { toast.error('Failed to approve') }
  }

  const pendingCount = requests.length
  const uniqueTrainers = [...new Set(requests.map(r => r.trainer_name))].length

  return (
    <div className="counselor-root">
      <Styles />
      <PH title="📋 Pending Completion Requests" sub="Review and reassign students who have completed their sessions" />

      <div className="counselor-stats-mini">
        <div className="counselor-stats-mini-item" style={{ background: '#fff3cd' }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#664d03' }}>⏳ Pending</span>
          <span style={{ fontWeight: 700, fontSize: 22, color: '#664d03' }}>{pendingCount}</span>
        </div>
        <div className="counselor-stats-mini-item" style={{ background: '#cfe2ff' }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#084298' }}>👩‍🏫 Trainers</span>
          <span style={{ fontWeight: 700, fontSize: 22, color: '#084298' }}>{uniqueTrainers}</span>
        </div>
        <div className="counselor-stats-mini-item" style={{ background: '#d1e7dd' }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#0a3622' }}>👨‍🎓 Students</span>
          <span style={{ fontWeight: 700, fontSize: 22, color: '#0a3622' }}>{pendingCount}</span>
        </div>
      </div>

      {loading ? <Spin /> : requests.length === 0 ? (
        <div className="counselor-card">
          <Empty msg="No pending requests" icon="fa-check-circle" />
        </div>
      ) : (
        <div className="counselor-card">
          <div style={{ overflowX: 'auto' }}>
            <table className="counselor-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Batch</th>
                  <th>Trainer</th>
                  <th>Progress</th>
                  <th>Topics</th>
                  <th>Requested On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.student_name}</div>
                      <small style={{ color: T.slate }}>{r.student_id}</small>
                    </td>
                    <td>
                      <Badge text={r.batch_number || '—'} variant="primary" />
                      {r.course_name && <div style={{ fontSize: 11, marginTop: 4, color: T.slate }}>{r.course_name}</div>}
                    </td>
                    <td>{r.trainer_name}</td>
                    <td style={{ minWidth: 100 }}>
                      <div style={{ background: '#e9ecef', borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 4 }}>
                        <div style={{
                          height: '100%',
                          width: `${r.total_sessions > 0 ? Math.round(r.sessions_completed / r.total_sessions * 100) : 0}%`,
                          background: T.sage,
                          borderRadius: 4
                        }} />
                      </div>
                      <small>{r.sessions_completed}/{r.total_sessions} sessions</small>
                    </td>
                    <td>
                      <button
                        className="counselor-btn counselor-btn-sm counselor-btn-ghost"
                        onClick={() => setDetailModal(r)}
                      >
                        <i className="fas fa-eye" /> View
                      </button>
                    </td>
                    <td style={{ fontSize: 12 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          className="counselor-btn counselor-btn-sm counselor-btn-primary"
                          onClick={() => setReassignModal(r)}
                        >
                          <i className="fas fa-exchange-alt" /> Reassign
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailModal && (
        <Modal open onClose={() => setDetailModal(null)} title="📋 Request Details" size="md">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontWeight: 600, minWidth: 100, color: T.navy }}>Student:</span>
              <span>{detailModal.student_name}</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontWeight: 600, minWidth: 100, color: T.navy }}>Trainer:</span>
              <span>{detailModal.trainer_name}</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontWeight: 600, minWidth: 100, color: T.navy }}>Sessions:</span>
              <span>{detailModal.sessions_completed}/{detailModal.total_sessions}</span>
            </div>
            <div>
              <span style={{ fontWeight: 600, color: T.navy }}>Topics Covered:</span>
              <div style={{ marginTop: 8, background: '#f8fafc', padding: '12px 14px', borderRadius: 12, fontSize: 13, border: `1px solid ${T.border}` }}>
                {detailModal.topics_covered}
              </div>
            </div>
            {detailModal.message && (
              <div>
                <span style={{ fontWeight: 600, color: T.navy }}>Trainer Message:</span>
                <div style={{ marginTop: 8, background: '#fef5e4', padding: '12px 14px', borderRadius: 12, fontSize: 13, border: `1px solid ${T.border}` }}>
                  {detailModal.message}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Reassign Modal */}
      {reassignModal && (
        <ReassignModalV2
          request={reassignModal}
          counselors={counselors}
          onClose={() => setReassignModal(null)}
          onSaved={() => { setReassignModal(null); load() }}
        />
      )}
    </div>
  )
}

// ── REASSIGN MODAL ─────────────────────────────────────────────────────────
function ReassignModal({ request, counselors, onClose, onSaved }) {
  const [selectedCounselor, setSelectedCounselor] = useState(String(request.counselor_id || ''))
  const [staff, setStaff] = useState([])
  const [batches, setBatches] = useState([])
  const [newTrainer, setNewTrainer] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [batchMode, setBatchMode] = useState('existing')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const selectedCounselorObj = counselors.find(c => String(c.id) === String(selectedCounselor))

  useEffect(() => {
    setNewTrainer('')
    setSelectedBatch('')
    setBatches([])
    if (!selectedCounselorObj?.branch) {
      setStaff([])
      return
    }
    api.get(`/trainers/?branch=${encodeURIComponent(selectedCounselorObj.branch)}`)
      .then(r => setStaff(r.data.results || r.data || []))
      .catch(() => {
        setStaff([])
        toast.error('Failed to load staff for selected branch')
      })
  }, [selectedCounselorObj?.branch])

  useEffect(() => {
    setSelectedBatch('')
    if (!newTrainer) {
      setBatches([])
      return
    }
    api.get(`/trainer-batches/${newTrainer}/`)
      .then(r => setBatches(r.data.results || r.data || []))
      .catch(() => {
        setBatches([])
        toast.error('Failed to load staff batches')
      })
  }, [newTrainer])

  const save = async () => {
    if (!selectedCounselor) return toast.error('Select a counselor')
    if (!newTrainer) return toast.error('Select a staff member')
    if (batchMode === 'existing' && !selectedBatch) return toast.error('Select a batch')
    setSaving(true)
    try {
      const r = await api.post(`/counselor/requests/${request.id}/reassign/`, {
        target_counselor_id: selectedCounselor,
        new_trainer_id: newTrainer,
        batch_mode: batchMode === 'new' ? 'new' : 'existing',
        batch_id: batchMode === 'existing' ? selectedBatch : undefined,
        notes,
      })
      toast.success(r.data.message || 'Student reassigned successfully!')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reassignment failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Reassign Student to New Counselor" size="md">
      <div className="counselor-alert-info" style={{ marginBottom: 20 }}>
        <i className="fas fa-info-circle" style={{ marginRight: 8 }} />
        Reassigning <strong>{request.student_name}</strong>. The student will move to the selected counselor's branch for follow-up.
      </div>

      <div className="counselor-fg">
        <label className="counselor-label">Select New Counselor <span className="counselor-req">*</span></label>
        <select className="counselor-select" value={newTrainer} onChange={e => setNewTrainer(e.target.value)}>
          <option value="">Choose counselor...</option>
          {counselors.filter(t => t.designation?.toLowerCase() === 'counselor').map(t => (
            <option key={t.id} value={t.id}>{t.first_name} {t.last_name || ''} — {t.branch}</option>
          ))}
        </select>
      </div>

      {newTrainer && (
        <div className="counselor-fg">
          <label className="counselor-label">Counselor Notes (optional)</label>
          <textarea
            className="counselor-input"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add any notes for the receiving counselor..."
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="counselor-btn counselor-btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="counselor-btn counselor-btn-primary" onClick={save} disabled={saving || !newTrainer}>
          <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-exchange-alt'}`} />
          {saving ? 'Reassigning...' : 'Confirm Reassign'}
        </button>
      </div>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// APPROVED REQUESTS
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// APPROVED REQUESTS - Fixed with better error handling
// ══════════════════════════════════════════════════════════════════════════════
function ReassignModalV2({ request, counselors, onClose, onSaved }) {
  const [selectedCounselor, setSelectedCounselor] = useState(String(request.counselor_id || ''))
  const [staff, setStaff] = useState([])
  const [batches, setBatches] = useState([])
  const [selectedStaff, setSelectedStaff] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [batchMode, setBatchMode] = useState('existing')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const selectedCounselorObj = counselors.find(c => String(c.id) === String(selectedCounselor))

  useEffect(() => {
    setSelectedStaff('')
    setSelectedBatch('')
    setBatches([])
    if (!selectedCounselorObj?.branch) {
      setStaff([])
      return
    }
    api.get(`/trainers/?branch=${encodeURIComponent(selectedCounselorObj.branch)}`)
      .then(r => setStaff(r.data.results || r.data || []))
      .catch(() => {
        setStaff([])
        toast.error('Failed to load staff for selected branch')
      })
  }, [selectedCounselorObj?.branch])

  useEffect(() => {
    setSelectedBatch('')
    if (!selectedStaff) {
      setBatches([])
      return
    }
    api.get(`/trainer-batches/${selectedStaff}/`)
      .then(r => setBatches(r.data.results || r.data || []))
      .catch(() => {
        setBatches([])
        toast.error('Failed to load staff batches')
      })
  }, [selectedStaff])

  const save = async () => {
    if (!selectedCounselor) return toast.error('Select a counselor')
    if (!selectedStaff) return toast.error('Select a staff member')
    if (batchMode === 'existing' && !selectedBatch) return toast.error('Select a batch')
    setSaving(true)
    try {
      const r = await api.post(`/counselor/requests/${request.id}/reassign/`, {
        target_counselor_id: selectedCounselor,
        new_trainer_id: selectedStaff,
        batch_mode: batchMode === 'new' ? 'new' : 'existing',
        batch_id: batchMode === 'existing' ? selectedBatch : undefined,
        notes,
      })
      toast.success(r.data.message || 'Student reassigned successfully!')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reassignment failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Reassign Student" size="md">
      <div className="counselor-alert-info" style={{ marginBottom: 20 }}>
        <i className="fas fa-info-circle" style={{ marginRight: 8 }} />
        Reassigning <strong>{request.student_name}</strong>. Choose a counselor branch, then select staff and batch for the student's next sessions.
      </div>

      <div className="counselor-fg">
        <label className="counselor-label">Select Counselor <span className="counselor-req">*</span></label>
        <select className="counselor-select" value={selectedCounselor} onChange={e => setSelectedCounselor(e.target.value)}>
          <option value="">Choose counselor...</option>
          {counselors.filter(c => c.designation?.toLowerCase() === 'counselor').map(c => (
            <option key={c.id} value={c.id}>{c.first_name} {c.last_name || ''} - {c.branch}</option>
          ))}
        </select>
      </div>

      <div className="counselor-fg">
        <label className="counselor-label">Select Staff <span className="counselor-req">*</span></label>
        <select className="counselor-select" value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)} disabled={!selectedCounselor}>
          <option value="">Choose staff...</option>
          {staff.map(s => (
            <option key={s.id} value={s.id}>{s.first_name} {s.last_name || ''} - {s.designation} - {s.branch}</option>
          ))}
        </select>
        {selectedCounselor && staff.length === 0 && (
          <small className="counselor-hint">No staff found in this counselor branch.</small>
        )}
      </div>

      <div className="counselor-fg">
        <label className="counselor-label">Batch Option <span className="counselor-req">*</span></label>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: T.navy }}>
            <input type="radio" checked={batchMode === 'new'} onChange={() => setBatchMode('new')} />
            Create New Batch
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: T.navy }}>
            <input type="radio" checked={batchMode === 'existing'} onChange={() => setBatchMode('existing')} />
            Add Existing Batch
          </label>
        </div>
        <small className="counselor-hint">Create New Batch creates a same-course batch for the selected staff. Add Existing Batch moves the student into one of that staff's current batches.</small>
      </div>

      {batchMode === 'existing' && (
        <div className="counselor-fg">
          <label className="counselor-label">Select Batch <span className="counselor-req">*</span></label>
          <select className="counselor-select" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} disabled={!selectedStaff}>
            <option value="">Choose batch...</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.batch_number} - {b.course_name_display || request.course_name} - {b.batch_timing}</option>
            ))}
          </select>
          {selectedStaff && batches.length === 0 && (
            <small className="counselor-hint">No batches found for this staff. Use Create New Batch.</small>
          )}
        </div>
      )}

      {batchMode === 'new' && selectedCounselorObj && selectedStaff && (
        <div className="counselor-alert-info" style={{ marginBottom: 16 }}>
          <i className="fas fa-layer-group" style={{ marginRight: 8 }} />
          A new {request.course_name} batch will be created for the selected staff with the current batch timing ({request.batch_timing || 'same timing'}).
        </div>
      )}

      <div className="counselor-fg">
        <label className="counselor-label">Counselor Notes (optional)</label>
        <textarea
          className="counselor-input"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add notes for the reassignment..."
        />
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="counselor-btn counselor-btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
        <button className="counselor-btn counselor-btn-primary" onClick={save} disabled={saving || !selectedCounselor || !selectedStaff || (batchMode === 'existing' && !selectedBatch)}>
          <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-exchange-alt'}`} />
          {saving ? 'Reassigning...' : 'Confirm Reassign'}
        </button>
      </div>
    </Modal>
  )
}

export function CounselorApprovedRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadApprovedRequests()
  }, [])

  const loadApprovedRequests = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log("Fetching approved requests...")
      const response = await api.get('/counselor/approved-requests/')
      console.log("Approved requests response:", response.data)

      // Handle different response formats
      let data = []
      if (Array.isArray(response.data)) {
        data = response.data
      } else if (response.data.results) {
        data = response.data.results
      } else if (response.data.data) {
        data = response.data.data
      } else {
        data = []
      }

      setRequests(data)
      if (data.length === 0) {
        console.log("No approved requests found")
      }
    } catch (err) {
      console.error("Error loading approved requests:", err)
      setError(err.response?.data?.error || err.message || "Failed to load approved requests")
      toast.error("Failed to load approved requests")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="counselor-root">
        <Styles />
        <Spin />
      </div>
    )
  }

  return (
    <div className="counselor-root">
      <Styles />

      <PH
        title="✅ Processed Requests History"
        sub="All approved and reassigned completion requests"
        btn={
          <button className="counselor-btn counselor-btn-ghost" onClick={loadApprovedRequests}>
            <i className="fas fa-sync-alt" /> Refresh
          </button>
        }
      />

      {error && (
        <div className="counselor-alert-warning" style={{ marginBottom: 20, padding: 12, background: '#fdeaec', borderRadius: 8, color: '#e84855' }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />
          {error}
        </div>
      )}

      <div className="counselor-card">
        <SH title="History" count={requests.length} />

        {requests.length === 0 ? (
          <Empty msg="No processed requests yet" icon="fa-inbox" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="counselor-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Trainer</th>
                  <th>Sessions</th>
                  <th>Topics Covered</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r, i) => (
                  <tr key={r.id}>
                    <td style={{ color: T.slate, fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{r.student_name || r.student?.first_name || '—'}</td>
                    <td>{r.trainer_name || r.trainer?.first_name || '—'}</td>
                    <td>{r.sessions_completed || 0}/{r.total_sessions || 0}</td>
                    <td style={{ maxWidth: 250 }}>{r.topics_covered || '—'}</td>
                    <td style={{ fontSize: 12 }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') :
                        r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td>
                      <Badge
                        text={r.status === 'approved' ? '✅ Approved' : r.status === 'reassigned' ? '🔄 Reassigned' : r.status}
                        variant={r.status === 'approved' ? 'success' : r.status === 'reassigned' ? 'info' : 'default'}
                      />
                    </td>
                    <td style={{ maxWidth: 200, fontSize: 12, color: T.slate }}>
                      {r.counselor_notes || r.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COUNSELOR COMPLETED STUDENTS - Branch-wise completed students with Attendance
// ══════════════════════════════════════════════════════════════════════════════
export function CounselorCompletedStudents() {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filter states
  const [filters, setFilters] = useState({
    batch: '',
    course: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  })

  // Statistics
  const [stats, setStats] = useState({
    totalGraduates: 0,
    totalSessions: 0,
    totalBatches: 0
  })

  // Available filter options
  const [batches, setBatches] = useState([])
  const [courses, setCourses] = useState([])

  const counselorBranch = user?.branch

  // Function to fetch attendance for a single student (SAME AS ADMIN)
  const fetchStudentAttendance = async (studentId) => {
    try {
      const response = await api.get(`/attendance/?student=${studentId}`)
      const records = response.data.results || response.data || []
      const present = records.filter(r => r.status === 'Present' || r.status === 'present').length
      const total = records.length
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0
      return { attendance_percentage: percentage, present_count: present, total_attendance: total }
    } catch (err) {
      console.error(`Error fetching attendance for student ${studentId}:`, err)
      return { attendance_percentage: 0, present_count: 0, total_attendance: 0 }
    }
  }

  // Function to fetch test scores for a student (SAME AS ADMIN)
  const fetchStudentTestScores = async (studentId) => {
    try {
      const response = await api.get(`/test-results/?student=${studentId}`)
      const results = response.data.results || response.data || []
      if (results.length === 0) return 0
      const totalPercentage = results.reduce((sum, t) => sum + (t.percentage || 0), 0)
      return Math.round(totalPercentage / results.length)
    } catch (err) {
      console.error(`Error fetching test scores for student ${studentId}:`, err)
      return 0
    }
  }

  useEffect(() => {
    if (counselorBranch) {
      loadCompletedStudents()
    } else {
      setLoading(false)
    }
  }, [counselorBranch])

  const loadCompletedStudents = async () => {
    setLoading(true)
    try {
      // Get completed students filtered by counselor's branch
      const response = await api.get(`/completed-students/?branch=${counselorBranch}`)
      let data = response.data.results || response.data || []

      // Fetch attendance and test scores for each student (SAME AS ADMIN)
      const studentsWithData = await Promise.all(
        data.map(async (student) => {
          const [attendance, avgScore] = await Promise.all([
            fetchStudentAttendance(student.id),
            fetchStudentTestScores(student.id)
          ])

          return {
            ...student,
            attendance_percentage: attendance.attendance_percentage,
            present_count: attendance.present_count,
            total_attendance: attendance.total_attendance,
            average_test_score: avgScore
          }
        })
      )

      setStudents(studentsWithData)

      const uniqueBatches = [...new Set(studentsWithData.map(s => s.batch_number).filter(Boolean))]
      const uniqueCourses = [...new Set(studentsWithData.map(s => s.course_name || s.course).filter(Boolean))]
      setBatches(uniqueBatches)
      setCourses(uniqueCourses)

      const totalSessions = studentsWithData.reduce((sum, s) => sum + (s.completed_sessions_count || s.total_sessions || 0), 0)
      setStats({
        totalGraduates: studentsWithData.length,
        totalSessions: totalSessions,
        totalBatches: uniqueBatches.length
      })

      applyFilters(studentsWithData, filters)
    } catch (err) {
      console.error("Error loading completed students:", err)
      toast.error("Failed to load completed students")
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = (data, currentFilters) => {
    let filtered = [...data]

    if (currentFilters.batch) {
      filtered = filtered.filter(s => s.batch_number === currentFilters.batch)
    }
    if (currentFilters.course) {
      filtered = filtered.filter(s => (s.course_name || s.course) === currentFilters.course)
    }
    if (currentFilters.dateFrom) {
      filtered = filtered.filter(s => new Date(s.completion_date) >= new Date(currentFilters.dateFrom))
    }
    if (currentFilters.dateTo) {
      filtered = filtered.filter(s => new Date(s.completion_date) <= new Date(currentFilters.dateTo))
    }
    if (currentFilters.search) {
      const searchLower = currentFilters.search.toLowerCase()
      filtered = filtered.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchLower) ||
        s.student_id?.toLowerCase().includes(searchLower) ||
        (s.course_name || s.course)?.toLowerCase().includes(searchLower) ||
        s.batch_number?.toLowerCase().includes(searchLower) ||
        s.faculty_name?.toLowerCase().includes(searchLower)
      )
    }

    setFilteredStudents(filtered)
    setCurrentPage(1)
  }

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    applyFilters(students, newFilters)
  }

  const clearFilters = () => {
    const resetFilters = { batch: '', course: '', dateFrom: '', dateTo: '', search: '' }
    setFilters(resetFilters)
    applyFilters(students, resetFilters)
  }

  const downloadReport = async (studentId, studentName) => {
  try {
    toast.loading(`Opening report for ${studentName}…`, { id: 'dl' })

    const res = await api.get(`/completed-students/${studentId}/report/`, { responseType: 'blob' })
    const contentType = res.headers?.['content-type'] || ''
    if (!contentType.includes('application/pdf')) {
      throw new Error(`Expected PDF, received ${contentType || 'unknown content type'}`)
    }

    const file = new Blob([res.data], { type: 'application/pdf' })
    const fileURL = window.URL.createObjectURL(file)

    window.open(fileURL, '_blank', 'noopener,noreferrer')

    setTimeout(() => {
      window.URL.revokeObjectURL(fileURL)
    }, 60000)

    toast.success('Report opened!', { id: 'dl' })
  } catch (err) {
    console.error('Report open error:', err)
    toast.error('Failed to open report.', { id: 'dl' })
  }
}

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return '—'
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end - start)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return `${diffDays}d`
  }

  const getSessionPercentage = (completed, total) => {
    if (!total || total === 0) return 0
    return Math.round((completed / total) * 100)
  }

  const getAttendanceColor = (percentage) => {
    if (percentage >= 75) return T.sage
    if (percentage >= 60) return T.amber
    return T.rose
  }

  if (!counselorBranch) {
    return (
      <div className="counselor-root">
        <Styles />
        <div className="counselor-card" style={{ padding: 40, textAlign: 'center' }}>
          <i className="fas fa-building" style={{ fontSize: 48, color: T.slate, marginBottom: 16 }} />
          <h4>No Branch Assigned</h4>
          <p style={{ color: T.slate }}>You don't have a branch assigned to your account.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="counselor-root">
        <Styles />
        <Spin />
      </div>
    )
  }

  return (
    <div className="counselor-root">
      <Styles />

      <PH
        title="🎓 Completed Students"
        sub={`Students who have successfully completed their courses - ${counselorBranch} Branch`}
      />

      {/* Statistics Cards */}
      <div className="counselor-stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="counselor-stat-card" style={{ background: `linear-gradient(135deg, ${T.sage}, ${T.sage}cc)`, color: 'white' }}>
          <div className="counselor-stat-icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            <i className="fas fa-graduation-cap" />
          </div>
          <div>
            <div className="counselor-stat-value" style={{ color: 'white' }}>{stats.totalGraduates}</div>
            <div className="counselor-stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Total Graduates</div>
          </div>
        </div>
        <div className="counselor-stat-card" style={{ background: `linear-gradient(135deg, ${T.amber}, ${T.amber}cc)`, color: 'white' }}>
          <div className="counselor-stat-icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            <i className="fas fa-layer-group" />
          </div>
          <div>
            <div className="counselor-stat-value" style={{ color: 'white' }}>{stats.totalBatches}</div>
            <div className="counselor-stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Batches</div>
          </div>
        </div>
        <div className="counselor-stat-card" style={{ background: `linear-gradient(135deg, ${T.teal}, ${T.teal}cc)`, color: 'white' }}>
          <div className="counselor-stat-icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            <i className="fas fa-calendar-check" />
          </div>
          <div>
            <div className="counselor-stat-value" style={{ color: 'white' }}>{stats.totalSessions}</div>
            <div className="counselor-stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Total Sessions</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="counselor-card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: `1px solid ${T.border}`, display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <input
            className="counselor-input"
            style={{ padding: '6px 10px', fontSize: '12px', width: '200px' }}
            placeholder="🔍 Search by name, ID, staff..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          <select
            className="counselor-select"
            style={{ padding: '6px 10px', fontSize: '12px', width: '130px' }}
            value={filters.batch}
            onChange={(e) => handleFilterChange('batch', e.target.value)}
          >
            <option value="">All Batches</option>
            {batches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select
            className="counselor-select"
            style={{ padding: '6px 10px', fontSize: '12px', width: '130px' }}
            value={filters.course}
            onChange={(e) => handleFilterChange('course', e.target.value)}
          >
            <option value="">All Courses</option>
            {courses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="date"
            className="counselor-input"
            style={{ padding: '6px 10px', fontSize: '12px', width: '130px' }}
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
          />
          <span style={{ fontSize: '12px', color: T.slate }}>to</span>
          <input
            type="date"
            className="counselor-input"
            style={{ padding: '6px 10px', fontSize: '12px', width: '130px' }}
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
          />
          <button
            className="counselor-btn counselor-btn-sm counselor-btn-ghost"
            onClick={clearFilters}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            <i className="fas fa-times" /> Clear
          </button>
        </div>
      </div>

      {/* Completed Students Table */}
      <div className="counselor-card">
        <div className="counselor-card-header" style={{ background: `linear-gradient(135deg, ${T.sage}, ${T.sage}cc)`, color: 'white' }}>
          <h5 style={{ color: 'white', margin: 0 }}>
            <i className="fas fa-graduation-cap" style={{ marginRight: 8 }} /> Graduated Students
          </h5>
          <Badge text={`${filteredStudents.length} Records`} variant="success" />
        </div>

        {filteredStudents.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <i className="fas fa-graduation-cap" style={{ fontSize: 48, color: T.slate, marginBottom: 16, opacity: 0.3 }} />
            <h4 style={{ color: T.slate }}>No completed students yet</h4>
            <p style={{ color: T.slateLight }}>Students who complete all sessions in your branch will appear here.</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="counselor-table">
                <thead>
                  <tr style={{ background: `linear-gradient(135deg, ${T.navy}, ${T.navyMid})`, color: 'white' }}>
                    <th style={{ padding: '10px 8px', color: 'white', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '40px' }}>#</th>
                    <th style={{ padding: '10px 8px', color: 'white', fontSize: '11px', fontWeight: 600, textAlign: 'left', width: '130px' }}>Student</th>
                    <th style={{ padding: '10px 8px', color: 'white', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '90px' }}>Student ID</th>
                    <th style={{ padding: '10px 8px', color: 'white', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '100px' }}>Staff Name</th>
                    <th style={{ padding: '10px 8px', color: 'white', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '80px' }}>Batch</th>
                    <th style={{ padding: '10px 8px', color: 'white', fontSize: '11px', fontWeight: 600, textAlign: 'left', width: '100px' }}>Course</th>
                    <th style={{ padding: '10px 8px', color: 'white', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '80px' }}>Sessions</th>
                    <th style={{ padding: '10px 8px', color: 'white', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '70px' }}>Duration</th>
                    <th style={{ padding: '10px 8px', color: 'white', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '85px' }}>Completed</th>
                    <th style={{ padding: '10px 8px', color: 'white', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '100px' }}>Attendance</th>
                    <th style={{ padding: '10px 8px', color: 'white', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '70px' }}>Avg Score</th>
                    <th style={{ padding: '10px 8px', color: 'white', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '70px' }}>Report</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((x, idx) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + idx + 1
                    const attendancePercentage = x.attendance_percentage || 0
                    const avgScore = x.average_test_score || 0
                    const completedSessions = x.completed_sessions_count || x.sessions_completed || 0
                    const totalSessions = x.total_sessions_count || x.total_sessions || 0
                    const sessionPercentage = getSessionPercentage(completedSessions, totalSessions)
                    const staffName = x.faculty_name || x.graduated_from_trainer_name || x.trainer_name || '—'

                    return (
                      <tr key={x.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: '10px 8px', fontSize: '12px', color: T.slate, textAlign: 'center' }}>{globalIndex}</td>
                        <td style={{ padding: '10px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Avatar name={x.first_name} size={28} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '12px' }}>{x.first_name} {x.last_name || ''}</div>
                              <div style={{ fontSize: '9px', color: T.slate }}>{x.email?.split('@')[0] || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}><Badge text={x.student_id} variant="info" /></td>
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          <Badge text={staffName} variant="primary" />
                        </td>
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}><Badge text={x.batch_number} variant="default" /></td>
                        <td style={{ padding: '10px 8px', fontSize: '11px' }}>
                          <div><strong>{x.course_name || x.course || '—'}</strong></div>
                          <div style={{ fontSize: '9px', color: T.slate }}>{x.branch || '—'}</div>
                        </td>
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '50px', background: '#e9ecef', borderRadius: '4px', height: '4px' }}>
                              <div style={{ height: '100%', width: `${sessionPercentage}%`, background: T.sage, borderRadius: '4px' }} />
                            </div>
                            <span style={{ fontSize: '10px' }}>{completedSessions}/{totalSessions}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>{calculateDuration(x.batch_start_date, x.batch_end_date)}</td>
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          <Badge text={new Date(x.completion_date).toLocaleDateString('en-IN')} variant="success" />
                        </td>

                        {/* ATTENDANCE COLUMN - Same as Admin */}
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          {attendancePercentage > 0 ? (
                            <div>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                <div style={{ width: '60px', background: '#e9ecef', borderRadius: '4px', height: '6px' }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${attendancePercentage}%`,
                                    background: getAttendanceColor(attendancePercentage),
                                    borderRadius: '4px'
                                  }} />
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 600 }}>{attendancePercentage}%</span>
                              </div>
                              <div style={{ fontSize: '9px', color: T.slate }}>
                                ({x.present_count || 0}/{x.total_attendance || 0} days)
                              </div>
                            </div>
                          ) : (
                            <Badge text="Not Marked" variant="warning" />
                          )}
                        </td>

                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          <Badge
                            text={`${avgScore}%`}
                            variant={avgScore >= 70 ? 'success' : avgScore >= 50 ? 'warning' : 'danger'}
                          />
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <button
                            className="counselor-btn counselor-btn-success counselor-btn-sm"
                           onClick={() => downloadReport(x.id, `${x.first_name} ${x.last_name || ''}`)}
                            title="Download Completion Report"
                            style={{ padding: '4px 8px', fontSize: '10px' }}
                          >
                            <i className="fas fa-download" /> Report
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px', gap: '4px', flexWrap: 'wrap' }}>
                <button className="counselor-btn counselor-btn-ghost counselor-btn-sm" onClick={() => goToPage(1)} disabled={currentPage === 1} style={{ padding: '4px 8px' }}>
                  <i className="fas fa-angle-double-left" />
                </button>
                <button className="counselor-btn counselor-btn-ghost counselor-btn-sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} style={{ padding: '4px 8px' }}>
                  <i className="fas fa-angle-left" />
                </button>

                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`counselor-btn ${currentPage === pageNum ? 'counselor-btn-primary' : 'counselor-btn-ghost'} counselor-btn-sm`}
                      onClick={() => goToPage(pageNum)}
                      style={{ padding: '4px 8px', minWidth: '28px' }}
                    >
                      {pageNum}
                    </button>
                  )
                })}

                <button className="counselor-btn counselor-btn-ghost counselor-btn-sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} style={{ padding: '4px 8px' }}>
                  <i className="fas fa-angle-right" />
                </button>
                <button className="counselor-btn counselor-btn-ghost counselor-btn-sm" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} style={{ padding: '4px 8px' }}>
                  <i className="fas fa-angle-double-right" />
                </button>
              </div>
            )}

            <div style={{ padding: '8px 16px', borderTop: `1px solid ${T.border}`, fontSize: '11px', color: T.slate, textAlign: 'center' }}>
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} entries
            </div>
          </>
        )}
      </div>
    </div>
  )
}


// ══════════════════════════════════════════════════════════════════════════════
// COUNSELOR ASSIGNED STUDENTS
// ══════════════════════════════════════════════════════════════════════════════
export function CounselorAssignedStudents() {
  const { user } = useAuth()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [feeModal, setFeeModal] = useState(null)
  const [feeData, setFeeData] = useState(null)
  const [feeByStudent, setFeeByStudent] = useState({})
  const [payForm, setPayForm] = useState({ amount: '', payment_mode: 'cash', transaction_id: '' })
  const [screenshot, setScreenshot] = useState(null)
  const [saving, setSaving] = useState(false)
  const [completingId, setCompletingId] = useState(null)

  const counselorBranch = user?.branch

  useEffect(() => {
    if (counselorBranch) {
      loadStudents()
    } else if (user) {
      setLoading(false)
    }
  }, [counselorBranch, user])

  const loadStudents = async () => {
    setLoading(true)
    try {
      // Get students from counselor's branch that have assigned staff
      const [response, feeResponse] = await Promise.all([
        api.get(`/students/?branch=${counselorBranch}`),
        api.get(`/fees/?branch=${counselorBranch}`),
      ])
      const allStudents = response.data.results || response.data || []
      const fees = feeResponse.data.results || feeResponse.data || []
      const feeMap = {}
      fees.forEach(fee => {
        if (!feeMap[fee.student_id]) feeMap[fee.student_id] = []
        feeMap[fee.student_id].push(fee)
      })
      // Filter students who have assigned staff
      const assignedStudents = allStudents.filter(x => x.assigned_staff)
      setStudents(assignedStudents)
      setFeeByStudent(feeMap)
    } catch (err) {
      console.error('Error loading students:', err)
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  const filtered = students.filter(x =>
    `${x.first_name} ${x.last_name} ${x.student_id}`.toLowerCase().includes(search.toLowerCase())
  )

  const trainerNamesForStudent = (student) => {
    const names = []
    const addName = (name) => {
      const value = String(name || '').trim()
      if (value && !names.includes(value)) names.push(value)
    }
    ;(student.assigned_batches || []).forEach(batch => {
      ;(batch.trainer_names || []).forEach(addName)
      ;(batch.trainers || []).forEach(trainer => addName(trainer.name))
    })
    ;(student.enrolled_courses || []).forEach(course => {
      ;(course.batches || []).forEach(batch => {
        ;(batch.trainer_names || []).forEach(addName)
        ;(batch.trainers || []).forEach(trainer => addName(trainer.name))
      })
    })
    addName(student.assigned_staff_name || student.assigned_staff?.first_name)
    return names
  }

  const openFeeModal = async (student, selectedFee = null) => {
    try {
      let fee = selectedFee

      if (!fee) {
        fee = feeByStudent[student.student_id]?.[0]
      }

      if (!fee) {
        const r = await api.get(`/fees/?branch=${counselorBranch}`)
        const fees = r.data.results || r.data || []
        fee = fees.find(f => f.student_id === student.student_id)
      }

      if (!fee) return toast.error('No fee record found for this student')
      setFeeData(fee)
      setFeeModal(student)
      setPayForm({ amount: '', payment_mode: 'cash', transaction_id: '' })
      setScreenshot(null)
    } catch (err) {
      console.error('Error loading fee data:', err)
      toast.error('Failed to load fee data')
    }
  }

  const handleCompleteStudent = async (student) => {
    const name = `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.student_id
    if (!window.confirm(`Move ${name} to completed students?`)) return

    setCompletingId(student.id)
    try {
      await api.post(`/students/${student.id}/mark-completed/`)
      toast.success('Student moved to completed students')
      setStudents(prev => prev.filter(x => x.id !== student.id))
      loadStudents()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to complete student')
    } finally {
      setCompletingId(null)
    }
  }

  const cleanPaymentAmount = (value) => {
    const cleaned = String(value || '').replace(/[^\d.]/g, '')
    const parts = cleaned.split('.')
    return parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned
  }

  const handlePay = async () => {
    const normalizedAmount = cleanPaymentAmount(payForm.amount)
    const numericAmount = Number(normalizedAmount)
    if (!normalizedAmount || !Number.isFinite(numericAmount) || numericAmount <= 0) return toast.error('Enter valid amount')
    if (numericAmount > Number(feeData.balance || 0)) return toast.error(`Amount exceeds balance of ₹${feeData.balance}`)
    if (payForm.payment_mode !== 'cash' && !payForm.transaction_id.trim()) return toast.error('Transaction ID is required')
    if (payForm.payment_mode !== 'cash' && !screenshot) return toast.error('Payment screenshot is required')

    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('amount', normalizedAmount)
      fd.append('payment_mode', payForm.payment_mode)
      fd.append('notes', payForm.transaction_id)
      if (screenshot) fd.append('screenshot', screenshot)

      // DEBUG - remove after testing
      console.log('=== FEE REQUEST DEBUG ===')
      console.log('fee_id:', feeData.id)
      console.log('amount:', normalizedAmount)
      console.log('payment_mode:', payForm.payment_mode)
      console.log('notes:', payForm.transaction_id)
      console.log('screenshot:', screenshot?.name || 'none')
      for (let [key, val] of fd.entries()) {
        console.log('FormData:', key, '=', val)
      }

      await api.post(`/fees/${feeData.id}/request/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success('Payment request sent to admin for approval!')
      setFeeData(prev => ({
        ...prev,
        pending_amount: Number(prev?.pending_amount || 0) + numericAmount,
        balance: Math.max(Number(prev?.balance || 0) - numericAmount, 0),
      }))
      setPayForm({ amount: '', payment_mode: 'cash', transaction_id: '' })
      setScreenshot(null)
      loadStudents() // Refresh the list
    } catch (err) {
      toast.error(err.response?.data?.error || 'Request failed')
    } finally {
      setSaving(false)
    }
  }

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

  if (loading && !counselorBranch) {
    return <div className="counselor-root"><Styles /><Spin /></div>
  }

  if (!counselorBranch) {
    return (
      <div className="counselor-root">
        <Styles />
        <div className="counselor-card" style={{ padding: 40, textAlign: 'center' }}>
          <i className="fas fa-building" style={{ fontSize: 48, color: T.slate, marginBottom: 16 }} />
          <h4>No Branch Assigned</h4>
          <p style={{ color: T.slate }}>You don't have a branch assigned to your account.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="counselor-root">
      <Styles />
      <PH title="👤 Assigned Students" sub={`Students currently assigned to trainers in ${counselorBranch} branch`} />

      <div className="counselor-card">
        <div className="counselor-card-header" style={{ justifyContent: 'space-between' }}>
          <h5>Assigned Students ({filtered.length})</h5>
          <input
            className="counselor-input"
            placeholder="Search by name or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 220 }}
          />
        </div>
        {loading ? (
          <Spin />
        ) : filtered.length === 0 ? (
          <Empty msg="No assigned students found in your branch" icon="fa-user-slash" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="counselor-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Branch</th>
                  <th>Trainer</th>
                  <th>Batch</th>
                  <th>Actual Fee</th>
                  <th>Fee Payment</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((x, i) => {
                  const studentFees = feeByStudent[x.student_id] || []
                  const trainerNames = trainerNamesForStudent(x)

                  return (
                    <tr key={x.id}>
                      <td style={{ color: T.slate, fontSize: 12 }}>{i + 1}</td>
                      <td>
                        <div className="counselor-person-cell" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar name={x.first_name} size={34} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{x.first_name} {x.last_name}</div>
                            <div style={{ fontSize: 11, color: T.slate }}>{x.student_id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 13 }}>{x.course}</td>
                      <td><Badge text={x.branch} variant="info" /></td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, minWidth: 120 }}>
                          {trainerNames.length
                            ? trainerNames.map(name => <Badge key={name} text={name} variant="teal" />)
                            : <Badge text="—" variant="teal" />}
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>{x.assigned_batch_number || x.assigned_batch?.batch_number || '—'}</td>
                      <td>
                        {studentFees.length ? (
                          <div style={{ display: 'grid', gap: 4, minWidth: 95 }}>
                            {studentFees.map(fee => (
                              <div
                                key={fee.id}
                                style={{
                                  fontSize: 13,
                                  fontWeight: 800,
                                  color: T.sage,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {fmt(fee.total_fee)}
                              </div>
                            ))}
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        {studentFees.length ? (
                          <div style={{ display: 'grid', gap: 6, minWidth: 160 }}>
                            {studentFees.map(fee => (
                              <button
                                key={fee.id}
                                className="counselor-btn counselor-btn-primary counselor-btn-sm"
                                disabled={fee.is_fully_paid}
                                onClick={() => openFeeModal(x, fee)}
                                title={`Pay fee for ${fee.course_name || 'course'}`}
                                style={fee.is_fully_paid ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                              >
                                <i className={`fas ${fee.is_fully_paid ? 'fa-check-circle' : 'fa-rupee-sign'}`} />
                                {fee.is_fully_paid ? 'Paid' : 'Pay Fee'}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: T.slate, fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="counselor-btn counselor-btn-success counselor-btn-sm"
                          disabled={completingId === x.id}
                          onClick={() => handleCompleteStudent(x)}
                          style={completingId === x.id ? { opacity: 0.65, cursor: 'not-allowed' } : undefined}
                        >
                          <i className={`fas ${completingId === x.id ? 'fa-spinner fa-spin' : 'fa-check-circle'}`} />
                          {completingId === x.id ? 'Moving...' : 'Completed'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fee Payment Modal */}
      {feeModal && feeData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20
          }}
          onClick={e => e.target === e.currentTarget && setFeeModal(null)}
        >
          <div className="counselor-card" style={{ width: '100%', maxWidth: 480 }}>
            <div style={{
              background: `linear-gradient(135deg, ${T.navy}, ${T.navyLight})`,
              padding: '18px 22px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderRadius: '16px 16px 0 0'
            }}>
              <h6 style={{ margin: 0, color: 'white', fontFamily: "'Playfair Display'", fontSize: 16 }}>
                <i className="fas fa-rupee-sign" style={{ marginRight: 8, color: T.amber }} />
                Fee Payment — {feeModal.first_name} {feeModal.last_name}
              </h6>
              <button
                onClick={() => setFeeModal(null)}
                style={{
                  background: 'rgba(255,255,255,.15)',
                  border: 'none',
                  color: 'white',
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px 22px', maxHeight: '80vh', overflowY: 'auto' }}>
              {/* Fee Summary */}
              <div style={{ background: T.white, borderRadius: 12, padding: '14px 16px', marginBottom: 20, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 12, color: T.slate, marginBottom: 8 }}>
                  <i className="fas fa-layer-group" style={{ marginRight: 6 }} />{feeData.batch_number}
                  <span style={{ marginLeft: 12 }}><i className="fas fa-book" style={{ marginRight: 6 }} />{feeData.course_name}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {[
                    ['Total', fmt(feeData.total_fee), T.navy],
                    ['Paid', fmt(feeData.amount_paid), T.sage],
                    ['Pending', fmt(feeData.pending_amount), T.amber],
                    ['Balance', fmt(feeData.balance), T.rose],
                  ].map(([l, v, c]) => (
                    <div key={l} style={{ textAlign: 'center', flex: 1, background: 'white', borderRadius: 8, padding: '8px 12px', border: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</div>
                      <div style={{ fontSize: 11, color: T.slate }}>{l}</div>
                    </div>
                  ))}
                </div>
                {feeData.is_fully_paid && (
                  <div style={{ marginTop: 10, textAlign: 'center', color: T.sage, fontWeight: 600, fontSize: 13 }}>
                    <i className="fas fa-check-circle" style={{ marginRight: 6 }} />Fully Paid
                  </div>
                )}
              </div>

              {feeData.is_fully_paid ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: T.sage, fontWeight: 600 }}>
                  <i className="fas fa-check-circle" style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                  This student has fully paid their fees!
                </div>
              ) : (
                <>
                  <div style={{ background: '#e4f2fd', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1260a0' }}>
                    <i className="fas fa-info-circle" style={{ marginRight: 8 }} />
                    Payment request will be sent to admin for approval before recording.
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
                      Amount (₹) <span style={{ color: T.rose }}>*</span>
                    </label>
                    <input
                      className="counselor-input"
                      type="text"
                      inputMode="decimal"
                      placeholder={`Max: ${feeData.balance}`}
                      value={payForm.amount}
                      onChange={e => setPayForm(p => ({ ...p, amount: cleanPaymentAmount(e.target.value) }))}
                    />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
                      Payment Mode <span style={{ color: T.rose }}>*</span>
                    </label>
                    <select
                      className="counselor-select"
                      value={payForm.payment_mode}
                      onChange={e => {
                        setPayForm(p => ({ ...p, payment_mode: e.target.value, transaction_id: '' }))
                        setScreenshot(null)
                      }}
                    >
                      <option value="cash">💵 Cash</option>
                      <option value="upi">📱 UPI</option>
                      <option value="bank_transfer">🏦 Bank Transfer</option>
                      <option value="cheque">📝 Cheque</option>
                    </select>
                  </div>

                  {payForm.payment_mode !== 'cash' && (
                    <>
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
                          Transaction ID <span style={{ color: T.rose }}>*</span>
                        </label>
                        <input
                          className="counselor-input"
                          placeholder="e.g. TXN123456789"
                          value={payForm.transaction_id}
                          onChange={e => setPayForm(p => ({ ...p, transaction_id: e.target.value }))}
                        />
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
                          Payment Screenshot <span style={{ color: T.rose }}>*</span>
                        </label>
                        {screenshot ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#e8f8f0', borderRadius: 10, padding: '10px 14px', border: `1px solid ${T.border}` }}>
                            <i className="fas fa-image" style={{ color: T.sage, fontSize: 16 }} />
                            <span style={{ flex: 1, fontSize: 13, color: '#1a6b3e', fontWeight: 600 }}>{screenshot.name}</span>
                            <button
                              type="button"
                              onClick={() => setScreenshot(null)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.rose, fontSize: 16 }}
                            >
                              <i className="fas fa-times" />
                            </button>
                          </div>
                        ) : (
                          <input
                            className="counselor-input"
                            type="file"
                            accept="image/*,.pdf"
                            onChange={e => setScreenshot(e.target.files[0] || null)}
                          />
                        )}
                      </div>
                    </>
                  )}

                  {payForm.payment_mode === 'cash' && (
                    <div style={{ marginBottom: 16, background: '#fef5e4', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#8a5a00' }}>
                      <i className="fas fa-info-circle" style={{ marginRight: 8 }} />
                      Cash payment — no transaction ID or screenshot required.
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="counselor-btn counselor-btn-ghost" style={{ flex: 1 }} onClick={() => { setFeeModal(null); setScreenshot(null) }}>Cancel</button>
                    <button className="counselor-btn counselor-btn-primary" style={{ flex: 1 }} onClick={handlePay} disabled={saving}>
                      <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} />
                      {saving ? 'Submitting...' : 'Submit to Admin'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// COUNSELOR FEE MANAGEMENT - Branch only, Bill download only, No payment request
// ══════════════════════════════════════════════════════════════════════════════
export function CounselorFeeManagement() {
  const { user } = useAuth()
  const counselorBranch = user?.branch

  const [fees, setFees] = useState([])
  const [filteredFees, setFilteredFees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const load = async () => {
    if (!counselorBranch) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const r = await api.get(`/fees/?branch=${counselorBranch}`)
      const data = r.data.results || r.data || []
      setFees(data)
      applyFilters(data, search, statusFilter)
    } catch {
      toast.error('Failed to load fee records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [counselorBranch])

  const applyFilters = (data, s, st) => {
    let f = [...data]
    if (st === 'paid') f = f.filter(x => x.is_fully_paid)
    if (st === 'pending') f = f.filter(x => !x.is_fully_paid)
    if (s) {
      const sl = s.toLowerCase()
      f = f.filter(x =>
        x.student_name?.toLowerCase().includes(sl) ||
        x.student_id?.toLowerCase().includes(sl) ||
        x.batch_number?.toLowerCase().includes(sl) ||
        x.course_name?.toLowerCase().includes(sl)
      )
    }
    setFilteredFees(f)
  }

  useEffect(() => { applyFilters(fees, search, statusFilter) }, [fees, search, statusFilter])

  const downloadBill = async (feeId, studentName) => {
    const toastId = toast.loading('Generating bill...')

    try {
      // Use the API instance instead of fetch
      const response = await api.get(`/fees/${feeId}/bill/`, {
        responseType: 'blob'
      })

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Fee_Receipt_${studentName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success('Bill downloaded!', { id: toastId })
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Failed to download bill', { id: toastId })
    }
  }

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

  const totalFee = fees.reduce((s, f) => s + (parseFloat(f.total_fee) || 0), 0)
  const totalPaid = fees.reduce((s, f) => s + (parseFloat(f.amount_paid) || 0), 0)
  const totalBalance = fees.reduce((s, f) => s + (parseFloat(f.balance) || 0), 0)
  const fullyPaid = fees.filter(f => f.is_fully_paid).length

  if (!counselorBranch) {
    return (
      <div className="counselor-root">
        <Styles />
        <div className="counselor-card" style={{ padding: 40, textAlign: 'center' }}>
          <i className="fas fa-building" style={{ fontSize: 48, color: T.slate, marginBottom: 16 }} />
          <h4>No Branch Assigned</h4>
          <p style={{ color: T.slate }}>You don't have a branch assigned to your account.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="counselor-root">
      <Styles />

      <PH
        title="💰 Fee Management"
        sub={`Fee records for ${counselorBranch} branch`}
        btn={
          <button className="counselor-btn counselor-btn-ghost" onClick={load}>
            <i className="fas fa-sync-alt" /> Refresh
          </button>
        }
      />

      {/* Stats */}
      <div className="counselor-stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Total Students', value: fees.length, icon: 'fa-users', color: T.navy, bg: 'rgba(15,27,45,0.1)' },
          // { label: 'Total Fee', value: fmt(totalFee), icon: 'fa-rupee-sign', color: T.amber, bg: 'rgba(244,169,64,0.1)' },
          // { label: 'Collected', value: fmt(totalPaid), icon: 'fa-check-circle', color: T.sage, bg: 'rgba(76,175,129,0.1)' },
          { label: 'Pending Students', value: fees.length - fullyPaid, icon: 'fa-clock', color: T.rose, bg: 'rgba(232,72,85,0.1)' },
        ].map(stat => (
          <div key={stat.label} className="counselor-stat-card">
            <div className="counselor-stat-icon" style={{ background: stat.bg, color: stat.color }}>
              <i className={`fas ${stat.icon}`} />
            </div>
            <div>
              <div className="counselor-stat-value" style={{ fontSize: 20 }}>{stat.value}</div>
              <div className="counselor-stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="counselor-input"
          style={{ width: 240 }}
          placeholder="🔍 Search student, batch..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="counselor-select"
          style={{ width: 150 }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="paid">Fully Paid</option>
          <option value="pending">Pending</option>
        </select>
        {(search || statusFilter) && (
          <button
            className="counselor-btn counselor-btn-ghost counselor-btn-sm"
            onClick={() => { setSearch(''); setStatusFilter('') }}
          >
            <i className="fas fa-times" /> Clear
          </button>
        )}
        <span style={{ fontSize: 12, color: T.slate, marginLeft: 'auto' }}>
          <i className="fas fa-building" style={{ marginRight: 6 }} />
          Branch: <strong>{counselorBranch}</strong>
        </span>
      </div>

      {/* Fee Records Table */}
      <div className="counselor-card">
        <SH
          title={`Fee Records — ${counselorBranch}`}
          count={filteredFees.length}
          actions={
            <span style={{ fontSize: 12, color: T.slate }}>
              {fullyPaid} fully paid · {fees.length - fullyPaid} pending
            </span>
          }
        />
        {loading ? <Spin /> : filteredFees.length === 0 ? (
          <Empty msg="No fee records found for your branch" icon="fa-rupee-sign" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="counselor-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Total Fee</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Bill</th>
                </tr>
              </thead>
              <tbody>
                {filteredFees.map((f, i) => {
                  const paidPct = parseFloat(f.total_fee) > 0
                    ? Math.round((parseFloat(f.amount_paid) / parseFloat(f.total_fee)) * 100)
                    : 0
                  return (
                    <tr key={f.id}>
                      <td style={{ fontSize: 12, color: T.slate }}>{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={f.student_name} size={34} radius={9} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{f.student_name}</div>
                            <div style={{ fontSize: 11, color: T.slate }}>{f.student_id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{f.course_name}</div>
                      </td>
                      <td style={{ fontWeight: 700, fontSize: 13 }}>{fmt(f.total_fee)}</td>
                      <td style={{ color: T.sage, fontWeight: 600, fontSize: 13 }}>{fmt(f.amount_paid)}</td>
                      <td style={{
                        color: parseFloat(f.balance) > 0 ? T.rose : T.sage,
                        fontWeight: 600, fontSize: 13
                      }}>
                        {fmt(f.balance)}
                      </td>
                      <td style={{ minWidth: 120 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, background: '#e9ecef', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${paidPct}%`,
                              background: paidPct === 100 ? T.sage : paidPct >= 50 ? T.amber : T.rose,
                              borderRadius: 4
                            }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600 }}>{paidPct}%</span>
                        </div>
                      </td>
                      <td>
                        <Badge
                          text={f.is_fully_paid ? 'Fully Paid' : 'Pending'}
                          variant={f.is_fully_paid ? 'success' : 'danger'}
                        />
                      </td>
                      <td>
                        {/* Only Bill download — no Pay button for counselor */}
                        <button
                          className="counselor-btn counselor-btn-success counselor-btn-sm"
                          onClick={() => downloadBill(f.id, f.student_name)}
                        >
                          <i className="fas fa-file-invoice" /> Bill
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}




// ══════════════════════════════════════════════════════════════════════════════
// COUNSELOR ANNOUNCEMENTS  (create/manage own branch announcements)
// Route: /counselor/announcements
// ══════════════════════════════════════════════════════════════════════════════
export function CounselorAnnouncements() {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showViewModal, setShowViewModal] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(null)

  const emptyForm = { title: '', message: '', announcement_type: 'general', recipient_type: 'all', is_published: true, specific_batch: '' }
  const [form, setForm] = useState(emptyForm)
  const [audience, setAudience] = useState({ toStudents: true, toMentors: true })
  const [batches, setBatches] = useState([])
  const [students, setStudents] = useState([])
  const [selectedStudents, setSelectedStudents] = useState([])
  const [studentSearch, setStudentSearch] = useState('')

  useEffect(() => { load() }, [])

  useEffect(() => {
    api.get('/counselor/branch-batches/').then(r => setBatches(r.data || []))
    api.get('/counselor/branch-students/').then(r => setStudents(r.data || []))
  }, [])

  const handleBatchChange = async (batchId) => {
    setForm(p => ({ ...p, specific_batch: batchId, recipient_type: batchId ? 'specific_batch' : 'all' }))
    setSelectedStudents([])
    if (batchId) {
      const r = await api.get(`/counselor/branch-students/?batch=${batchId}`)
      setStudents(r.data || [])
    } else {
      const r = await api.get('/counselor/branch-students/')
      setStudents(r.data || [])
    }
  }

  const toggleStudent = (sid) => {
    setSelectedStudents(prev => prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid])
  }

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/counselor/announcements/')
      const data = res.data.results || res.data || []
      setAnnouncements(data)
    } catch { toast.error('Failed to load announcements') }
    finally { setLoading(false) }
  }

  const handleAudienceChange = (type, checked) => {
    const next = { ...audience, [type]: checked }
    setAudience(next)
    const { toStudents, toMentors } = next
    if (toStudents && toMentors) setForm(p => ({ ...p, recipient_type: 'all' }))
    else if (toStudents && !toMentors) setForm(p => ({ ...p, recipient_type: 'students' }))
    else if (!toStudents && toMentors) setForm(p => ({ ...p, recipient_type: 'mentors' }))
    else setForm(p => ({ ...p, recipient_type: 'specific' }))
  }

  const resetForm = () => { setForm(emptyForm); setAudience({ toStudents: true, toMentors: true }); setSelectedStudents([]); setStudentSearch('') }

  const validate = () => {
    if (!form.title.trim()) { toast.error('Enter a title'); return false }
    if (!form.message.trim()) { toast.error('Enter a message'); return false }
    if (form.recipient_type === 'specific_student' && selectedStudents.length === 0) {
      toast.error('Select at least one student'); return false
    }
    return true
  }

  const payload = () => ({
    title: form.title, message: form.message,
    announcement_type: form.announcement_type,
    recipient_type: form.recipient_type,
    is_published: form.is_published,
    specific_batch: form.specific_batch || null,
    specific_student_ids: selectedStudents,
  })

  const handleCreate = async (e) => {
    e.preventDefault(); if (!validate()) return; setSaving(true)
    try {
      await api.post('/counselor/announcements/create/', payload())
      toast.success(form.is_published ? 'Announcement published!' : 'Saved as draft!')
      resetForm(); setShowCreateModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to create') }
    finally { setSaving(false) }
  }

  const openEdit = (ann) => {
    setForm({ title: ann.title, message: ann.message, announcement_type: ann.announcement_type, recipient_type: ann.recipient_type, is_published: ann.is_published })
    const r = ann.recipient_type
    setAudience({ students: r === 'all' || r === 'students', mentors: r === 'all' || r === 'mentors' })
    setShowEditModal(ann)
  }

  const handleUpdate = async (e) => {
    e.preventDefault(); if (!validate()) return; setSaving(true)
    try {
      await api.patch(`/counselor/announcements/${showEditModal.id}/update/`, payload())
      toast.success('Announcement updated!')
      resetForm(); setShowEditModal(null); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to update') }
    finally { setSaving(false) }
  }

  const handleToggle = async (id) => {
    try {
      const res = await api.patch(`/counselor/announcements/${id}/toggle/`)
      toast.success(res.data.is_published ? 'Published!' : 'Unpublished'); load()
    } catch { toast.error('Failed to toggle') }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/counselor/announcements/${id}/delete/`)
      toast.success('Deleted'); setShowDeleteModal(null); load()
    } catch { toast.error('Failed to delete') }
  }

  const TYPE_META = {
    important: { bg: '#fdeaec', color: '#e84855', label: 'Important', icon: 'fa-exclamation-triangle' },
    holiday: { bg: '#fef5e4', color: '#f4a940', label: 'Holiday', icon: 'fa-umbrella-beach' },
    event: { bg: '#e8f8f0', color: '#4caf81', label: 'Event', icon: 'fa-calendar-star' },
    update: { bg: '#e4f2fd', color: '#2ec4b6', label: 'Update', icon: 'fa-sync-alt' },
    general: { bg: '#f0f3f7', color: '#8099b3', label: 'General', icon: 'fa-bullhorn' },
    exam: { bg: '#e4f2fd', color: '#1a2e4a', label: 'Exam', icon: 'fa-file-alt' },
    course: { bg: '#e8f8f0', color: '#4caf81', label: 'Course', icon: 'fa-book-open' },
  }
  const TypeBadge = ({ type }) => {
    const m = TYPE_META[type] || TYPE_META.general
    return (
      <span style={{
        background: m.bg, color: m.color, padding: '4px 12px', borderRadius: 20,
        fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5
      }}>
        <i className={`fas ${m.icon}`} style={{ fontSize: 10 }} /> {m.label}
      </span>
    )
  }

  const isOwn = (ann) => ann.created_by_name === user?.username



  if (loading) return <div className="counselor-root"><Styles /><Spin /></div>

  const myAnn = announcements   // API already returns only this counselor's announcements
  const published = announcements.filter(a => a.is_published).length
  const drafts = announcements.filter(a => !a.is_published).length

  return (
    <div className="counselor-root">
      <Styles />
      <PH
        title="📢 My Announcements"
        sub="Send announcements to your branch mentors & students"
        btn={<button className="counselor-btn counselor-btn-primary" onClick={() => setShowCreateModal(true)}><i className="fas fa-plus" /> New Announcement</button>}
      />

      <div className="counselor-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', marginBottom: 28 }}>
        {[
          { label: 'Total', value: myAnn.length, icon: 'fa-bullhorn', bg: 'rgba(46,196,182,.1)', color: T.teal },
          { label: 'Published', value: published, icon: 'fa-check-circle', bg: 'rgba(76,175,129,.1)', color: T.sage },
          { label: 'Drafts', value: drafts, icon: 'fa-eye-slash', bg: 'rgba(244,169,64,.1)', color: T.amber },
        ].map(s => (
          <div key={s.label} className="counselor-stat-card">
            <div className="counselor-stat-icon" style={{ background: s.bg, color: s.color }}><i className={`fas ${s.icon}`} /></div>
            <div><div className="counselor-stat-value">{s.value}</div><div className="counselor-stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      <div className="counselor-card">
        <SH title="✍️ My Announcements" count={myAnn.length} actions={<button className="counselor-btn counselor-btn-primary counselor-btn-sm" onClick={() => setShowCreateModal(true)}><i className="fas fa-plus" /> Create</button>} />
        {myAnn.length === 0 ? (
          <Empty msg="You haven't created any announcements yet." icon="fa-bullhorn" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="counselor-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th><th>Title</th><th>Type</th><th>Audience</th><th style={{ width: 100 }}>Date</th><th style={{ width: 90 }}>Status</th><th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {myAnn.map((ann, idx) => (
                  <tr key={ann.id}>
                    <td style={{ color: T.slate, fontSize: 12 }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{ann.title}</div>
                      <div style={{ color: T.slate, fontSize: 11, marginTop: 3 }}>{ann.message?.substring(0, 55)}{ann.message?.length > 55 ? '…' : ''}</div>
                    </td>
                    <td><TypeBadge type={ann.announcement_type} /></td>
                    {ann.recipient_type === 'specific_batch' && (
                      <div>
                        <span style={{ background: '#fef5e4', color: '#8a5a00', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, display: 'inline-block' }}>
                          📦 {ann.specific_batch_details?.batch_number || ann.specific_batch_name}
                        </span>
                        {ann.specific_batch_details && (
                          <div style={{ fontSize: 11, color: T.slate, marginTop: 4 }}>
                            {ann.specific_batch_details.course_name && <div>📚 {ann.specific_batch_details.course_name}</div>}
                            {ann.specific_batch_details.trainer_name && <div>👨‍🏫 {ann.specific_batch_details.trainer_name}</div>}
                            {ann.specific_batch_details.batch_timing && <div>⏰ {ann.specific_batch_details.batch_timing}</div>}
                          </div>
                        )}
                      </div>
                    )}
                    <td style={{ fontSize: 12, color: T.slate }}>{new Date(ann.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span style={{ background: ann.is_published ? '#e8f8f0' : '#f0f3f7', color: ann.is_published ? T.sage : T.slate, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                        {ann.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="counselor-btn counselor-btn-ghost counselor-btn-icon" onClick={() => setShowViewModal(ann)} title="View"><i className="fas fa-eye" style={{ fontSize: 12 }} /></button>
                        <button className="counselor-btn counselor-btn-teal counselor-btn-icon" onClick={() => openEdit(ann)} title="Edit"><i className="fas fa-edit" style={{ fontSize: 12 }} /></button>
                        <button className="counselor-btn counselor-btn-icon" onClick={() => handleToggle(ann.id)} title={ann.is_published ? 'Unpublish' : 'Publish'} style={{ background: ann.is_published ? '#fef5e4' : '#e8f8f0', color: ann.is_published ? T.amber : T.sage }}>
                          <i className={`fas ${ann.is_published ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: 12 }} />
                        </button>
                        <button className="counselor-btn counselor-btn-danger counselor-btn-icon" onClick={() => setShowDeleteModal(ann)} title="Delete"><i className="fas fa-trash-alt" style={{ fontSize: 12 }} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE */}
      <Modal open={showCreateModal} onClose={() => { resetForm(); setShowCreateModal(false) }} title="📢 Create Announcement" size="md">
        <form onSubmit={handleCreate}>

          {/* Title */}
          <div className="counselor-fg">
            <label className="counselor-label">Title <span className="counselor-req">*</span></label>
            <input className="counselor-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Enter title" />
          </div>

          {/* Type */}
          <div className="counselor-fg">
            <label className="counselor-label">Type</label>
            <select className="counselor-select" value={form.announcement_type} onChange={e => setForm(p => ({ ...p, announcement_type: e.target.value }))}>
              <option value="general">📢 General Announcement</option>
              <option value="important">⚠️ Important Notice</option>
              <option value="holiday">🎉 Holiday Notice</option>
              <option value="event">🎯 Event Announcement</option>
              <option value="exam">📝 Exam Schedule</option>
              <option value="course">📚 Course Related</option>
              <option value="update">🔄 Update</option>
            </select>
          </div>

          {/* Audience Mode */}
          <div className="counselor-fg">
            <label className="counselor-label">Send To</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10 }}>
              {[
                { val: 'all', label: 'All (Students & Mentors)', icon: 'fa-users', color: T.teal },
                { val: 'students', label: 'All Students', icon: 'fa-user-graduate', color: T.sage },
                { val: 'mentors', label: 'All Mentors', icon: 'fa-chalkboard-teacher', color: T.amber },
                { val: 'specific_batch', label: 'Specific Batch', icon: 'fa-layer-group', color: T.rose },
                { val: 'specific_student', label: 'Specific Student', icon: 'fa-user', color: T.navy },
              ].map(opt => (
                <label key={opt.val} onClick={async () => {
                  setForm(p => ({ ...p, recipient_type: opt.val, specific_batch: '' }))
                  if (opt.val === 'specific_student') {
                    try {
                      const r = await api.get('/counselor/branch-students/')
                      console.log('Students API response:', r.data)
                      const data = Array.isArray(r.data) ? r.data : (r.data.results || [])
                      console.log('Students to set:', data.length)
                      setStudents(data)
                    } catch (e) { console.error('Students load error:', e) }
                  }
                }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${form.recipient_type === opt.val ? opt.color : T.border}`,
                    background: form.recipient_type === opt.val ? `${opt.color}15` : T.white,
                    fontSize: 12, fontWeight: form.recipient_type === opt.val ? 600 : 400
                  }}>
                  <i className={`fas ${opt.icon}`} style={{ color: opt.color, fontSize: 14 }} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Batch selector with trainer name */}
          {form.recipient_type === 'specific_batch' && (
            <div className="counselor-fg">
              <label className="counselor-label">Select Batch</label>
              <select
                className="counselor-select"
                value={form.specific_batch}
                onChange={e => handleBatchChange(e.target.value)}
              >
                <option value="">— Choose a batch —</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.display_text || `${b.batch_number} — ${b.course_name || 'Course'} (👨‍🏫 ${b.trainer_name || 'No trainer'}) — ${b.batch_timing || 'Timing'}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Student selector */}
          {form.recipient_type === 'specific_student' && (
            <div className="counselor-fg">
              <label className="counselor-label">
                Select Students
                {selectedStudents.length > 0 && (
                  <span style={{ marginLeft: 8, background: T.teal, color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>
                    {selectedStudents.length} selected
                  </span>
                )}
              </label>
              {/* Optional batch filter */}
              <select className="counselor-select" style={{ marginBottom: 8 }}
                onChange={e => handleBatchChange(e.target.value)} value={form.specific_batch}>
                <option value="">All Students (filter by batch)</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.batch_number} — {b.batch_timing || 'N/A'}
                  </option>
                ))}
              </select>
              <input className="counselor-input" style={{ marginBottom: 8 }}
                placeholder="🔍 Search student name or ID…"
                value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
              <div style={{
                maxHeight: 180, overflowY: 'auto', border: `1.5px solid ${T.border}`,
                borderRadius: 10, background: T.white
              }}>
                {students.filter(s =>
                  `${s.name} ${s.student_id}`.toLowerCase().includes(studentSearch.toLowerCase())
                ).map(s => (
                  <label key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                    background: selectedStudents.includes(s.id) ? '#e8f8f0' : 'transparent',
                    borderBottom: `1px solid ${T.border}`
                  }}>
                    <input type="checkbox" checked={selectedStudents.includes(s.id)}
                      onChange={() => toggleStudent(s.id)}
                      style={{ width: 15, height: 15, accentColor: T.sage }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: T.slate }}>{s.student_id}</div>
                    </div>
                  </label>
                ))}
                {students.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: T.slate, fontSize: 13 }}>
                    No students found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Publish toggle */}
          <div className="counselor-fg">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.is_published} onChange={e => setForm(p => ({ ...p, is_published: e.target.checked }))} style={{ width: 16, height: 16, accentColor: T.teal }} />
              <span style={{ fontWeight: 600 }}>Publish immediately</span>
            </label>
            <span className="counselor-hint" style={{ marginLeft: 26 }}>Uncheck to save as draft.</span>
          </div>

          {/* Message */}
          <div className="counselor-fg">
            <label className="counselor-label">Message <span className="counselor-req">*</span></label>
            <textarea className="counselor-input" style={{ resize: 'vertical', fontFamily: 'inherit' }} rows={5} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Type your message here…" />
            <span className="counselor-hint" style={{ textAlign: 'right', display: 'block' }}>{form.message.length} characters</span>
          </div>
          <hr className="counselor-divider" />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="counselor-btn counselor-btn-ghost" onClick={() => { resetForm(); setShowCreateModal(false) }}>Cancel</button>
            <button type="submit" className="counselor-btn counselor-btn-primary" disabled={saving}>{saving ? 'Sending…' : (form.is_published ? 'Publish Now' : 'Save Draft')}</button>
          </div>
        </form>
      </Modal>

      {/* EDIT */}
      <Modal open={!!showEditModal} onClose={() => { resetForm(); setShowEditModal(null) }} title="✏️ Edit Announcement" size="md">
        <form onSubmit={handleUpdate}>

          {/* Title */}
          <div className="counselor-fg">
            <label className="counselor-label">Title <span className="counselor-req">*</span></label>
            <input className="counselor-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Enter title" />
          </div>

          {/* Type */}
          <div className="counselor-fg">
            <label className="counselor-label">Type</label>
            <select className="counselor-select" value={form.announcement_type} onChange={e => setForm(p => ({ ...p, announcement_type: e.target.value }))}>
              <option value="general">📢 General Announcement</option>
              <option value="important">⚠️ Important Notice</option>
              <option value="holiday">🎉 Holiday Notice</option>
              <option value="event">🎯 Event Announcement</option>
              <option value="exam">📝 Exam Schedule</option>
              <option value="course">📚 Course Related</option>
              <option value="update">🔄 Update</option>
            </select>
          </div>

          {/* Audience Mode */}
          <div className="counselor-fg">
            <label className="counselor-label">Send To</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10 }}>
              {[
                { val: 'all', label: 'All (Students & Mentors)', icon: 'fa-users', color: T.teal },
                { val: 'students', label: 'All Students', icon: 'fa-user-graduate', color: T.sage },
                { val: 'mentors', label: 'All Mentors', icon: 'fa-chalkboard-teacher', color: T.amber },
                { val: 'specific_batch', label: 'Specific Batch', icon: 'fa-layer-group', color: T.rose },
                { val: 'specific_student', label: 'Specific Student', icon: 'fa-user', color: T.navy },
              ].map(opt => (
                <label key={opt.val} onClick={async () => {
                  setForm(p => ({ ...p, recipient_type: opt.val, specific_batch: '' }))
                  if (opt.val === 'specific_student') {
                    try {
                      const r = await api.get('/counselor/branch-students/')
                      console.log('Students API response:', r.data)
                      const data = Array.isArray(r.data) ? r.data : (r.data.results || [])
                      console.log('Students to set:', data.length)
                      setStudents(data)
                    } catch (e) { console.error('Students load error:', e) }
                  }
                }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                    border: `2px solid ${form.recipient_type === opt.val ? opt.color : T.border}`,
                    background: form.recipient_type === opt.val ? `${opt.color}15` : T.white,
                    fontSize: 12, fontWeight: form.recipient_type === opt.val ? 600 : 400
                  }}>
                  <i className={`fas ${opt.icon}`} style={{ color: opt.color, fontSize: 14 }} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Batch selector */}
          {form.recipient_type === 'specific_batch' && (
            <div className="counselor-fg">
              <label className="counselor-label">Select Batch</label>
              <select
                className="counselor-select"
                value={form.specific_batch}
                onChange={e => handleBatchChange(e.target.value)}
              >
                <option value="">— Choose a batch —</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.display_text || `${b.batch_number} — ${b.course_name || 'Course'} (👨‍🏫 ${b.trainer_name || 'No trainer'}) — ${b.batch_timing || 'Timing'}`}
                  </option>
                ))}
              </select>
            </div>
          )}



          {/* Student selector */}
          {form.recipient_type === 'specific_student' && (
            <div className="counselor-fg">
              <label className="counselor-label">
                Select Students
                {selectedStudents.length > 0 && (
                  <span style={{ marginLeft: 8, background: T.teal, color: '#fff', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>
                    {selectedStudents.length} selected
                  </span>
                )}
              </label>
              {/* Optional batch filter */}
              <select className="counselor-select" style={{ marginBottom: 8 }}
                onChange={e => handleBatchChange(e.target.value)} value={form.specific_batch}>
                <option value="">All Students (filter by batch)</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.batch_number} — {b.batch_timing || 'N/A'}
                  </option>
                ))}
              </select>
              <input className="counselor-input" style={{ marginBottom: 8 }}
                placeholder="🔍 Search student name or ID…"
                value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
              <div style={{
                maxHeight: 180, overflowY: 'auto', border: `1.5px solid ${T.border}`,
                borderRadius: 10, background: T.white
              }}>
                {students.filter(s =>
                  `${s.name} ${s.student_id}`.toLowerCase().includes(studentSearch.toLowerCase())
                ).map(s => (
                  <label key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                    background: selectedStudents.includes(s.id) ? '#e8f8f0' : 'transparent',
                    borderBottom: `1px solid ${T.border}`
                  }}>
                    <input type="checkbox" checked={selectedStudents.includes(s.id)}
                      onChange={() => toggleStudent(s.id)}
                      style={{ width: 15, height: 15, accentColor: T.sage }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: T.slate }}>{s.student_id}</div>
                    </div>
                  </label>
                ))}
                {students.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: T.slate, fontSize: 13 }}>
                    No students found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Publish toggle */}
          <div className="counselor-fg">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.is_published} onChange={e => setForm(p => ({ ...p, is_published: e.target.checked }))} style={{ width: 16, height: 16, accentColor: T.teal }} />
              <span style={{ fontWeight: 600 }}>Publish immediately</span>
            </label>
            <span className="counselor-hint" style={{ marginLeft: 26 }}>Uncheck to save as draft.</span>
          </div>

          {/* Message */}
          <div className="counselor-fg">
            <label className="counselor-label">Message <span className="counselor-req">*</span></label>
            <textarea className="counselor-input" style={{ resize: 'vertical', fontFamily: 'inherit' }} rows={5} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Type your message here…" />
            <span className="counselor-hint" style={{ textAlign: 'right', display: 'block' }}>{form.message.length} characters</span>
          </div>
          <hr className="counselor-divider" />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className="counselor-btn counselor-btn-ghost" onClick={() => { resetForm(); setShowEditModal(null) }}>Cancel</button>
            <button type="submit" className="counselor-btn counselor-btn-teal" disabled={saving}>{saving ? 'Updating…' : 'Update'}</button>
          </div>
        </form>
      </Modal>

      {/* VIEW */}
      <Modal open={!!showViewModal} onClose={() => setShowViewModal(null)} title="📄 Announcement Details" size="md">
        {showViewModal && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <TypeBadge type={showViewModal.announcement_type} />
              <span style={{ background: showViewModal.is_published ? '#e8f8f0' : '#f0f3f7', color: showViewModal.is_published ? T.sage : T.slate, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                {showViewModal.is_published ? '✓ Published' : '⏸ Draft'}
              </span>
            </div>

            <h4 style={{ margin: '0 0 8px', fontFamily: "'Playfair Display'", color: T.navy }}>{showViewModal.title}</h4>

            <div style={{ display: 'flex', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: T.slate }}>
                <i className="fas fa-user" style={{ marginRight: 5 }} />
                {showViewModal.created_by_name || 'Me'}
              </span>
              <span style={{ fontSize: 12, color: T.slate }}>
                <i className="fas fa-calendar" style={{ marginRight: 5 }} />
                {new Date(showViewModal.created_at).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Audience Details Section - Shows batch info for specific_batch */}
            {showViewModal.recipient_type === 'specific_batch' && (
              <div style={{
                background: '#f8fafc',
                borderRadius: 12,
                padding: '16px 20px',
                marginBottom: 20,
                border: `1px solid ${T.border}`
              }}>
                <div style={{ fontWeight: 600, marginBottom: 12, color: T.navy, fontSize: 14 }}>
                  <i className="fas fa-layer-group" style={{ marginRight: 8 }} />
                  Batch Details
                </div>

                <div style={{
                  background: 'white',
                  borderRadius: 10,
                  padding: '14px 16px',
                  border: `1px solid ${T.border}`
                }}>
                  {/* Batch Number */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 12,
                    paddingBottom: 10,
                    borderBottom: `1px solid ${T.border}`
                  }}>
                    <i className="fas fa-tag" style={{ color: T.amber, fontSize: 16, width: 24 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ color: T.slate, fontSize: 11 }}>Batch Number</span>
                      <div style={{ fontWeight: 600, fontSize: 14, color: T.navy }}>
                        {showViewModal.specific_batch_details?.batch_number || showViewModal.specific_batch_name || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Trainer Name */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 12,
                    paddingBottom: 10,
                    borderBottom: `1px solid ${T.border}`
                  }}>
                    <i className="fas fa-chalkboard-teacher" style={{ color: T.teal, fontSize: 16, width: 24 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ color: T.slate, fontSize: 11 }}>Trainer Name</span>
                      <div style={{ fontWeight: 500, fontSize: 13, color: T.navy }}>
                        {showViewModal.specific_batch_details?.trainer_name || 'Loading...'}
                      </div>
                    </div>
                  </div>

                  {/* Batch Timing */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}>
                    <i className="fas fa-clock" style={{ color: T.sage, fontSize: 16, width: 24 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ color: T.slate, fontSize: 11 }}>Batch Timing</span>
                      <div style={{ fontWeight: 500, fontSize: 13, color: T.navy }}>
                        {showViewModal.specific_batch_details?.batch_timing || '—'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* For Specific Student */}
            {showViewModal.recipient_type === 'specific_student' && showViewModal.specific_students && showViewModal.specific_students.length > 0 && (
              <div style={{
                background: '#f8fafc',
                borderRadius: 12,
                padding: '16px 20px',
                marginBottom: 20,
                border: `1px solid ${T.border}`
              }}>
                <div style={{ fontWeight: 600, marginBottom: 12, color: T.navy, fontSize: 14 }}>
                  <i className="fas fa-user-graduate" style={{ marginRight: 8 }} />
                  Students ({showViewModal.specific_students.length})
                </div>

                <div style={{
                  background: 'white',
                  borderRadius: 10,
                  padding: '10px',
                  border: `1px solid ${T.border}`,
                  maxHeight: 200,
                  overflowY: 'auto'
                }}>
                  {showViewModal.specific_students.map((student, idx) => (
                    <div key={student.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderBottom: idx < showViewModal.specific_students.length - 1 ? `1px solid ${T.border}` : 'none'
                    }}>
                      <Avatar name={student.name} size={28} />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{student.name}</div>
                        <div style={{ fontSize: 11, color: T.slate }}>{student.student_id}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message */}
            <div style={{
              background: T.white,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: '18px 20px',
              lineHeight: 1.75,
              fontSize: 14,
              color: T.navyMid,
              whiteSpace: 'pre-wrap',
              marginBottom: 20
            }}>
              <div style={{ fontWeight: 600, marginBottom: 10, color: T.navy }}>
                <i className="fas fa-envelope" style={{ marginRight: 8 }} />
                Message
              </div>
              {showViewModal.message}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="counselor-btn counselor-btn-teal counselor-btn-sm" onClick={() => { setShowViewModal(null); openEdit(showViewModal) }}>
                <i className="fas fa-edit" /> Edit
              </button>
              <button className="counselor-btn counselor-btn-danger counselor-btn-sm" onClick={() => { setShowViewModal(null); setShowDeleteModal(showViewModal) }}>
                <i className="fas fa-trash-alt" /> Delete
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* DELETE */}
      <Modal open={!!showDeleteModal} onClose={() => setShowDeleteModal(null)} title="🗑️ Delete Announcement" size="sm">
        {showDeleteModal && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fdeaec', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28, color: T.rose }}>
              <i className="fas fa-exclamation-triangle" />
            </div>
            <h5 style={{ margin: '0 0 8px', fontFamily: "'Playfair Display'" }}>Are you sure?</h5>
            <p style={{ color: T.slate, fontSize: 13, margin: '0 0 20px' }}>This will permanently delete <strong>"{showDeleteModal.title}"</strong>.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="counselor-btn counselor-btn-ghost" onClick={() => setShowDeleteModal(null)}>Cancel</button>
              <button className="counselor-btn counselor-btn-danger" onClick={() => handleDelete(showDeleteModal.id)}><i className="fas fa-trash-alt" /> Yes, Delete</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
