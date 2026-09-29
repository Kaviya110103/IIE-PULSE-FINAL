
import { useState, useEffect, useCallback } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom' // ← ADD THIS

// ── Design tokens (same as CounselorPages) ─────────────────────────────────────────
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

const attendanceSessionText = (record) => {
  const count = Number(record.completed_session_count || 0)
  if (count > 0) return `${count} ${count === 1 ? 'Session' : 'Sessions'}`
  if (record.session_number) return `Session ${record.session_number}: ${record.session_title || ''}`
  return '-'
}

const getBatchDisplayName = (batch) => batch?.batch_code || batch?.display_name || batch?.batch_number || 'N/A'

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  .employee-root { font-family: 'DM Sans', sans-serif; color: ${T.navy}; }
  .employee-root h1, .employee-root h2, .employee-root h3, .employee-root h4, .employee-root h5 { font-family: 'Playfair Display', serif; }

  .employee-card {
    background: #fff; border-radius: 16px;
    box-shadow: ${T.shadow}; border: 1px solid ${T.border}; overflow: hidden;
  }
  .employee-card-header {
    padding: 16px 22px; border-bottom: 1px solid ${T.border};
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
  }
  .employee-card-header h5 { margin: 0; font-family: 'Playfair Display'; font-size: 17px; font-weight: 600; }

  .employee-page-header {
    margin-bottom: 24px; padding-bottom: 18px; border-bottom: 2px solid ${T.border};
    display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  }
  .employee-page-header h3 {
    margin: 0 0 4px; font-size: 24px;
    background: linear-gradient(135deg,${T.navy},${T.navyLight});
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .employee-page-header p { margin: 0; color: ${T.slate}; font-size: 13.5px; }

  .employee-table { width: 100%; border-collapse: collapse; }
  .employee-table th {
    background: linear-gradient(135deg,${T.navy},${T.navyMid});
    color: white; font-size: 11px; font-weight: 600;
    letter-spacing: .7px; text-transform: uppercase;
    padding: 13px 14px; text-align: left; white-space: nowrap;
  }
  .employee-table td {
    padding: 12px 14px; border-bottom: 1px solid ${T.border};
    font-size: 13.5px; color: ${T.navy};
  }
  .employee-table tr:last-child td { border-bottom: none; }
  .employee-table tr { transition: background .15s; }
  .employee-table tr:hover td { background: rgba(244,169,64,.04); }

  .employee-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 9px 18px; border-radius: 10px; border: none;
    font-family: 'DM Sans'; font-weight: 600; font-size: 13px;
    cursor: pointer; transition: all .18s; white-space: nowrap;
  }
  .employee-btn-primary { background: ${T.amber}; color: ${T.navy}; }
  .employee-btn-primary:hover { background: ${T.amberLight}; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(244,169,64,.35); }
  .employee-btn-ghost { background: transparent; color: ${T.slate}; border: 1.5px solid ${T.border}; }
  .employee-btn-ghost:hover { background: ${T.white}; color: ${T.navy}; border-color: ${T.slateLight}; }
  .employee-btn-danger { background: ${T.rose}; color: white; }
  .employee-btn-danger:hover { filter: brightness(1.1); }
  .employee-btn-teal { background: ${T.teal}; color: white; }
  .employee-btn-teal:hover { filter: brightness(1.08); }
  .employee-btn-sm { padding: 5px 12px; font-size: 12px; border-radius: 8px; }
  .employee-btn-icon { padding: 7px 10px; border-radius: 8px; }

  .employee-input {
    padding: 9px 13px; border: 1.5px solid ${T.border};
    border-radius: 10px; font-family: 'DM Sans'; font-size: 13px;
    outline: none; transition: border .18s, box-shadow .18s; background: ${T.white};
    width: 100%; box-sizing: border-box; color: ${T.navy};
  }
  .employee-input:focus { border-color: ${T.amber}; box-shadow: 0 0 0 3px rgba(244,169,64,.15); }

  .employee-select {
    padding: 9px 13px; border: 1.5px solid ${T.border};
    border-radius: 10px; font-family: 'DM Sans'; font-size: 13px;
    outline: none; transition: border .18s; background: ${T.white};
    width: 100%; box-sizing: border-box; color: ${T.navy};
    -webkit-appearance: none; appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238099b3' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px;
  }
  .employee-select:focus { border-color: ${T.amber}; box-shadow: 0 0 0 3px rgba(244,169,64,.15); }

  .employee-label { display: block; font-weight: 600; font-size: 13px; margin-bottom: 5px; color: ${T.navy}; }
  .employee-fg { margin-bottom: 16px; }
  .employee-hint { color: ${T.slate}; font-size: 11.5px; margin-top: 4px; display: block; }
  .employee-req { color: ${T.rose}; margin-left: 3px; }

  /* Stat Grid */
  .employee-stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 28px;
  }
  .employee-stat-card {
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
  .employee-stat-card:hover {
    transform: translateY(-2px);
    box-shadow: ${T.shadowMd};
  }
  .employee-stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }
  .employee-stat-value {
    font-size: 28px;
    font-weight: 700;
    color: ${T.navy};
    line-height: 1.2;
  }
  .employee-stat-label {
    font-size: 13px;
    color: ${T.slate};
    font-weight: 500;
  }

  /* Modal */
  .employee-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow-y: auto;
  }
  .employee-modal {
    background: #fff;
    border-radius: 20px;
    width: 100%;
    max-height: 90vh;
    margin: 20px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  }
  .employee-modal-header {
    padding: 20px 28px;
    background: #fff;
    border-bottom: 1px solid ${T.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 20px 20px 0 0;
  }
  .employee-modal-header h5 {
    margin: 0;
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 600;
    color: ${T.navy};
  }
  .employee-modal-close {
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
  .employee-modal-close:hover {
    background: #e2e8f0;
    color: ${T.navy};
  }
  .employee-modal-body {
    padding: 28px;
    overflow-y: auto;
    flex: 1;
  }

  /* Badge */
  .employee-badge {
    display: inline-flex; align-items: center; padding: 3px 10px;
    border-radius: 20px; font-size: 11.5px; font-weight: 600; white-space: nowrap; letter-spacing: .2px;
  }

  .employee-avatar {
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; color: white; flex-shrink: 0; font-family: 'DM Sans';
  }

  .employee-empty { padding: 60px; text-align: center; color: ${T.slate}; }
  .employee-empty-icon { font-size: 48px; opacity: 0.2; margin-bottom: 16px; }

  .employee-alert-info { background: #e4f2fd; border: none; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #1260a0; }
  .employee-alert-success { background: #e8f8f0; border: none; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #1a6b3e; }
  .employee-alert-warning { background: #fef5e4; border: none; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #8a5a00; }

  .employee-divider { border: none; border-top: 1px solid ${T.border}; margin: 20px 0; }

  .employee-row-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media(max-width:640px) { .employee-row-grid-2 { grid-template-columns: 1fr; } }

  @keyframes employeeSpin { to { transform: rotate(360deg); } }
  .employee-spin {
    width: 40px; height: 40px;
    border: 3px solid ${T.border};
    border-top-color: ${T.amber};
    border-radius: 50%;
    animation: employeeSpin 1s linear infinite;
    margin: 40px auto;
  }

  /* Batch Card Grid */
  .employee-batch-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 24px;
    margin-bottom: 30px;
  }
  .employee-batch-card {
    background: #fff;
    border-radius: 20px;
    overflow: hidden;
    transition: all 0.3s ease;
    border: 1px solid ${T.border};
    box-shadow: ${T.shadow};
  }
  .employee-batch-card:hover {
    transform: translateY(-5px);
    box-shadow: ${T.shadowMd};
  }
  .employee-batch-header {
    background: linear-gradient(135deg, ${T.navy}, ${T.navyMid});
    color: #fff;
    padding: 18px;
    text-align: center;
  }
  .employee-batch-header h4 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
  }
  .employee-batch-header p {
    margin: 5px 0 0;
    font-size: 13px;
    opacity: 0.85;
  }
  .employee-batch-body {
    padding: 18px;
  }
  .employee-batch-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid ${T.border};
    font-size: 13px;
  }
  .employee-batch-row span:first-child {
    font-weight: 600;
    color: ${T.navy};
  }
  .employee-batch-row span:last-child {
    color: ${T.slate};
    text-align: right;
  }
  .employee-batch-footer {
    padding: 15px;
    background: rgba(15,27,45,0.03);
    border-top: 1px solid ${T.border};
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .employee-batch-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
`

// ── Shared components ─────────────────────────────────────────────────────────
const downloadPdf = async (endpoint, filters, filename) => {
  const params = new URLSearchParams()
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value) params.append(key, value)
  })
  const query = params.toString()
  const res = await api.get(`${endpoint}${query ? `?${query}` : ''}`, { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const toLocalDateInputValue = (date) => {
  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10)
}

function Styles() { return <style>{css}</style> }

const Spin = () => (
  <div style={{ padding: 56, textAlign: 'center' }}>
    <div className="employee-spin" />
  </div>
)

const Empty = ({ msg = 'No data found.', icon = 'fa-inbox' }) => (
  <div className="employee-empty">
    <div className="employee-empty-icon"><i className={`fas ${icon}`} /></div>
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
    <div className="employee-avatar" style={{ width: size, height: size, borderRadius: radius, background: avatarGrad(name), fontSize: size * 0.38 }}>
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
    default: { bg: '#f0f3f7', color: T.slate },
  }
  const s = variants[variant] || variants.default
  return <span className="employee-badge" style={{ background: s.bg, color: s.color }}>{text}</span>
}

// Modal
function Modal({ open, onClose, title, children, size = 'lg' }) {
  if (!open) return null
  const maxW = { xl: 960, lg: 820, md: 600, sm: 460 }[size] || 820
  return (
    <div className="employee-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="employee-modal" style={{ maxWidth: maxW }}>
        <div className="employee-modal-header">
          <h5>{title}</h5>
          <button className="employee-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="employee-modal-body">{children}</div>
      </div>
    </div>
  )
}

// Page header
function PH({ title, sub, btn }) {
  return (
    <div className="employee-page-header">
      <div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>
      {btn}
    </div>
  )
}

// Section header
function SH({ title, count, actions }) {
  return (
    <div className="employee-card-header">
      <h5>{title}{count != null && <span style={{ color: T.slate, fontWeight: 400, fontFamily: "'DM Sans'", fontSize: 14, marginLeft: 8 }}>({count})</span>}</h5>
      {actions}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// EMPLOYEE DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function formatActivityTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSimpleDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function MentorStudentMonitoring() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [filters, setFilters] = useState({ date_from: '', date_to: '', search: '' })

  const load = async (nextFilters = filters) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      const query = params.toString()
      const res = await api.get(`/staff/monitoring/students/${query ? `?${query}` : ''}`)
      setRecords(res.data.results || [])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load student login records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const applyPreset = (preset) => {
    const now = new Date()
    const toISO = (date) => date.toISOString().slice(0, 10)
    let date_from = ''
    let date_to = toISO(now)

    if (preset === 'today') date_from = date_to
    if (preset === 'yesterday') {
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      date_from = toISO(yesterday)
      date_to = date_from
    }
    if (preset === 'week') {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - 6)
      date_from = toISO(weekStart)
    }
    if (preset === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      date_from = toISO(monthStart)
    }

    const next = { ...filters, date_from, date_to }
    setFilters(next)
    load(next)
  }

  const clearFilters = () => {
    const empty = { date_from: '', date_to: '', search: '' }
    setFilters(empty)
    load(empty)
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadPdf('/staff/monitoring/students/report/', filters, 'student_login_records_report.pdf')
      toast.success('PDF downloaded')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to download PDF')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH
        title="Student Login Records"
        sub="Login, logout, and last-seen activity for your assigned students only"
        btn={<button className="employee-btn employee-btn-primary" type="button" onClick={handleDownload} disabled={downloading}><i className="fas fa-file-pdf" /> {downloading ? 'Downloading...' : 'Download PDF'}</button>}
      />

      <div className="employee-card" style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <div>
            <label className="employee-label">From</label>
            <input className="employee-input" type="date" value={filters.date_from} onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))} />
          </div>
          <div>
            <label className="employee-label">To</label>
            <input className="employee-input" type="date" value={filters.date_to} onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))} />
          </div>
          <div>
            <label className="employee-label">Search</label>
            <input className="employee-input" value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} placeholder="Name, email, student ID" />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="employee-btn employee-btn-ghost employee-btn-sm" type="button" onClick={() => applyPreset('today')}>Today</button>
            <button className="employee-btn employee-btn-ghost employee-btn-sm" type="button" onClick={() => applyPreset('yesterday')}>Yesterday</button>
            <button className="employee-btn employee-btn-ghost employee-btn-sm" type="button" onClick={() => applyPreset('week')}>This Week</button>
            <button className="employee-btn employee-btn-ghost employee-btn-sm" type="button" onClick={() => applyPreset('month')}>This Month</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="employee-btn employee-btn-ghost" type="button" onClick={clearFilters}><i className="fas fa-times" /> Clear</button>
            <button className="employee-btn employee-btn-primary" type="button" onClick={() => load(filters)}><i className="fas fa-filter" /> Apply</button>
          </div>
        </div>
      </div>

      <div className="employee-card">
        <SH title="Student Login Records" count={records.length} />
        {loading ? <Spin /> : records.length === 0 ? (
          <Empty msg="No login records found for your students" icon="fa-user-clock" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Branch</th>
                  <th>Login Time</th>
                  <th>Logout Time</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {records.map(record => (
                  <tr key={record.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={record.name} size={34} />
                        <div>
                          <div style={{ fontWeight: 700 }}>{record.name || '-'}</div>
                          <div style={{ color: T.slate, fontSize: 12 }}>{record.email || record.student_id || ''}</div>
                        </div>
                      </div>
                    </td>
                    <td>{record.branch || '-'}</td>
                    <td>{formatActivityTime(record.login_time)}</td>
                    <td>{record.logout_time ? formatActivityTime(record.logout_time) : <Badge text="Still active" variant="success" />}</td>
                    <td>{formatActivityTime(record.last_seen)}</td>
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

export function EmployeeDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()  // ← ADD THIS

  useEffect(() => {
    api.get('/dashboard/employee/').then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="employee-root"><Styles /><Spin /></div>

  const stats = [
    { label: 'My Batches', value: data?.my_batches_count, icon: 'fa-users', color: T.teal, bgColor: 'rgba(46,196,182,0.1)', to: '/employee/batches' },
    { label: 'My Students', value: data?.my_students_count, icon: 'fa-user-graduate', color: T.sage, bgColor: 'rgba(76,175,129,0.1)', to: '/employee/students' },
    { label: 'Materials', value: data?.materials_count, icon: 'fa-book', color: T.navy, bgColor: 'rgba(15,27,45,0.1)', to: '/employee/materials' },
    { label: 'My Graduates', value: data?.completed_students_count, icon: 'fa-graduation-cap', color: T.rose, bgColor: 'rgba(232,72,85,0.1)', to: '/employee/completed' },
    { label: 'Reassigned Students', value: data?.reassigned_students_count, icon: 'fa-user-clock', color: T.amber, bgColor: 'rgba(244,169,64,0.1)', to: '/employee/reassigned-students' },
  ]

  return (
    <div className="employee-root">
      <Styles />
      <PH
        title={`👋 Welcome, ${data?.employee?.first_name || 'Employee'}!`}
        sub={`${data?.employee?.designation || 'Staff'} — ${data?.employee?.branch || 'Branch'} Branch`}
      />

      <div className="employee-stat-grid">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="employee-stat-card"
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
            <div className="employee-stat-icon" style={{ background: stat.bgColor, color: stat.color }}>
              <i className={`fas ${stat.icon}`} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="employee-stat-value">{stat.value ?? 0}</div>
              <div className="employee-stat-label">{stat.label}</div>
            </div>
            <i className="fas fa-arrow-right" style={{ color: stat.color, opacity: 0.4, fontSize: 12 }} />
          </div>
        ))}
      </div>

      {/* {data?.announcements?.length > 0 && (
        <div className="employee-card">
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

// ══════════════════════════════════════════════════════════════════════════════
// VIEW BATCHES
// ══════════════════════════════════════════════════════════════════════════════
export function ViewBatches() {
  const location = useLocation()
  const [batches, setBatches] = useState([])
  const [previousBatches, setPreviousBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sessionsModal, setSessionsModal] = useState(null)
  const [studentsModal, setStudentsModal] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      const suffix = params.toString() ? `?${params.toString()}` : ''
      const previousSuffix = params.toString() ? `?access=previous&${params.toString()}` : '?access=previous'
      Promise.all([
        api.get(`/batches/${suffix}`),
        api.get(`/batches/${previousSuffix}`).catch(() => ({ data: { results: [] } })),
      ]).then(([activeRes, previousRes]) => {
        setBatches(activeRes.data.results || activeRes.data || [])
        setPreviousBatches(previousRes.data.results || previousRes.data || [])
      }).finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const sessionBatchId = new URLSearchParams(location.search).get('session_batch_id')
    const allBatches = [...batches, ...previousBatches.map(batch => ({ ...batch, accessStatus: 'previous' }))]
    if (!sessionBatchId || allBatches.length === 0) return
    const matchedBatch = allBatches.find(batch => String(batch.id) === String(sessionBatchId))
    if (matchedBatch) setSessionsModal(matchedBatch)
  }, [batches, previousBatches, location.search])

  return (
    <div className="employee-root">
      <Styles />
      <PH title="📘 My Batches" sub="View and manage your assigned batches" />

      <div className="employee-card" style={{ marginBottom: 18 }}>
        <div className="employee-card-body" style={{ padding: 16 }}>
          <div className="employee-fg" style={{ margin: 0 }}>
            <label className="employee-label">Search Batches</label>
            <div style={{ position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: T.slate }} />
              <input
                className="employee-input"
                style={{ paddingLeft: 42 }}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by course, batch, student, timing..."
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="employee-card"><Spin /></div>
      ) : batches.length === 0 ? (
        <div className="employee-card">
          <Empty msg={search.trim() ? "No matching active batches found." : "No batches assigned to you."} icon="fa-users" />
        </div>
      ) : (
        <div className="employee-batch-grid">
          {batches.map(batch => (
            <BatchCard
              key={batch.id}
              batch={batch}
              accessStatus="active"
              onViewSessions={() => setSessionsModal(batch)}
              onViewStudents={() => setStudentsModal(batch)}
            />
          ))}
        </div>
      )}

      {previousBatches.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <SH title="Previous / Reassigned Batches" count={previousBatches.length} />
          <div className="employee-alert-info" style={{ marginBottom: 14 }}>
            <i className="fas fa-info-circle" /> Previous trainers can view sessions and attendance history, and can still upload learning materials or quizzes. Attendance and logsheet updates are disabled.
          </div>
          <div className="employee-batch-grid">
            {previousBatches.map(batch => (
              <BatchCard
                key={`previous-${batch.id}`}
                batch={{ ...batch, accessStatus: 'previous' }}
                accessStatus="previous"
                onViewSessions={() => setSessionsModal({ ...batch, accessStatus: 'previous' })}
                onViewStudents={() => setStudentsModal({ ...batch, accessStatus: 'previous' })}
              />
            ))}
          </div>
        </div>
      )}

      {sessionsModal && <SessionsModal batch={sessionsModal} onClose={() => setSessionsModal(null)} />}
      {studentsModal && <StudentsModal batch={studentsModal} onClose={() => setStudentsModal(null)} />}
    </div>
  )
}

export function StaffBatchDetails() {
  const { batchId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loginModal, setLoginModal] = useState(null)
  const [attendanceStudentFilter, setAttendanceStudentFilter] = useState('')

  useEffect(() => {
    setAttendanceStudentFilter('')
    setLoading(true)
    api.get(`/batches/${batchId}/staff-detail-report/`)
      .then(res => setData(res.data))
      .catch(err => toast.error(err.response?.data?.error || 'Failed to load batch details'))
      .finally(() => setLoading(false))
  }, [batchId])

  const batch = data?.batch || {}
  const summary = data?.summary || {}
  const staffLogin = data?.staff_login || {}
  const trainerText = (batch.trainers || [])
    .map(trainer => `${trainer.name}${trainer.timing ? ` - ${trainer.timing}` : ''}`)
    .join(', ')

  const attendanceRecords = data?.attendance_records || []
  const attendanceStudentOptions = Array.from(
    new Map(attendanceRecords.map(record => {
      const value = `${record.student_id || '-'}|${record.student_name || '-'}`
      return [value, {
        value,
        label: `${record.student_name || '-'} (${record.student_id || '-'})`,
      }]
    })).values()
  ).sort((a, b) => a.label.localeCompare(b.label))
  const filteredAttendanceRecords = attendanceStudentFilter
    ? attendanceRecords.filter(record => `${record.student_id || '-'}|${record.student_name || '-'}` === attendanceStudentFilter)
    : attendanceRecords

  const loginDateKey = (value) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Unknown'
    return date.toISOString().slice(0, 10)
  }

  const groupLoginRecords = (records, keyBuilder, rowBuilder) => {
    const grouped = new Map()
    ;(records || []).forEach(record => {
      const key = keyBuilder(record)
      if (!grouped.has(key)) grouped.set(key, { ...rowBuilder(record), records: [] })
      grouped.get(key).records.push(record)
    })
    return Array.from(grouped.values()).map(row => ({ ...row, login_count: row.records.length }))
  }

  const studentLoginRows = groupLoginRecords(
    data?.student_login_records || [],
    record => `${record.student_id || '-'}|${loginDateKey(record.login_time)}`,
    record => ({
      student_id: record.student_id || '-',
      student_name: record.student_name || '-',
      date: loginDateKey(record.login_time),
      title: `${record.student_name || 'Student'} - ${formatSimpleDate(record.login_time)}`,
    })
  )

  const studentLoginTotal = (data?.student_login_records || []).length
  const staffLoginTotal = (staffLogin.records || []).length

  const staffLoginRows = groupLoginRecords(
    staffLogin.records || [],
    record => loginDateKey(record.login_time),
    record => ({
      staff_name: trainerText || 'Staff',
      date: loginDateKey(record.login_time),
      title: `Staff Login - ${formatSimpleDate(record.login_time)}`,
    })
  )

  const showHistory = (title, records) => {
    setLoginModal({ title, records: records || [] })
  }

  return (
    <div className="employee-root">
      <Styles />
      <div className="employee-page-header">
        <div>
          <h3><i className="fas fa-chart-line" /> Batch Details</h3>
          <p>Clear last 30 days view for attendance and login activity</p>
        </div>
        <button className="employee-btn employee-btn-ghost" onClick={() => navigate('/employee/batches')}>
          <i className="fas fa-arrow-left" /> Back
        </button>
      </div>

      {loading ? <div className="employee-card"><Spin /></div> : !data ? (
        <div className="employee-card"><Empty msg="Batch details not available" icon="fa-chart-line" /></div>
      ) : (
        <>
          <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${T.border}` }}>
            <h2 style={{ margin: '0 0 6px', fontSize: 24, color: T.navy }}>{batch.display_name || batch.batch_number}</h2>
            <div style={{ color: T.slate, lineHeight: 1.7, fontSize: 14 }}>
              <strong>{batch.course || '-'}</strong>{batch.course_type ? ` - ${batch.course_type}` : ''}<br />
              Start: {formatSimpleDate(batch.start_date)} | End: {formatSimpleDate(batch.end_date)} | Branch: {batch.branch || '-'}<br />
              Timing: {trainerText || batch.timing || '-'}
            </div>
          </div>

          <div style={{ marginBottom: 22, display: 'flex', flexWrap: 'wrap', gap: 10, color: T.navy, fontSize: 14 }}>
            <span><strong>{summary.student_count || 0}</strong> Students</span>
            <span>|</span>
            <span><strong>{summary.attendance_marked_days || 0}</strong> Attendance days</span>
            <span>|</span>
            <span><strong>{summary.staff_completed_sessions || 0}/{summary.total_sessions || 0}</strong> Staff sessions</span>
            <span>|</span>
            <span><strong>{summary.student_completed_sessions || 0}/{summary.student_total_session_slots || 0}</strong> Student sessions</span>
            <span>|</span>
            <span><strong>{summary.materials_uploaded || 0}</strong> Materials</span>
            <span>|</span>
            <span><strong>{summary.tests_uploaded || 0}</strong> Tests</span>
            <span>|</span>
            <span><strong>{summary.quizzes_uploaded || 0}</strong> Quizzes</span>
            <span>|</span>
            <span>Staff login: <strong>{staffLogin.login_usage_count || 0}/{staffLogin.login_usage_target || 7}</strong> ({staffLogin.login_usage_percentage || 0}%)</span>
          </div>

          <section style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, fontSize: 18, color: T.navy }}>Student Attendance Details</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <select
                  className="employee-input"
                  value={attendanceStudentFilter}
                  onChange={event => setAttendanceStudentFilter(event.target.value)}
                  style={{ width: 240, height: 38, padding: '0 12px' }}
                >
                  <option value="">All Students</option>
                  {attendanceStudentOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <span style={{ color: T.slate, fontSize: 13 }}>Last 30 days | {filteredAttendanceRecords.length}/{attendanceRecords.length} records</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <table className="employee-table">
                <thead><tr><th>Date</th><th>Student</th><th>Student ID</th><th>Status</th><th>Session</th><th>Marked By</th><th>Remarks</th></tr></thead>
                <tbody>
                  {filteredAttendanceRecords.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', color: T.slate }}>No attendance records for the selected student in the last 30 days.</td></tr>
                  ) : filteredAttendanceRecords.map(record => (
                    <tr key={record.id}>
                      <td>{formatSimpleDate(record.date)}</td>
                      <td>{record.student_name || '-'}</td>
                      <td>{record.student_id || '-'}</td>
                      <td><Badge text={record.status || '-'} variant={record.status === 'Present' ? 'success' : 'danger'} /></td>
                      <td>{record.session || '-'}</td>
                      <td>{record.marked_by || '-'}</td>
                      <td>{record.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, fontSize: 18, color: T.navy }}>Student Login History ({studentLoginTotal})</h4>
              <span style={{ color: T.slate, fontSize: 13 }}>Per day login count</span>
            </div>
            <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <table className="employee-table">
                <thead><tr><th>Student ID</th><th>Name</th><th>Date</th><th>Login Count</th><th>History</th></tr></thead>
                <tbody>
                  {studentLoginRows.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: T.slate }}>No student login records in the last month.</td></tr>
                  ) : studentLoginRows.map(row => (
                    <tr key={`${row.student_id}-${row.date}`}>
                      <td>{row.student_id}</td>
                      <td>{row.student_name}</td>
                      <td>{formatSimpleDate(row.date)}</td>
                      <td>{row.login_count}</td>
                      <td><button className="employee-btn employee-btn-sm employee-btn-ghost" onClick={() => showHistory(row.title, row.records)}><i className="fas fa-eye" /> View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, fontSize: 18, color: T.navy }}>Staff Login History ({staffLoginTotal})</h4>
              <span style={{ color: T.slate, fontSize: 13 }}>Last month login count</span>
            </div>
            <div style={{ overflowX: 'auto', border: `1px solid ${T.border}`, borderRadius: 10 }}>
              <table className="employee-table">
                <thead><tr><th>Staff</th><th>Date</th><th>Login Count</th><th>History</th></tr></thead>
                <tbody>
                  {staffLoginRows.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', color: T.slate }}>No staff login records in the last month.</td></tr>
                  ) : staffLoginRows.map(row => (
                    <tr key={row.date}>
                      <td>{row.staff_name}</td>
                      <td>{formatSimpleDate(row.date)}</td>
                      <td>{row.login_count}</td>
                      <td><button className="employee-btn employee-btn-sm employee-btn-ghost" onClick={() => showHistory(row.title, row.records)}><i className="fas fa-eye" /> View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {loginModal && (
        <Modal open onClose={() => setLoginModal(null)} title={loginModal.title} size="md">
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead><tr><th>Login Time</th><th>Logout Time</th><th>Last Seen</th></tr></thead>
              <tbody>
                {loginModal.records.map((record, index) => (
                  <tr key={record.id || index}>
                    <td>{formatActivityTime(record.login_time)}</td>
                    <td>{formatActivityTime(record.logout_time)}</td>
                    <td>{formatActivityTime(record.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  )
}
// ─── Batch Card ────────────────────────────────────────────────────────────
function BatchCard({ batch, onViewSessions, onViewStudents, accessStatus = 'active' }) {
  const [renameOpen, setRenameOpen] = useState(false)
  const [batchCode, setBatchCode] = useState(getBatchDisplayName(batch))
  const [savingCode, setSavingCode] = useState(false)
  const isPrevious = accessStatus === 'previous' || batch.accessStatus === 'previous'
  const btn = (label, icon, color, onClick) => (
    <button
      onClick={onClick}
      className="employee-btn employee-btn-sm"
      style={{ background: 'transparent', border: `1.5px solid ${color}`, color }}
      onMouseEnter={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = '#fff' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = color }}
    >
      <i className={`fas ${icon}`} /> {label}
    </button>
  )

  const saveBatchCode = async () => {
    const nextCode = String(batchCode || '').trim()
    if (!nextCode) { toast.error('Batch code cannot be empty'); return }
    setSavingCode(true)
    try {
      const res = await api.patch(`/batches/${batch.id}/rename-code/`, { batch_code: nextCode })
      batch.batch_code = res.data.batch?.batch_code || nextCode
      setBatchCode(batch.batch_code)
      setRenameOpen(false)
      toast.success('Batch code updated')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update batch code')
    } finally {
      setSavingCode(false)
    }
  }

  return (
    <div className="employee-batch-card">
      <div className="employee-batch-header">
        <div>
          <h4>{batchCode}</h4>
          <p>{batch.course_name_display}</p>
        </div>
        <div style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
          <button type="button" className="employee-btn employee-btn-sm employee-btn-ghost" onClick={() => setRenameOpen(true)} title="Rename batch"><i className="fas fa-pen" /> Rename</button>
          <Link to={`/employee/batches/${batch.id}/details`} className="employee-btn employee-btn-sm" style={{ background: 'transparent', border: `1.5px solid ${T.amber}`, color: T.amber, textDecoration: 'none' }}><i className="fas fa-chart-line" /> Batch Details</Link>
        </div>
        {isPrevious && <Badge text="Previous Trainer" variant="warning" />}
      </div>
      {renameOpen && (
        <Modal open onClose={() => setRenameOpen(false)} title="Rename Batch" size="sm">
          <div style={{ display: 'grid', gap: 12 }}>
            <label className="employee-label">Batch Code</label>
            <input className="employee-input" value={batchCode} onChange={e => setBatchCode(e.target.value)} autoFocus />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="employee-btn employee-btn-ghost" onClick={() => setRenameOpen(false)}>Cancel</button>
              <button className="employee-btn employee-btn-primary" onClick={saveBatchCode} disabled={savingCode}>{savingCode ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </Modal>
      )}
      <div className="employee-batch-body">
        <div className="employee-batch-row">
          <span>Course Type:</span>
          <span>{batch.course_type || '—'}</span>
        </div>
        <div className="employee-batch-row">
          <span>Timing:</span>
          <span>{batch.batch_timing}</span>
        </div>
        <div className="employee-batch-row">
          <span>Start Date:</span>
          <span>{batch.start_date}</span>
        </div>
        <div className="employee-batch-row">
          <span>End Date:</span>
          <span>{batch.end_date}</span>
        </div>
        <div className="employee-batch-row">
          <span>Branch:</span>
          <span>{batch.branch}</span>
        </div>
      </div>
      <div className="employee-batch-footer">
        <div className="employee-batch-actions">
          {!isPrevious && (
            <a href={`/employee/attendance?batch_id=${batch.id}`} className="employee-btn employee-btn-sm" style={{ background: T.sage, color: '#fff', textDecoration: 'none' }}>
              <i className="fas fa-check-circle" /> Mark Attendance
            </a>
          )}
          <a href={`/employee/attendance-history?batch_id=${batch.id}`} className="employee-btn employee-btn-sm" style={{ background: 'transparent', border: `1.5px solid ${T.navy}`, color: T.navy, textDecoration: 'none' }}>
            <i className="fas fa-eye" /> View Attendance
          </a>
        </div>
        <div className="employee-batch-actions">
          {btn(isPrevious ? 'View Session History' : 'View Sessions', 'fa-list', T.rose, onViewSessions)}
          {btn('View Students', 'fa-users', T.teal, onViewStudents)}
          {isPrevious && <a href={`/employee/materials/upload?batch_id=${batch.id}`} className="employee-btn employee-btn-sm" style={{ background: 'transparent', border: `1.5px solid ${T.amber}`, color: T.amber, textDecoration: 'none' }}><i className="fas fa-upload" /> Material</a>}
          {isPrevious && <a href={`/employee/quiz/upload?batch_id=${batch.id}`} className="employee-btn employee-btn-sm" style={{ background: 'transparent', border: `1.5px solid ${T.teal}`, color: T.teal, textDecoration: 'none' }}><i className="fas fa-file-upload" /> Quiz</a>}
        </div>

      </div>
    </div>
  )
}

// ─── Attendance Records Modal ──────────────────────────────────────────────
function AttendanceModal({ batch, onClose }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState('all')
  const [studentFilter, setStudentFilter] = useState('')
  const [dateFilter, setDateFilter] = useState(toLocalDateInputValue(new Date()))

  useEffect(() => {
    api.get(`/batches/${batch.id}/attendance/`).then(r => setRecords(r.data)).finally(() => setLoading(false))
  }, [batch.id])

  const studentOptions = Array.from(
    records.reduce((map, record) => {
      const key = String(record.student || record.student_id || record.student_id_display || record.student_name || '')
      if (key && !map.has(key)) {
        map.set(key, {
          id: key,
          name: record.student_name || 'Student',
          studentId: record.student_id_display || '',
        })
      }
      return map
    }, new Map()).values()
  ).sort((a, b) => a.name.localeCompare(b.name))

  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const filteredRecords = records.filter(record => {
    const recordDate = new Date(record.date)
    const recordStudentKey = String(record.student || record.student_id || record.student_id_display || record.student_name || '')
    const matchesStudent = !studentFilter || recordStudentKey === studentFilter
    let matchesDate = true
    if (filterMode === 'date') matchesDate = record.date === dateFilter
    if (filterMode === 'week') matchesDate = recordDate >= weekStart && recordDate <= today
    if (filterMode === 'month') matchesDate = recordDate >= monthStart && recordDate <= today
    return matchesStudent && matchesDate
  })

  const clearAttendanceFilters = () => {
    setFilterMode('all')
    setStudentFilter('')
    setDateFilter(toLocalDateInputValue(new Date()))
  }

  return (
    <Modal open onClose={onClose} size="xl" title={`Attendance Records - ${getBatchDisplayName(batch)} - ${batch.course_name_display}`}>
      {loading ? <Spin /> : records.length === 0 ? (
        <Empty msg="No attendance records found" icon="fa-clipboard-list" />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, alignItems: 'end', marginBottom: 16 }}>
            <div className="employee-fg" style={{ marginBottom: 0 }}>
              <label className="employee-label">Select Filter</label>
              <select className="employee-select" value={filterMode} onChange={e => setFilterMode(e.target.value)}>
                <option value="all">All History</option>
                <option value="date">Choose Date</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <div className="employee-fg" style={{ marginBottom: 0 }}>
              <label className="employee-label">Select Student</label>
              <select className="employee-select" value={studentFilter} onChange={e => setStudentFilter(e.target.value)}>
                <option value="">All Students</option>
                {studentOptions.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name}{student.studentId ? ` (${student.studentId})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="employee-fg" style={{ marginBottom: 0 }}>
              <label className="employee-label">Choose Date</label>
              <input type="date" className="employee-input" value={dateFilter} onChange={e => setDateFilter(e.target.value)} disabled={filterMode !== 'date'} />
            </div>
            <button className="employee-btn employee-btn-ghost" type="button" onClick={clearAttendanceFilters}>
              <i className="fas fa-times" /> Clear
            </button>
          </div>

          {filteredRecords.length === 0 ? (
            <Empty msg="No attendance history for selected filters" icon="fa-filter" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Student Name</th><th>Student ID</th><th>Batch</th><th>Trainer</th><th>Session</th><th>Status</th><th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(r => (
                    <tr key={r.id}>
                      <td>{r.date}</td>
                      <td style={{ fontWeight: 500 }}>{r.student_name}</td>
                      <td>{r.student_id_display || '-'}</td>
                      <td>{r.batch_number}</td>
                      <td>{r.marked_by || '-'}</td>
                      <td>{attendanceSessionText(r)}</td>
                      <td>
                        <Badge text={r.status} variant={r.status === 'Present' ? 'success' : r.status === 'Late' ? 'warning' : 'danger'} />
                      </td>
                      <td>{r.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}

export function AttendanceHistoryPage() {
  const location = useLocation()
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [records, setRecords] = useState([])
  const [loadingBatches, setLoadingBatches] = useState(true)
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [filterMode, setFilterMode] = useState('all')
  const [studentFilter, setStudentFilter] = useState('')
  const [staffFilter, setStaffFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState(toLocalDateInputValue(new Date()))

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const batchId = params.get('batch_id') || ''
    api.get('/batches/').then(r => {
      const batchList = r.data.results || r.data || []
      setBatches(batchList)
      if (batchId) setSelectedBatch(batchId)
      else if (batchList[0]?.id) setSelectedBatch(String(batchList[0].id))
    }).finally(() => setLoadingBatches(false))
  }, [location.search])

  useEffect(() => {
    if (!selectedBatch) {
      setRecords([])
      return
    }
    setLoadingRecords(true)
    api.get(`/batches/${selectedBatch}/attendance/`)
      .then(r => setRecords(r.data || []))
      .catch(err => {
        toast.error(err.response?.data?.error || 'Failed to load attendance history')
        setRecords([])
      })
      .finally(() => setLoadingRecords(false))
  }, [selectedBatch])

  const selectedBatchDetails = batches.find(batch => String(batch.id) === String(selectedBatch))
  const trainerOptions = Array.from(
    records.reduce((map, record) => {
      const key = String(record.staff || record.staff_id || record.marked_by || '')
      if (key && !map.has(key)) {
        map.set(key, {
          id: key,
          name: record.marked_by || 'Trainer',
        })
      }
      return map
    }, new Map()).values()
  ).sort((a, b) => a.name.localeCompare(b.name))
  const studentOptions = Array.from(
    records.reduce((map, record) => {
      const key = String(record.student || record.student_id || record.student_id_display || record.student_name || '')
      if (key && !map.has(key)) {
        map.set(key, {
          id: key,
          name: record.student_name || 'Student',
          studentId: record.student_id_display || '',
        })
      }
      return map
    }, new Map()).values()
  ).sort((a, b) => a.name.localeCompare(b.name))

  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const filteredRecords = records.filter(record => {
    const recordDate = new Date(record.date)
    const recordStudentKey = String(record.student || record.student_id || record.student_id_display || record.student_name || '')
    const recordStaffKey = String(record.staff || record.staff_id || record.marked_by || '')
    const matchesStudent = !studentFilter || recordStudentKey === studentFilter
    const matchesStaff = staffFilter === 'all' || recordStaffKey === staffFilter
    let matchesDate = true
    if (filterMode === 'date') matchesDate = record.date === dateFilter
    if (filterMode === 'week') matchesDate = recordDate >= weekStart && recordDate <= today
    if (filterMode === 'month') matchesDate = recordDate >= monthStart && recordDate <= today
    return matchesStudent && matchesStaff && matchesDate
  })

  const clearAttendanceFilters = () => {
    setFilterMode('all')
    setStudentFilter('')
    setStaffFilter('all')
    setDateFilter(toLocalDateInputValue(new Date()))
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH title="Attendance History" sub="Check student attendance by batch, student, date, week, or month" />

      <div className="employee-card" style={{ marginBottom: 20 }}>
        <div className="employee-card-body" style={{ padding: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'end' }}>
            <div className="employee-fg" style={{ marginBottom: 0 }}>
              <label className="employee-label">Select Batch</label>
              <select className="employee-select" value={selectedBatch} onChange={e => { setSelectedBatch(e.target.value); setStudentFilter(''); setStaffFilter('all') }} disabled={loadingBatches}>
                <option value="">Select batch</option>
                {batches.map(batch => (
                  <option key={batch.id} value={batch.id}>{getBatchDisplayName(batch)} - {batch.course_name_display}</option>
                ))}
              </select>
            </div>
            <div className="employee-fg" style={{ marginBottom: 0 }}>
              <label className="employee-label">Select Student</label>
              <select className="employee-select" value={studentFilter} onChange={e => setStudentFilter(e.target.value)} disabled={!selectedBatch || loadingRecords}>
                <option value="">All Students</option>
                {studentOptions.map(student => (
                  <option key={student.id} value={student.id}>{student.name}{student.studentId ? ` (${student.studentId})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="employee-fg" style={{ marginBottom: 0 }}>
              <label className="employee-label">Select Filter</label>
              <select className="employee-select" value={filterMode} onChange={e => setFilterMode(e.target.value)}>
                <option value="all">All History</option>
                <option value="date">Choose Date</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <div className="employee-fg" style={{ marginBottom: 0 }}>
              <label className="employee-label">Choose Date</label>
              <input type="date" className="employee-input" value={dateFilter} onChange={e => setDateFilter(e.target.value)} disabled={filterMode !== 'date'} />
            </div>
            <button className="employee-btn employee-btn-ghost" type="button" onClick={clearAttendanceFilters}>
              <i className="fas fa-times" /> Clear
            </button>
          </div>
        </div>
      </div>

      {trainerOptions.length > 1 && (
        <div className="employee-card" style={{ marginBottom: 20 }}>
          <div className="employee-card-body" style={{ padding: 14 }}>
            <label className="employee-label">Trainer Section</label>
            <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, padding: 5, border: `1px solid ${T.border}`, borderRadius: 12, background: T.white }}>
              <button
                type="button"
                onClick={() => setStaffFilter('all')}
                style={{
                  border: 'none',
                  borderRadius: 9,
                  padding: '8px 13px',
                  cursor: 'pointer',
                  background: staffFilter === 'all' ? T.amber : 'transparent',
                  color: staffFilter === 'all' ? T.navy : T.slate,
                  fontWeight: 700,
                }}
              >
                All Trainers
              </button>
              {trainerOptions.map(trainer => {
                const active = staffFilter === trainer.id
                return (
                  <button
                    key={trainer.id}
                    type="button"
                    onClick={() => setStaffFilter(trainer.id)}
                    style={{
                      border: 'none',
                      borderRadius: 9,
                      padding: '8px 13px',
                      cursor: 'pointer',
                      background: active ? T.amber : 'transparent',
                      color: active ? T.navy : T.slate,
                      fontWeight: 700,
                    }}
                  >
                    {trainer.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="employee-card">
        <SH title={selectedBatchDetails ? `${getBatchDisplayName(selectedBatchDetails)} Attendance` : 'Attendance History'} count={filteredRecords.length} />
        {loadingBatches || loadingRecords ? <Spin /> : !selectedBatch ? (
          <Empty msg="Select a batch to view attendance history" icon="fa-clipboard-list" />
        ) : records.length === 0 ? (
          <Empty msg="No attendance records found" icon="fa-clipboard-list" />
        ) : filteredRecords.length === 0 ? (
          <Empty msg="No attendance history for selected filters" icon="fa-filter" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Date</th><th>Student Name</th><th>Student ID</th><th>Batch</th><th>Trainer</th><th>Session</th><th>Status</th><th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(record => (
                  <tr key={record.id}>
                    <td>{record.date}</td>
                    <td style={{ fontWeight: 600 }}>{record.student_name}</td>
                    <td>{record.student_id_display || '-'}</td>
                    <td>{record.batch_number}</td>
                    <td>{record.marked_by || '-'}</td>
                    <td>{attendanceSessionText(record)}</td>
                    <td>
                      <Badge text={record.status} variant={record.status === 'Present' ? 'success' : record.status === 'Late' ? 'warning' : 'danger'} />
                    </td>
                    <td>{record.remarks || '-'}</td>
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
function RequestCompletionSection({ batch, students, sessions, onSuccess, openSignal = 0, initialStudentId = '' }) {
  const [showForm, setShowForm] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedCounselor, setSelectedCounselor] = useState('')
  const [counselors, setCounselors] = useState([])
  const [topicsCovered, setTopicsCovered] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (batch?.branch && showForm) {
      api.get(`/employees/?designation=counselor&branch=${batch.branch}`)
        .then(r => setCounselors(r.data.results || r.data))
        .catch(err => console.error("Error fetching counselors:", err))
    }
  }, [batch?.branch, showForm])

  useEffect(() => {
    if (!openSignal) return
    setShowForm(true)
    if (initialStudentId) setSelectedStudent(String(initialStudentId))
  }, [openSignal, initialStudentId])

  const completedCount = sessions.filter(s => s.staff_completed).length
  const totalCount = sessions.length

  const submit = async () => {
    if (!selectedStudent) return toast.error('Select a student')
    if (!selectedCounselor) return toast.error('Select a counselor')
    if (!topicsCovered.trim()) return toast.error('Please describe topics covered')

    setSaving(true)
    try {
      await api.post(`/students/${selectedStudent}/request-completion/`, {
        counselor_id: selectedCounselor,
        topics_covered: topicsCovered,
        sessions_completed: completedCount,
        total_sessions: totalCount,
        message: message,
      })
      toast.success('Completion request sent to counselor!')
      setShowForm(false)
      setSelectedStudent('')
      setSelectedCounselor('')
      setTopicsCovered('')
      setMessage('')
      if (onSuccess) onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send request')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <span style={{ fontWeight: 600, fontSize: 14, color: T.navy }}>
            📤 Request Student Completion
          </span>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: T.slate }}>
            Send a completion request to the counselor for a student
          </p>
        </div>
        <button
          className={`employee-btn ${showForm ? 'employee-btn-danger' : 'employee-btn-primary'} employee-btn-sm`}
          onClick={() => setShowForm(f => !f)}
        >
          <i className={`fas ${showForm ? 'fa-times' : 'fa-paper-plane'}`} />
          {showForm ? 'Cancel' : 'Request'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 18 }}>
          <div className="employee-fg">
            <label className="employee-label">Select Student <span className="employee-req">*</span></label>
            <select className="employee-select" value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
              <option value="">Choose student…</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_id})</option>
              ))}
            </select>
          </div>

          <div className="employee-fg">
            <label className="employee-label">Select Counselor <span className="employee-req">*</span></label>
            <select className="employee-select" value={selectedCounselor} onChange={e => setSelectedCounselor(e.target.value)}>
              <option value="">Choose counselor…</option>
              {counselors.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>

          <div className="employee-fg">
            <label className="employee-label">Topics Covered <span className="employee-req">*</span></label>
            <textarea
              className="employee-input"
              rows={3}
              value={topicsCovered}
              onChange={e => setTopicsCovered(e.target.value)}
              placeholder="Describe all topics covered with this student..."
            />
          </div>

          <div className="employee-fg">
            <label className="employee-label">Message to Counselor (optional)</label>
            <input
              className="employee-input"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Any additional notes for the counselor..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <small style={{ color: T.slate, fontSize: 12 }}>
              Sessions: <strong>{completedCount}/{totalCount}</strong> completed
            </small>
            <button
              className="employee-btn employee-btn-primary employee-btn-sm"
              onClick={submit}
              disabled={saving || !selectedStudent || !selectedCounselor || !topicsCovered.trim()}
            >
              {saving ? <><i className="fas fa-spinner fa-spin" /> Sending...</> : <><i className="fas fa-paper-plane" /> Send to Counselor</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sessions Modal (with checkbox workflow + completion request) ────────────────
function SessionsModal({ batch, onClose }) {
  const [data, setData] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')
  const [toggling, setToggling] = useState(null)
  const [extracting, setExtracting] = useState(false)
  const [finalStudentId, setFinalStudentId] = useState('')
  const [requestOpenSignal, setRequestOpenSignal] = useState(0)
  const [finalizing, setFinalizing] = useState(false)
  const [completedFinalStudentIds, setCompletedFinalStudentIds] = useState(new Set())

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get(`/batches/${batch.id}/sessions-logsheet/`),
      api.get(`/batches/${batch.id}/students/`),
    ]).then(([dr, sr]) => {
      setData(dr.data)
      setStudents(sr.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [batch.id])

  const sessions = data?.sessions || []
  const completed = sessions.filter(s => s.staff_completed)
  const pending = sessions.filter(s => !s.staff_completed)
  const pct = sessions.length ? Math.round((completed.length / sessions.length) * 100) : 0
  const allMentorSessionsCompleted = sessions.length > 0 && completed.length === sessions.length
  const logsheetUrl =
  data?.logsheet_url ||
  data?.batch?.course_logsheet_url ||
  data?.batch?.course_logsheet
  const tabSessions = tab === 'all' ? sessions : tab === 'done' ? completed : pending
  const canUpdateLogsheet = data?.can_update_logsheet !== false && batch.accessStatus !== 'previous'

  const handleToggle = async (session) => {
    if (!canUpdateLogsheet) return toast.error('Previous trainers can view session history but cannot update logsheet progress.')
    setToggling(session.id)
    try {
      let response
      if (session.staff_completed) {
        response = await api.post(`/sessions/${session.id}/staff-unmark/`)
        toast.success(`Session ${session.session_number} unmarked`)
      } else {
        response = await api.post(`/sessions/${session.id}/staff-complete/`)
        toast.success(`Session ${session.session_number} marked complete! Students notified.`)
      }
      const updatedSession = response.data?.session || {
        ...session,
        staff_completed: !session.staff_completed,
        completed_date: session.staff_completed ? null : new Date().toISOString(),
      }
      setData(prev => ({
        ...prev,
        sessions: (prev?.sessions || []).map(item =>
          item.id === session.id ? { ...item, ...updatedSession } : item
        ),
      }))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed')
    } finally { setToggling(null) }
  }

  const handleExtract = async () => {
    if (extracting) return
    setExtracting(true)
    try {
      const r = await api.post(`/batches/${batch.id}/extract-sessions/`)
      setData(prev => ({ ...prev, sessions: r.data.sessions }))
      toast.success(r.data.message)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Extraction failed')
    } finally {
      setExtracting(false)
    }
  }

  const selectedFinalStudent = finalStudentId || (students[0]?.id ? String(students[0].id) : '')
  const selectedFinalStudentCompleted = selectedFinalStudent && completedFinalStudentIds.has(String(selectedFinalStudent))

  const openCompletionRequest = () => {
    if (!selectedFinalStudent) return toast.error('Select a student')
    if (selectedFinalStudentCompleted) return toast.error('This student is already completed')
    setRequestOpenSignal(value => value + 1)
  }

  const handleMoveCompleted = async () => {
    if (!selectedFinalStudent) return toast.error('Select a student')
    if (selectedFinalStudentCompleted) return toast.error('This student is already completed')
    setFinalizing(true)
    try {
      await api.post(`/students/${selectedFinalStudent}/complete/`)
      toast.success('Student moved to completed list')
      setCompletedFinalStudentIds(prev => {
        const next = new Set(prev)
        next.add(String(selectedFinalStudent))
        return next
      })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to move student')
    } finally {
      setFinalizing(false)
    }
  }

  return (
    <Modal open onClose={onClose} size="lg" title={`📋 Sessions — ${getBatchDisplayName(batch)} · ${batch.course_name_display}`}>
      {loading ? <Spin /> : (
        <>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>Course Progress</span>
              <span style={{ fontWeight: 700 }}>{pct}% ({completed.length}/{sessions.length} sessions)</span>
            </div>
            <div style={{ height: 8, background: '#e9ecef', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${T.sage}, ${T.teal})`, borderRadius: 4, transition: 'width .5s' }} />
            </div>
          </div>

          <div className="employee-alert-info" style={{ marginBottom: 16 }}>
            <i className="fas fa-users" style={{ marginRight: 8 }} />
            <strong>Students in this batch:</strong>{' '}
            {students.length === 0 ? 'No students assigned yet.' : students.map(s => `${s.first_name} ${s.last_name}`).join(', ')}
          </div>

          {logsheetUrl && (
            <div style={{ marginBottom: 14, display: 'flex', gap: 10 }}>
              <a href={logsheetUrl} target="_blank" rel="noreferrer" className="employee-btn employee-btn-teal employee-btn-sm" style={{ textDecoration: 'none' }}>
                <i className="fas fa-eye" /> View Logsheet
              </a>
              <a href={logsheetUrl} download className="employee-btn employee-btn-primary employee-btn-sm" style={{ textDecoration: 'none' }}>
                <i className="fas fa-download" /> Download Logsheet
              </a>
            </div>
          )}

          {!logsheetUrl && (
            <div className="employee-alert-warning" style={{ marginBottom: 14, textAlign: 'center' }}>
              <i className="fas fa-file-pdf" /> No logsheet uploaded for this course.
            </div>
          )}

          {logsheetUrl && sessions.length === 0 && (
            <div style={{ marginBottom: 14 }}>
              <button className="employee-btn employee-btn-primary w-100" onClick={handleExtract} disabled={extracting}>
                <i className={`fas ${extracting ? 'fa-spinner fa-spin' : 'fa-magic'}`} /> {extracting ? 'Extracting...' : 'Extract Sessions from Logsheet'}
              </button>
              <small className="employee-hint">Click to auto-extract sessions from the uploaded PDF logsheet</small>
            </div>
          )}

          {sessions.length > 0 && canUpdateLogsheet && (
            <div className="employee-alert-info" style={{ marginBottom: 14 }}>
              <i className="fas fa-info-circle" /> <strong>How it works:</strong> Check the box next to a session to mark it as completed. Students will be notified and can confirm or raise a doubt.
            </div>
          )}

          {canUpdateLogsheet && allMentorSessionsCompleted && students.length > 0 && (
            <div style={{
              marginBottom: 14,
              padding: 16,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              background: '#fffaf0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 260px' }}>
                  <div style={{ fontWeight: 700, color: T.navy, marginBottom: 4 }}>
                    Move this student to the completed list or send a reassignment request?
                  </div>
                  <div style={{ color: T.slate, fontSize: 12 }}>
                    {selectedFinalStudentCompleted
                      ? 'This student has been moved to the completed list. Completion actions are now locked.'
                      : 'Mentor sessions are complete. If the student has also completed all sessions, click Completed. Otherwise, send a request to the counselor.'}
                  </div>
                </div>
                <select
                  className="employee-select"
                  style={{ minWidth: 220, flex: '0 1 260px' }}
                  value={selectedFinalStudent}
                  onChange={e => setFinalStudentId(e.target.value)}
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_id})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <button className="employee-btn employee-btn-primary employee-btn-sm" onClick={openCompletionRequest} disabled={!!selectedFinalStudentCompleted}>
                  <i className="fas fa-paper-plane" /> Request
                </button>
                <button className="employee-btn employee-btn-teal employee-btn-sm" onClick={handleMoveCompleted} disabled={finalizing || !!selectedFinalStudentCompleted}>
                  {selectedFinalStudentCompleted ? <><i className="fas fa-lock" /> Completed</> : finalizing ? <><i className="fas fa-spinner fa-spin" /> Moving...</> : <><i className="fas fa-check" /> Completed</>}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 4, borderBottom: `2px solid ${T.border}`, marginBottom: 12 }}>
            {[['all', `All (${sessions.length})`], ['done', `Completed (${completed.length})`], ['pending', `Pending (${pending.length})`]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                style={{
                  background: 'none', border: 'none', padding: '8px 16px',
                  fontWeight: tab === key ? 700 : 400,
                  color: tab === key ? T.amber : T.slate,
                  borderBottom: tab === key ? `2px solid ${T.amber}` : '2px solid transparent',
                  cursor: 'pointer', fontSize: 13
                }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {sessions.length === 0 ? (
              <Empty msg="No sessions created for this batch yet." icon="fa-list" />
            ) : tabSessions.length === 0 ? (
              <Empty msg="No sessions in this category." icon="fa-filter" />
            ) : tabSessions.map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderBottom: `1px solid ${T.border}`,
                background: s.staff_completed ? '#f0fff4' : '#fff',
                borderRadius: 8, marginBottom: 6, transition: 'background .2s'
              }}>
                <div style={{ flexShrink: 0 }}>
                  {toggling === s.id ? (
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: 20, color: T.amber }}></i>
                  ) : (
                    canUpdateLogsheet ? (
                      <input
                        type="checkbox"
                        checked={!!s.staff_completed}
                        onChange={() => handleToggle(s)}
                        style={{ width: 20, height: 20, cursor: 'pointer', accentColor: T.sage }}
                        title={s.staff_completed ? 'Click to unmark' : 'Click to mark as completed'}
                      />
                    ) : (
                      <i className={`fas ${s.staff_completed ? 'fa-check-circle' : 'fa-circle'}`} style={{ fontSize: 20, color: s.staff_completed ? T.sage : T.slate }} />
                    )
                  )}
                </div>

                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: s.staff_completed ? T.sage : '#e9ecef',
                  color: s.staff_completed ? '#fff' : T.slate,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, flexShrink: 0
                }}>
                  {s.staff_completed ? <i className="fas fa-check" style={{ fontSize: 12 }}></i> : s.session_number}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: 600, fontSize: 14,
                    textDecoration: s.staff_completed ? 'line-through' : 'none',
                    color: s.staff_completed ? T.slate : T.navy
                  }}>
                    {s.title || `Session ${s.session_number}`}
                  </div>
                  {s.topics && (
                    <div style={{ color: T.slate, fontSize: 12, marginTop: 2 }}>
                      {s.topics.length > 80 ? s.topics.substring(0, 80) + '...' : s.topics}
                    </div>
                  )}
                  {s.staff_completed && s.completed_date && (
                    <small style={{ color: T.sage, fontSize: 11 }}>
                      <i className="fas fa-check-circle" /> Completed on {new Date(s.completed_date).toLocaleDateString('en-IN')}
                    </small>
                  )}
                </div>

                <div style={{ flexShrink: 0 }}>
                  <Badge text={s.staff_completed ? '✅ Done' : '⏳ Pending'} variant={s.staff_completed ? 'success' : 'warning'} />
                </div>
              </div>
            ))}
          </div>

          {sessions.length > 0 && students.length > 0 && (
            <RequestCompletionSection
              batch={batch}
              students={students}
              sessions={sessions}
              onSuccess={load}
              openSignal={requestOpenSignal}
              initialStudentId={selectedFinalStudent}
            />
          )}
        </>
      )}
    </Modal>
  )
}

// ─── Students Modal ────────────────────────────────────────────────────────
function StudentsModal({ batch, onClose }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get(`/batches/${batch.id}/students/`).then(r => setStudents(r.data)).finally(() => setLoading(false))
  }, [batch.id])

  const filtered = students.filter(s =>
    `${s.first_name} ${s.last_name} ${s.student_id}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Modal open onClose={onClose} size="xl" title={`👥 Students — ${getBatchDisplayName(batch)} · ${batch.course_name_display}`}>
      <div className="employee-fg" style={{ marginBottom: 16 }}>
        <input
          className="employee-input"
          placeholder="Search students..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      {loading ? <Spin /> : filtered.length === 0 ? (
        <Empty msg="No students in this batch" icon="fa-users" />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="employee-table">
            <thead>
              <tr>
                <th>#</th><th>Student ID</th><th>Name</th><th>Email</th><th>Mobile</th><th>Course</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td>
                  <td><Badge text={s.student_id} variant="info" /></td>
                  <td style={{ fontWeight: 600 }}>{s.first_name} {s.last_name}</td>
                  <td style={{ fontSize: 12 }}>{s.email}</td>
                  <td>{s.mobile_no}</td>
                  <td>{s.course}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MARK ATTENDANCE
// ══════════════════════════════════════════════════════════════════════════════
export function MarkAttendance() {
  const todayValue = toLocalDateInputValue(new Date())
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterdayValue = toLocalDateInputValue(yesterdayDate)
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [selectedTrainerId, setSelectedTrainerId] = useState('')
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [currentEmployeeId, setCurrentEmployeeId] = useState('')
  const [sessions, setSessions] = useState([])
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [date, setDate] = useState(todayValue)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/dashboard/employee/').then(r => {
      const employee = r.data?.employee
      if (employee?.id) setCurrentEmployeeId(String(employee.id))
    }).catch(() => {})
    api.get('/batches/').then(r => {
      const b = r.data.results || r.data
      setBatches(b)
      const params = new URLSearchParams(window.location.search)
      const bid = params.get('batch_id')
      if (bid) setSelectedBatch(bid)
    })
  }, [])

  const selectedBatchDetails = batches.find(b => String(b.id) === String(selectedBatch))
  const batchTrainerSections = selectedBatchDetails?.trainers?.length
    ? selectedBatchDetails.trainers
    : selectedBatchDetails?.trainer_ids?.length
      ? selectedBatchDetails.trainer_ids.map((id, index) => ({ id, name: selectedBatchDetails.trainer_names?.[index] || `Trainer ${index + 1}` }))
      : []
  const selectedBatchTrainers = currentEmployeeId
    ? batchTrainerSections.filter(trainer => String(trainer.id) === String(currentEmployeeId))
    : []

  useEffect(() => {
    if (!selectedBatchDetails) {
      setSelectedTrainerId('')
      setSelectedSessionId('')
      setSessions([])
      return
    }
    const trainerIds = selectedBatchTrainers.map(t => String(t.id))
    setSelectedTrainerId(trainerIds[0] || '')
    setSelectedSessionId('')
    api.get(`/batches/${selectedBatch}/sessions-logsheet/`)
      .then(r => setSessions(r.data?.sessions || []))
      .catch(() => setSessions([]))
  }, [selectedBatch, currentEmployeeId, batches])

  useEffect(() => {
    if (!selectedBatch) return setStudents([])
    setLoading(true)
    api.get(`/batches/${selectedBatch}/students/`).then(r => {
      setStudents(r.data)
      const init = {}
      r.data.forEach(s => { init[s.id] = 'Present' })
      setAttendance(init)
    }).finally(() => setLoading(false))
  }, [selectedBatch])

  const submit = async () => {
    if (!selectedBatch) return toast.error('Select a batch first')
    if (!selectedTrainerId) return toast.error('Select a trainer section')
    if (students.length === 0) return toast.error('No students in this batch')
    if (![todayValue, yesterdayValue].includes(date)) return toast.error('Attendance can be marked only for today or yesterday')
    setSaving(true)
    try {
      const data = Object.entries(attendance).map(([student_id, status]) => ({ student_id: parseInt(student_id), status }))
      const res = await api.post('/attendance/mark/', {
        batch_id: parseInt(selectedBatch),
        session_id: selectedSessionId ? parseInt(selectedSessionId) : null,
        date,
        attendance: data
      })
      const alertCount = Number(res.data?.leave_alerts || 0)
      toast.success(alertCount > 0 ? `Attendance saved. ${alertCount} leave alerts sent.` : 'Attendance saved successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Failed to save')
    } finally { setSaving(false) }
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH title="📋 Mark Attendance" sub="Record student attendance for a batch" />
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button
          type="button"
          className="employee-btn employee-btn-teal"
          onClick={() => {
            if (!selectedBatch) return toast.error('Select a batch first')
            navigate(`/employee/batches?session_batch_id=${selectedBatch}`)
          }}
        >
          <i className="fas fa-list-check" /> Go to Sessions
        </button>
      </div>

      <div className="employee-card">
        <div className="employee-card-body" style={{ padding: 22 }}>
          <div className="employee-row-grid-2" style={{ marginBottom: 24 }}>
            <div className="employee-fg">
              <label className="employee-label">🎓 Select Batch:</label>
              <select className="employee-select" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
                <option value="">-- Select Batch --</option>
                {batches.map(b => <option key={b.id} value={b.id}>{getBatchDisplayName(b)} — {b.course_name_display} ({b.batch_timing})</option>)}
              </select>
            </div>
            <div className="employee-fg">
              <label className="employee-label">📅 Date:</label>
              <select className="employee-select" value={date} onChange={e => setDate(e.target.value)}>
                <option value={todayValue}>Today ({todayValue})</option>
                <option value={yesterdayValue}>Yesterday ({yesterdayValue})</option>
              </select>
            </div>
          </div>

          {selectedBatchTrainers.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <label className="employee-label">Trainer Section</label>
              <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, padding: 5, border: `1px solid ${T.border}`, borderRadius: 12, background: T.white }}>
                {selectedBatchTrainers.map(trainer => {
                  const active = String(selectedTrainerId) === String(trainer.id)
                  return (
                    <button
                      key={trainer.id}
                      type="button"
                      onClick={() => setSelectedTrainerId(String(trainer.id))}
                      style={{
                        border: 'none',
                        borderRadius: 9,
                        padding: '8px 13px',
                        cursor: 'pointer',
                        background: active ? T.amber : 'transparent',
                        color: active ? T.navy : T.slate,
                        fontWeight: 700,
                      }}
                    >
                      {trainer.name || `Trainer ${trainer.id}`}{trainer.batch_timing ? ` (${trainer.batch_timing})` : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {sessions.length > 0 && (
            <div className="employee-fg" style={{ marginBottom: 24 }}>
              <label className="employee-label">Session / Module</label>
              <select className="employee-select" value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)}>
                <option value="">General batch attendance</option>
                {sessions.map(session => (
                  <option key={session.id} value={session.id}>
                    Session {session.session_number} - {session.title || 'Untitled'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {loading ? <Spin /> : students.length === 0 && selectedBatch ? (
            <Empty msg="No students in this batch" icon="fa-user-graduate" />
          ) : students.length > 0 ? (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="employee-table">
                  <thead>
                    <tr><th>#</th><th>Student</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr key={s.id}>
                        <td>{i + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{s.first_name} {s.last_name}</div>
                          <small style={{ color: T.slate }}>{s.student_id}</small>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 20 }}>
                            {['Present', 'Absent', 'Late'].map(st => (
                              <label key={st} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                <input
                                  type="radio"
                                  name={`att-${s.id}`}
                                  checked={attendance[s.id] === st}
                                  onChange={() => setAttendance(a => ({ ...a, [s.id]: st }))}
                                />
                                <span style={{ color: st === 'Present' ? T.sage : st === 'Absent' ? T.rose : T.amber }}>{st}</span>
                              </label>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button className="employee-btn employee-btn-primary" onClick={submit} disabled={saving}>
                  <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`} />
                  {saving ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STUDY MATERIALS
// ══════════════════════════════════════════════════════════════════════════════
export function StudyMaterials({ studentView = false }) {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editMaterial, setEditMaterial] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/materials/').then(r => setMaterials(r.data.results || r.data)).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const fileIcon = url => {
    if (!url) return 'fa-file-alt'
    if (url.includes('.pdf')) return 'fa-file-pdf'
    if (url.includes('.doc')) return 'fa-file-word'
    if (url.includes('.ppt')) return 'fa-file-powerpoint'
    if (url.includes('.xls')) return 'fa-file-excel'
    return 'fa-file-alt'
  }

  const downloadMaterial = async (material) => {
    try {
      const res = await api.get(`/materials/${material.id}/download/`, { responseType: 'blob' })
      const blob = new Blob([res.data])
      const fileURL = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = fileURL
      link.download = material.file?.split('/').pop() || material.title || 'material'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(fileURL)
    } catch (err) {
      let message = 'File missing on server. Re-upload required or persistent storage required.'
      const data = err.response?.data
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text())
          message = parsed.error || message
        } catch {
          // Uploaded files need persistent storage to survive redeploys.
        }
      } else if (data?.error) {
        message = data.error
      }
      toast.error(message)
    }
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH
        title="📚 Study Materials"
        sub={studentView ? 'Materials shared with your batch' : 'Upload and manage study materials'}
        btn={!studentView && <button className="employee-btn employee-btn-primary" onClick={() => setShowForm(true)}><i className="fas fa-upload" /> Upload Material</button>}
      />

      <div className="employee-card">
        <SH title={`Materials (${materials.length})`} />
        {loading ? <Spin /> : materials.length === 0 ? (
          <Empty msg="No materials uploaded yet" icon="fa-folder-open" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Title</th>
                  {!studentView && <th>Uploaded By</th>}
                  <th>Batch</th>
                  <th>Date</th>
                  <th>File</th>
                  {!studentView && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {materials.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${T.rose}, ${T.amber})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className={`fas ${fileIcon(m.file)}`} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{m.title}</div>
                          {m.description && <small style={{ color: T.slate }}>{m.description}</small>}
                        </div>
                      </div>
                    </td>
                    {!studentView && <td>{m.uploaded_by_name}<div style={{ marginTop: 4 }}><Badge text={m.uploaded_by_trainer_status || 'Current Trainer'} variant={m.uploaded_by_trainer_status === 'Previous Trainer' ? 'warning' : 'success'} /></div></td>}
                    <td>{m.batch_number}</td>
                    <td style={{ fontSize: 12 }}>{m.uploaded_at ? new Date(m.uploaded_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td>
  {m.file ? (
    <button
      type="button"
      className="employee-btn employee-btn-sm employee-btn-ghost"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        downloadMaterial(m)
      }}
    >
      <i className="fas fa-download" /> Download
    </button>
  ) : (
    <span style={{ color: T.slate, fontSize: 12 }}>No file</span>
  )}
</td>
                    {!studentView && (
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button className="employee-btn employee-btn-sm employee-btn-teal" onClick={() => setEditMaterial(m)}>
                            <i className="fas fa-edit" /> Questions
                          </button>
                          <button className="employee-btn employee-btn-sm employee-btn-danger" onClick={() => setDeleteId(m.id)}>
                            <i className="fas fa-trash-alt" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && <MaterialUploadModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
      {editMaterial && <MaterialUploadModal material={editMaterial} onClose={() => setEditMaterial(null)} onSaved={() => { setEditMaterial(null); load() }} />}
      {deleteId && (
        <Modal open onClose={() => setDeleteId(null)} title="Delete Material" size="sm">
          <p>Are you sure you want to delete this material?</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="employee-btn employee-btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
            <button className="employee-btn employee-btn-danger" onClick={async () => { await api.delete(`/materials/${deleteId}/delete/`); toast.success('Deleted'); setDeleteId(null); load() }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function MaterialUploadModal({ onClose, onSaved, material = null }) {
  const isEdit = !!material
  const [form, setForm] = useState({
    title: material?.title || '',
    description: material?.description || '',
    batch: material?.batch || material?.assigned_batches?.[0]?.id || '',
  })
  const [file, setFile] = useState(null)
  const [batches, setBatches] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const initialBatchId = new URLSearchParams(window.location.search).get('batch_id') || ''
    Promise.all([
      api.get('/batches/'),
      api.get('/batches/?access=previous').catch(() => ({ data: { results: [] } })),
    ]).then(([activeRes, previousRes]) => {
      const active = activeRes.data.results || activeRes.data || []
      const previous = (previousRes.data.results || previousRes.data || []).map(batch => ({ ...batch, accessStatus: 'previous' }))
      setBatches([...active, ...previous])
      if (initialBatchId) setForm(prev => ({ ...prev, batch: initialBatchId }))
    })
  }, [])

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title); fd.append('batch', form.batch)
      if (form.description) fd.append('description', form.description)
      if (file) fd.append('file', file)
      if (isEdit) {
        await api.patch(`/materials/${material.id}/`, fd)
      } else {
        await api.post('/materials/upload/', fd)
      }
      toast.success(isEdit ? 'Material updated successfully!' : 'Material uploaded successfully!'); onSaved()
    } catch (err) {
      const d = err.response?.data || {}
      toast.error(d.error || d.detail || Object.values(d)[0]?.[0] || (isEdit ? 'Update failed' : 'Upload failed'))
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="📤 Upload Material" size="md">
      <form onSubmit={save}>
        <div className="employee-fg">
          <label className="employee-label">Title <span className="employee-req">*</span></label>
          <input className="employee-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Enter material title" required />
        </div>
        <div className="employee-fg">
          <label className="employee-label">Batch <span className="employee-req">*</span></label>
          <select className="employee-select" value={form.batch} onChange={e => setForm(p => ({ ...p, batch: e.target.value }))} required>
            <option value="">Select batch…</option>
            {batches.map(b => <option key={b.id} value={b.id}>{getBatchDisplayName(b)} - {b.course_name_display}{b.accessStatus === 'previous' ? ' - Reassigned' : ''}</option>)}
          </select>
        </div>
        <div className="employee-fg">
          <label className="employee-label">Description</label>
          <textarea className="employee-input" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
        </div>
        <div className="employee-fg">
          <label className="employee-label">File</label>
          <input type="file" className="employee-input" onChange={e => setFile(e.target.files[0])} style={{ padding: 7 }} />
          {isEdit && <small className="employee-hint">Leave empty to keep the existing file.</small>}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="employee-btn employee-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="employee-btn employee-btn-primary" disabled={saving}>
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-upload'}`} />
            {saving ? (isEdit ? 'Saving...' : 'Uploading...') : (isEdit ? 'Save Changes' : 'Upload')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// LEAVE & SUPPORT COMPONENTS (simplified - same UI pattern)
// ══════════════════════════════════════════════════════════════════════════════

export function MaterialLibrary() {
  const [materials, setMaterials] = useState([])
  const [batches, setBatches] = useState([])
  const [previousBatches, setPreviousBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [assignMaterial, setAssignMaterial] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [filters, setFilters] = useState({ search: '', branch: '', batch: '' })

  const load = useCallback(async (nextFilters = filters) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      const query = params.toString()
      const [materialsRes, batchesRes, previousRes] = await Promise.all([
        api.get(`/material-library/${query ? `?${query}` : ''}`),
        api.get('/batches/'),
        api.get('/batches/?access=previous').catch(() => ({ data: { results: [] } })),
      ])
      const active = batchesRes.data.results || batchesRes.data || []
      const previous = (previousRes.data.results || previousRes.data || []).map(batch => ({ ...batch, accessStatus: 'previous' }))
      setMaterials(materialsRes.data.results || materialsRes.data || [])
      setBatches([...active, ...previous])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load material library')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { load() }, [load])

  const branches = Array.from(new Set(batches.map(b => b.branch).filter(Boolean))).sort()
  const filteredBatches = filters.branch ? batches.filter(b => b.branch === filters.branch) : batches

  const fileIcon = url => {
    if (!url) return 'fa-file-alt'
    if (url.includes('.pdf')) return 'fa-file-pdf'
    if (url.includes('.doc')) return 'fa-file-word'
    if (url.includes('.ppt')) return 'fa-file-powerpoint'
    if (url.includes('.xls')) return 'fa-file-excel'
    return 'fa-file-alt'
  }

  const downloadMaterial = async (material) => {
    try {
      const res = await api.get(`/materials/${material.id}/download/`, { responseType: 'blob' })
      const blob = new Blob([res.data])
      const fileURL = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = fileURL
      link.download = material.file?.split('/').pop() || material.title || 'material'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(fileURL)
    } catch (err) {
      const data = err.response?.data
      let message = 'File missing on server.'
      if (data instanceof Blob) {
        try {
          const parsed = JSON.parse(await data.text())
          message = parsed.error || message
        } catch {}
      } else if (data?.error) {
        message = data.error
      }
      toast.error(message)
    }
  }

  const clearFilters = () => {
    const empty = { search: '', branch: '', batch: '' }
    setFilters(empty)
    load(empty)
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH
        title="Material Library"
        sub="Upload once, then assign the same file to batches when needed"
        btn={<button className="employee-btn employee-btn-primary" onClick={() => setShowUpload(true)}><i className="fas fa-upload" /> Upload to Library</button>}
      />

      <div className="employee-card" style={{ marginBottom: 20 }}>
        <SH title="Filters" />
        <div style={{ padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'end' }}>
          <div>
            <label className="employee-label">Search</label>
            <input className="employee-input" value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} placeholder="Search by title" />
          </div>
          <div>
            <label className="employee-label">Branch</label>
            <select className="employee-select" value={filters.branch} onChange={e => setFilters(p => ({ ...p, branch: e.target.value, batch: '' }))}>
              <option value="">All branches</option>
              {branches.map(branch => <option key={branch} value={branch}>{branch}</option>)}
            </select>
          </div>
          <div>
            <label className="employee-label">Batch</label>
            <select className="employee-select" value={filters.batch} onChange={e => setFilters(p => ({ ...p, batch: e.target.value }))}>
              <option value="">All batches</option>
              {filteredBatches.map(batch => <option key={batch.id} value={batch.id}>{getBatchDisplayName(batch)}{batch.accessStatus === 'previous' ? ' - Reassigned' : ''}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="employee-btn employee-btn-primary" onClick={() => load(filters)}><i className="fas fa-search" /> Apply</button>
            <button className="employee-btn employee-btn-ghost" onClick={clearFilters}><i className="fas fa-times" /> Clear</button>
          </div>
        </div>
      </div>

      <div className="employee-card">
        <SH title="Library Files" count={materials.length} />
        {loading ? <Spin /> : materials.length === 0 ? (
          <Empty msg="No library materials uploaded yet" icon="fa-folder-open" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Uploaded By</th>
                  <th>Uploaded Date</th>
                  <th>Assigned Batches / Branches</th>
                  <th>Download</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.map(material => (
                  <tr key={material.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${T.teal}, ${T.amber})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className={`fas ${fileIcon(material.file)}`} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{material.title}</div>
                          {material.description && <small style={{ color: T.slate }}>{material.description}</small>}
                        </div>
                      </div>
                    </td>
                    <td>{material.uploaded_by_name || '-'}</td>
                    <td style={{ fontSize: 12 }}>{material.uploaded_at ? new Date(material.uploaded_at).toLocaleDateString('en-IN') : '-'}</td>
                    <td>
                      {(material.assigned_batches || []).length ? (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {material.assigned_batches.map(batch => (
                            <span key={batch.id} className="employee-badge" style={{ background: '#e0f7f5', color: '#1a7a72' }}>
                              {getBatchDisplayName(batch)} - {batch.branch}
                            </span>
                          ))}
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      <button type="button" className="employee-btn employee-btn-sm employee-btn-ghost" onClick={() => downloadMaterial(material)}>
                        <i className="fas fa-download" /> Download
                      </button>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="employee-btn employee-btn-sm employee-btn-teal" onClick={() => setAssignMaterial(material)}>
                          <i className="fas fa-share-alt" /> Assign
                        </button>
                        <button className="employee-btn employee-btn-sm employee-btn-danger" onClick={() => setDeleteId(material.id)}>
                          <i className="fas fa-trash-alt" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUpload && <LibraryUploadModal onClose={() => setShowUpload(false)} onSaved={() => { setShowUpload(false); load() }} />}
      {assignMaterial && <LibraryAssignModal material={assignMaterial} materials={materials} batches={batches} onClose={() => setAssignMaterial(null)} onSaved={() => { setAssignMaterial(null); load() }} />}
      {deleteId && (
        <Modal open onClose={() => setDeleteId(null)} title="Delete Library Material" size="sm">
          <p>Delete this library material? Assigned library materials cannot be deleted.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button className="employee-btn employee-btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
            <button className="employee-btn employee-btn-danger" onClick={async () => {
              try {
                await api.delete(`/material-library/${deleteId}/delete/`)
                toast.success('Deleted')
                setDeleteId(null)
                load()
              } catch (err) {
                toast.error(err.response?.data?.error || 'Delete failed')
              }
            }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function LibraryUploadModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', description: '' })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      if (form.description) fd.append('description', form.description)
      if (file) fd.append('file', file)
      await api.post('/material-library/upload/', fd)
      toast.success('Uploaded to library')
      onSaved()
    } catch (err) {
      const d = err.response?.data || {}
      toast.error(d.error || d.detail || Object.values(d)[0]?.[0] || 'Upload failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Upload to Library" size="md">
      <form onSubmit={save}>
        <div className="employee-fg">
          <label className="employee-label">Title <span className="employee-req">*</span></label>
          <input className="employee-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
        </div>
        <div className="employee-fg">
          <label className="employee-label">Description</label>
          <textarea className="employee-input" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="employee-fg">
          <label className="employee-label">File <span className="employee-req">*</span></label>
          <input type="file" className="employee-input" onChange={e => setFile(e.target.files[0])} style={{ padding: 7 }} required />
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="employee-btn employee-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="employee-btn employee-btn-primary" disabled={saving}>
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-upload'}`} />
            {saving ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function LibraryAssignModal({ material, materials, batches, onClose, onSaved }) {
  const [selectedMaterialId, setSelectedMaterialId] = useState(String(material.id))
  const [form, setForm] = useState({ branch: '', batch: '' })
  const [saving, setSaving] = useState(false)
  const branches = Array.from(new Set(batches.map(b => b.branch).filter(Boolean))).sort()
  const filteredBatches = form.branch ? batches.filter(b => b.branch === form.branch) : []

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await api.post('/material-library/assign/', {
        material: selectedMaterialId,
        batch: form.batch,
      })
      toast.success('Material assigned')
      onSaved()
    } catch (err) {
      const d = err.response?.data || {}
      toast.error(d.error || d.detail || Object.values(d)[0]?.[0] || 'Assignment failed')
    } finally { setSaving(false) }
  }

  return (
    <Modal open onClose={onClose} title="Assign Library Material" size="md">
      <form onSubmit={save}>
        <div className="employee-fg">
          <label className="employee-label">Library Material <span className="employee-req">*</span></label>
          <select className="employee-select" value={selectedMaterialId} onChange={e => setSelectedMaterialId(e.target.value)} required>
            {materials.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </div>
        <div className="employee-fg">
          <label className="employee-label">Target Branch <span className="employee-req">*</span></label>
          <select className="employee-select" value={form.branch} onChange={e => setForm({ branch: e.target.value, batch: '' })} required>
            <option value="">Select branch...</option>
            {branches.map(branch => <option key={branch} value={branch}>{branch}</option>)}
          </select>
        </div>
        <div className="employee-fg">
          <label className="employee-label">Target Batch <span className="employee-req">*</span></label>
          <select className="employee-select" value={form.batch} onChange={e => setForm(p => ({ ...p, batch: e.target.value }))} required disabled={!form.branch}>
            <option value="">Select batch...</option>
            {filteredBatches.map(batch => <option key={batch.id} value={batch.id}>{getBatchDisplayName(batch)} - {batch.course_name_display}{batch.accessStatus === 'previous' ? ' - Reassigned' : ''}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="employee-btn employee-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="employee-btn employee-btn-primary" disabled={saving}>
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-check'}`} />
            {saving ? 'Assigning...' : 'Confirm Assign'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function LeaveFormModal({ onClose, onSaved, endpoint, title = "Apply Leave" }) {
  const [form, setForm] = useState({ leave_type: '', start_date: '', end_date: '', reason: '' })
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const [noOfDays, setNoOfDays] = useState('')
  useEffect(() => {
    if (form.start_date && form.end_date) {
      const d = Math.max(0, Math.round((new Date(form.end_date) - new Date(form.start_date)) / 86400000) + 1)
      setNoOfDays(d)
    }
  }, [form.start_date, form.end_date])

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try { await api.post(endpoint, { ...form, no_of_days: noOfDays }); toast.success('Leave application submitted!'); onSaved() }
    catch (err) {
      const d = err.response?.data || {}
      toast.error(d.error || d.detail || 'Submission failed')
    } finally { setSaving(false) }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <Modal open onClose={onClose} title={title} size="md">
      <form onSubmit={save}>
        <div className="employee-fg">
          <label className="employee-label">Leave Type <span className="employee-req">*</span></label>
          <select className="employee-select" value={form.leave_type} onChange={e => f('leave_type', e.target.value)} required>
            <option value="">Select Leave Type</option>
            {['Sick Leave', 'Casual Leave', 'Emergency Leave', 'Personal Leave', 'Other'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="employee-row-grid-2">
          <div className="employee-fg">
            <label className="employee-label">Start Date <span className="employee-req">*</span></label>
            <input type="date" className="employee-input" min={today} value={form.start_date} onChange={e => f('start_date', e.target.value)} required />
          </div>
          <div className="employee-fg">
            <label className="employee-label">End Date <span className="employee-req">*</span></label>
            <input type="date" className="employee-input" min={form.start_date || today} value={form.end_date} onChange={e => f('end_date', e.target.value)} required />
          </div>
        </div>
        {noOfDays > 0 && <div className="employee-alert-info" style={{ marginBottom: 16 }}><i className="fas fa-calendar-day" /> Number of days: <strong>{noOfDays}</strong></div>}
        <div className="employee-fg">
          <label className="employee-label">Reason <span className="employee-req">*</span></label>
          <textarea className="employee-input" rows={3} value={form.reason} onChange={e => f('reason', e.target.value)} required />
        </div>
        {/* Contact Info removed per UI change request */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="employee-btn employee-btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="employee-btn employee-btn-primary" disabled={saving}>
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} />
            {saving ? 'Submitting...' : 'Submit Leave'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function StaffLeaveApply() {
  const [showForm, setShowForm] = useState(false)
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const load = () => { setLoading(true); api.get('/staff-leave/').then(r => setLeaves(r.data.results || r.data)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  return (
    <div className="employee-root">
      <Styles />
      <PH title="🗓️ Leave Request" sub="Apply for leave and track status" btn={<button className="employee-btn employee-btn-primary" onClick={() => setShowForm(true)}><i className="fas fa-plus" /> Apply Leave</button>} />
      <div className="employee-card">
        <SH title={`My Leave Applications (${leaves.length})`} />
        {loading ? <Spin /> : leaves.length === 0 ? (
          <Empty msg="No leave applications yet" icon="fa-calendar-alt" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th></tr></thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.leave_type}</td>
                    <td>{l.start_date}</td>
                    <td>{l.end_date}</td>
                    <td>{l.no_of_days}</td>
                    <td style={{ maxWidth: 200 }}>{l.reason}</td>
                    <td><Badge text={l.status} variant={l.status === 'Approved' ? 'success' : l.status === 'Rejected' ? 'danger' : 'warning'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showForm && <LeaveFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} endpoint="/staff-leave/" title="📋 Apply Leave" />}
    </div>
  )
}

export function CounselorLeaveApply() {
  const [showForm, setShowForm] = useState(false)
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const load = () => { setLoading(true); api.get('/counselor-leave/').then(r => setLeaves(r.data.results || r.data)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  return (
    <div className="employee-root">
      <Styles />
      <PH title="🗓️ Leave Request" sub="Apply for leave and track status" btn={<button className="employee-btn employee-btn-primary" onClick={() => setShowForm(true)}><i className="fas fa-plus" /> Apply Leave</button>} />
      <div className="employee-card">
        <SH title={`My Leave Applications (${leaves.length})`} />
        {loading ? <Spin /> : leaves.length === 0 ? (
          <Empty msg="No leave applications yet" icon="fa-calendar-alt" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th></tr></thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.leave_type}</td>
                    <td>{l.start_date}</td>
                    <td>{l.end_date}</td>
                    <td>{l.no_of_days}</td>
                    <td style={{ maxWidth: 200 }}>{l.reason}</td>
                    <td><Badge text={l.status} variant={l.status === 'Approved' ? 'success' : l.status === 'Rejected' ? 'danger' : 'warning'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showForm && <LeaveFormModal onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} endpoint="/counselor-leave/" title="📋 Apply Leave" />}
    </div>
  )
}

export function StaffSupportRequest() {
  const [showForm, setShowForm] = useState(false)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const load = () => { setLoading(true); api.get('/staff-support/').then(r => setRequests(r.data.results || r.data)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!message.trim()) return toast.error('Please enter a message')
    setSaving(true)
    try { await api.post('/staff-support/', { message }); toast.success('Request submitted!'); setShowForm(false); setMessage(''); load() }
    catch (err) { toast.error(err.response?.data?.error || 'Submission failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH title="🎧 Support Request" sub="Get help from admin" btn={<button className="employee-btn employee-btn-primary" onClick={() => setShowForm(true)}><i className="fas fa-plus" /> New Request</button>} />
      <div className="employee-card">
        <SH title={`My Support Requests (${requests.length})`} />
        {loading ? <Spin /> : requests.length === 0 ? (
          <Empty msg="No support requests yet" icon="fa-headset" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead><tr><th>Message</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td style={{ maxWidth: 400 }}>{r.message}</td>
                    <td><Badge text={r.status?.replace('_', ' ')} variant={r.status === 'resolved' ? 'success' : r.status === 'in_progress' ? 'info' : 'warning'} /></td>
                    <td style={{ fontSize: 12 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showForm && (
        <Modal open onClose={() => setShowForm(false)} title="🎧 New Support Request" size="md">
          <div className="employee-fg">
            <label className="employee-label">Message / Issue <span className="employee-req">*</span></label>
            <textarea className="employee-input" rows={5} value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue in detail..." required />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="employee-btn employee-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="employee-btn employee-btn-primary" onClick={submit} disabled={saving}>
              <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} />
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export function CounselorSupportRequest() {
  const [showForm, setShowForm] = useState(false)
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const load = () => { setLoading(true); api.get('/counselor-support/').then(r => setRequests(r.data.results || r.data)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!message.trim()) return toast.error('Please enter a message')
    setSaving(true)
    try { await api.post('/counselor-support/', { message }); toast.success('Request submitted!'); setShowForm(false); setMessage(''); load() }
    catch (err) { toast.error(err.response?.data?.error || 'Submission failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH title="🎧 Counselor Support Request" sub="Get help from admin" btn={<button className="employee-btn employee-btn-primary" onClick={() => setShowForm(true)}><i className="fas fa-plus" /> New Request</button>} />
      <div className="employee-card">
        <SH title={`My Support Requests (${requests.length})`} />
        {loading ? <Spin /> : requests.length === 0 ? (
          <Empty msg="No support requests yet" icon="fa-headset" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead><tr><th>Message</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id}>
                    <td style={{ maxWidth: 400 }}>{r.message}</td>
                    <td><Badge text={r.status?.replace('_', ' ')} variant={r.status === 'resolved' ? 'success' : r.status === 'in_progress' ? 'info' : 'warning'} /></td>
                    <td style={{ fontSize: 12 }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showForm && (
        <Modal open onClose={() => setShowForm(false)} title="🎧 New Support Request" size="md">
          <div className="employee-fg">
            <label className="employee-label">Message / Issue <span className="employee-req">*</span></label>
            <textarea className="employee-input" rows={5} value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue in detail..." required />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="employee-btn employee-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="employee-btn employee-btn-primary" onClick={submit} disabled={saving}>
              <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} />
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export function StudentLeaveRequests({ pending = false }) {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/student-leave/').then(r => {
      const all = r.data.results || r.data
      setLeaves(pending ? all.filter(l => l.status === 'pending') : all)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [pending])

  const process = async (id, status) => {
    try { await api.patch(`/student-leave/${id}/process/`, { status }); toast.success(`Leave ${status}`); load() }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to process') }
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH title={pending ? "⏳ Pending Leave Requests" : "📋 Leave History"} sub="Student leave applications" />
      <div className="employee-card">
        <SH title={pending ? "Pending Requests" : "History"} count={leaves.length} />
        {loading ? <Spin /> : leaves.length === 0 ? (
          <Empty msg="No leave requests found" icon="fa-calendar-check" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Student</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th>
                  {pending && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.student_name}</td>
                    <td>{l.leave_type}</td>
                    <td>{l.start_date}</td>
                    <td>{l.end_date}</td>
                    <td>{l.number_of_days || l.no_of_days}</td>
                    <td style={{ maxWidth: 200 }}>{l.reason}</td>
                    <td><Badge text={l.status} variant={l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'danger' : 'warning'} /></td>
                    {pending && l.status === 'pending' && (
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="employee-btn employee-btn-sm employee-btn-teal" onClick={() => process(l.id, 'approved')}><i className="fas fa-check" /> Approve</button>
                          <button className="employee-btn employee-btn-sm employee-btn-danger" onClick={() => process(l.id, 'rejected')}><i className="fas fa-times" /> Reject</button>
                        </div>
                      </td>
                    )}
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
// STAFF COMPLETED STUDENTS - Fixed Width, No Horizontal Scroll WITH ATTENDANCE
// ══════════════════════════════════════════════════════════════════════════════
export function StaffCompletedStudents() {
  const [students, setStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
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

  useEffect(() => {
    loadCompletedStudents()
  }, [])

  const loadCompletedStudents = async () => {
    setLoading(true)
    try {
      const response = await api.get('/completed-students/')
      let data = response.data.results || response.data || []
      const studentsWithData = data.map(student => ({
        ...student,
        attendance_percentage: Number(student.attendance_percentage || 0),
        present_count: Number(student.present_count || 0),
        total_attendance: Number(student.total_attendance || 0),
      }))

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
        s.batch_number?.toLowerCase().includes(searchLower)
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

  const downloadGraduatesPdf = async () => {
    setDownloadingPdf(true)
    try {
      await downloadPdf('/completed-students/report/', filters, 'my_graduates_report.pdf')
      toast.success('Graduates PDF downloaded')
    } catch (err) {
      console.error('Graduates PDF error:', err)
      toast.error(err.response?.data?.error || 'Failed to download graduates PDF')
    } finally {
      setDownloadingPdf(false)
    }
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

  if (loading) {
    return (
      <div className="employee-root">
        <Styles />
        <Spin />
      </div>
    )
  }

  return (
    <div className="employee-root">
      <Styles />

      <PH
        title="🎓 My Graduates"
        sub="Students who have successfully completed your batches"
      />

      {/* Statistics Cards */}
      <div className="employee-stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="employee-stat-card" style={{ background: `linear-gradient(135deg, ${T.sage}, ${T.sage}cc)`, color: 'white' }}>
          <div className="employee-stat-icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            <i className="fas fa-graduation-cap" />
          </div>
          <div>
            <div className="employee-stat-value" style={{ color: 'white' }}>{stats.totalGraduates}</div>
            <div className="employee-stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Total Graduates</div>
          </div>
        </div>

        <div className="employee-stat-card" style={{ background: `linear-gradient(135deg, ${T.amber}, ${T.amber}cc)`, color: 'white' }}>
          <div className="employee-stat-icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            <i className="fas fa-layer-group" />
          </div>
          <div>
            <div className="employee-stat-value" style={{ color: 'white' }}>{stats.totalBatches}</div>
            <div className="employee-stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Batches</div>
          </div>
        </div>

        <div className="employee-stat-card" style={{ background: `linear-gradient(135deg, ${T.teal}, ${T.teal}cc)`, color: 'white' }}>
          <div className="employee-stat-icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            <i className="fas fa-calendar-check" />
          </div>
          <div>
            <div className="employee-stat-value" style={{ color: 'white' }}>{stats.totalSessions}</div>
            <div className="employee-stat-label" style={{ color: 'rgba(255,255,255,0.9)' }}>Total Sessions</div>
          </div>
        </div>
      </div>

      {/* Completed Students Table */}
      <div className="employee-card">
        <div className="employee-card-header" style={{ background: `linear-gradient(135deg, ${T.sage}, ${T.sage}cc)`, color: 'white' }}>
          <h5 style={{ color: 'white', margin: 0 }}>
            <i className="fas fa-graduation-cap" style={{ marginRight: 8 }} /> My Graduated Students
          </h5>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Badge text={`${filteredStudents.length} Records`} variant="success" />
            <button
              className="employee-btn employee-btn-sm"
              onClick={downloadGraduatesPdf}
              disabled={downloadingPdf || filteredStudents.length === 0}
              style={{ background: '#fff', color: T.sage, border: '1px solid rgba(255,255,255,0.55)', padding: '6px 12px', fontSize: 12 }}
            >
              <i className={`fas ${downloadingPdf ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`} /> PDF
            </button>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <i className="fas fa-graduation-cap" style={{ fontSize: 48, color: T.slate, marginBottom: 16, opacity: 0.3 }} />
            <h4 style={{ color: T.slate }}>No graduates yet</h4>
            <p style={{ color: T.slateLight }}>Students who complete your batches will appear here.</p>
          </div>
        ) : (
          <>
            {/* Filter Bar */}
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: `1px solid ${T.border}`, display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <input
                className="employee-input"
                style={{ padding: '6px 10px', fontSize: '12px', width: '180px' }}
                placeholder="🔍 Search by name, ID..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
              <select
                className="employee-select"
                style={{ padding: '6px 10px', fontSize: '12px', width: '130px' }}
                value={filters.batch}
                onChange={(e) => handleFilterChange('batch', e.target.value)}
              >
                <option value="">All Batches</option>
                {batches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select
                className="employee-select"
                style={{ padding: '6px 10px', fontSize: '12px', width: '130px' }}
                value={filters.course}
                onChange={(e) => handleFilterChange('course', e.target.value)}
              >
                <option value="">All Courses</option>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="date"
                className="employee-input"
                style={{ padding: '6px 10px', fontSize: '12px', width: '130px' }}
                placeholder="From"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
              <span style={{ fontSize: '12px', color: T.slate }}>to</span>
              <input
                type="date"
                className="employee-input"
                style={{ padding: '6px 10px', fontSize: '12px', width: '130px' }}
                placeholder="To"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
              <button
                className="employee-btn employee-btn-sm employee-btn-ghost"
                onClick={clearFilters}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                <i className="fas fa-times" /> Clear
              </button>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '650px' }}>
                <thead>
                  <tr style={{ background: `linear-gradient(135deg, ${T.navy}, ${T.navyMid})`, color: 'white' }}>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '40px' }}>#</th>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'left', width: '130px' }}>Student</th>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '90px' }}>Student ID</th>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '90px' }}>Batch</th>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'left', width: '100px' }}>Course</th>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '80px' }}>Sessions</th>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '60px' }}>Duration</th>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '80px' }}>Completed</th>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '100px' }}>Attendance</th>
                    <th style={{ padding: '10px 8px', color: 'black', fontSize: '11px', fontWeight: 600, textAlign: 'center', width: '70px' }}>Report</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.map((x, idx) => {
                    const globalIndex = (currentPage - 1) * itemsPerPage + idx + 1
                    const attendancePercentage = x.attendance_percentage || 0
                    const completedSessions = x.completed_sessions_count || x.sessions_completed || 0
                    const totalSessions = x.total_sessions_count || x.total_sessions || 0
                    const sessionPercentage = getSessionPercentage(completedSessions, totalSessions)

                    // Get color based on attendance percentage
                    const getAttendanceColor = () => {
                      if (attendancePercentage >= 75) return T.sage
                      if (attendancePercentage >= 60) return T.amber
                      return T.rose
                    }

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
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          <Badge text={x.student_id} variant="info" />
                        </td>
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          <Badge text={x.batch_number} variant="primary" />
                        </td>
                        <td style={{ padding: '10px 8px', fontSize: '11px' }}>
                          <div><strong>{x.course_name || x.course || '—'}</strong></div>
                          <div style={{ fontSize: '9px', color: T.slate }}>{x.branch || '—'}</div>
                        </td>

                        {/* Sessions Column */}
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '50px', background: '#e9ecef', borderRadius: '4px', height: '4px' }}>
                              <div style={{ height: '100%', width: `${sessionPercentage}%`, background: T.sage, borderRadius: '4px' }} />
                            </div>
                            <span style={{ fontSize: '10px' }}>{completedSessions}/{totalSessions}</span>
                          </div>
                        </td>

                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          {calculateDuration(x.batch_start_date, x.batch_end_date)}
                        </td>

                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          <Badge text={new Date(x.completion_date).toLocaleDateString('en-IN')} variant="success" />
                        </td>

                        {/* ATTENDANCE COLUMN - Enhanced with detailed view */}
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          {attendancePercentage > 0 || x.total_attendance > 0 ? (
                            <div>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                <div style={{ width: '60px', background: '#e9ecef', borderRadius: '4px', height: '6px' }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${attendancePercentage}%`,
                                    background: getAttendanceColor(),
                                    borderRadius: '4px'
                                  }} />
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: getAttendanceColor() }}>
                                  {attendancePercentage}%
                                </span>
                              </div>
                              <div style={{ fontSize: '9px', color: T.slate }}>
                                {x.total_attendance ? `(${x.present_count || 0}/${x.total_attendance || 0} days)` : 'Overall attendance'}
                              </div>
                            </div>
                          ) : (
                            <Badge text="Not Marked" variant="warning" />
                          )}
                        </td>

                        {/* Report Download Button */}
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <button
                            className="employee-btn employee-btn-success employee-btn-sm"
                            onClick={() => downloadReport(x.id, `${x.first_name} ${x.last_name || ''}`)}
                            title="Download Report"
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
                <button className="employee-btn employee-btn-ghost employee-btn-sm" onClick={() => goToPage(1)} disabled={currentPage === 1} style={{ padding: '4px 8px' }}>
                  <i className="fas fa-angle-double-left" />
                </button>
                <button className="employee-btn employee-btn-ghost employee-btn-sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} style={{ padding: '4px 8px' }}>
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
                      className={`employee-btn ${currentPage === pageNum ? 'employee-btn-primary' : 'employee-btn-ghost'} employee-btn-sm`}
                      onClick={() => goToPage(pageNum)}
                      style={{ padding: '4px 8px', minWidth: '28px' }}
                    >
                      {pageNum}
                    </button>
                  )
                })}

                <button className="employee-btn employee-btn-ghost employee-btn-sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} style={{ padding: '4px 8px' }}>
                  <i className="fas fa-angle-right" />
                </button>
                <button className="employee-btn employee-btn-ghost employee-btn-sm" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} style={{ padding: '4px 8px' }}>
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



export function ReassignedStudents() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)

  const formatDateTime = (value) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const loadRecords = async () => {
    setLoading(true)
    try {
      const response = await api.get('/staff/reassigned-students/')
      setRecords(response.data.results || response.data || [])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load reassigned students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
  }, [])

  const openReport = async (record) => {
    setReportLoading(true)
    try {
      const response = await api.get(`/staff/reassigned-students/${record.id}/report/`)
      setReport(response.data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load completion report')
    } finally {
      setReportLoading(false)
    }
  }

  const downloadReportPdf = async () => {
    if (!report?.id) return
    try {
      const response = await api.get(`/staff/reassigned-students/${report.id}/report/pdf/`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `${(report.student_name || 'student').replace(/\s+/g, '_')}_Reassigned_Completion_Report.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to download report')
    }
  }

  if (loading) {
    return (
      <div className="employee-root">
        <Styles />
        <Spin />
      </div>
    )
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH title="Reassigned Students" sub="Students moved from your batch to another trainer with preserved progress and attendance history." />

      <div className="employee-card">
        <SH title="Reassigned Students" count={records.length} />
        {records.length === 0 ? (
          <Empty msg="No reassigned students found" icon="fa-user-clock" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Batch</th>
                  <th>Reassigned To</th>
                  <th>Reassigned Date</th>
                  <th>Progress</th>
                  <th>Attendance</th>
                  <th>Report</th>
                </tr>
              </thead>
              <tbody>
                {records.map(record => (
                  <tr key={record.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar name={record.student_name} size={34} />
                        <div>
                          <strong>{record.student_name || '-'}</strong>
                          <div style={{ color: T.slate, fontSize: 12 }}>{record.student_id || '-'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{record.course_name || '-'}</td>
                    <td>
                      <Badge text={record.batch_number || '-'} variant="primary" />
                      {record.target_batch_number && (
                        <div style={{ color: T.slate, fontSize: 12, marginTop: 4 }}>
                          To {record.target_batch_number}
                        </div>
                      )}
                    </td>
                    <td>{record.reassigned_trainer || '-'}</td>
                    <td>{formatDateTime(record.reassigned_at)}</td>
                    <td>
                      <strong>{record.completed_sessions || 0}/{record.total_sessions || 0}</strong>
                      <div style={{ color: T.slate, fontSize: 12 }}>{record.progress_percentage || 0}% complete</div>
                    </td>
                    <td>
                      <strong>{record.attendance_percentage || 0}%</strong>
                      <div style={{ color: T.slate, fontSize: 12 }}>
                        {record.present_days || 0} present, {record.absent_days || 0} absent
                      </div>
                    </td>
                    <td>
                      <button
                        className="employee-btn employee-btn-sm employee-btn-primary"
                        onClick={() => openReport(record)}
                        disabled={reportLoading}
                      >
                        <i className="fas fa-file-alt" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={!!report} onClose={() => setReport(null)} title="Completion Report" size="xl">
        {report && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <button className="employee-btn employee-btn-primary" type="button" onClick={downloadReportPdf}>
                <i className="fas fa-file-pdf" /> Download PDF
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 18, marginBottom: 20 }}>
              <div className="employee-card" style={{ boxShadow: 'none', padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Avatar name={report.student_name} size={48} />
                  <div>
                    <h4 style={{ margin: 0 }}>{report.student_name || '-'}</h4>
                    <div style={{ color: T.slate, fontSize: 13 }}>
                      {report.student_id || '-'} - {report.course_name || '-'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 16, color: T.slate, fontSize: 13 }}>
                  <div><strong style={{ color: T.navy }}>Source Batch:</strong> {report.batch_number || '-'}</div>
                  <div><strong style={{ color: T.navy }}>Target Batch:</strong> {report.target_batch_number || '-'}</div>
                  <div><strong style={{ color: T.navy }}>Previous Trainer:</strong> {report.previous_trainer || '-'}</div>
                  <div><strong style={{ color: T.navy }}>New Trainer:</strong> {report.reassigned_trainer || '-'}</div>
                  <div><strong style={{ color: T.navy }}>Reassigned:</strong> {formatDateTime(report.reassigned_at)}</div>
                  <div><strong style={{ color: T.navy }}>Reason:</strong> {report.reassignment_reason || '-'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div className="employee-card" style={{ boxShadow: 'none', padding: 16 }}>
                  <div style={{ color: T.slate, fontSize: 12 }}>Sessions Completed</div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{report.completed_sessions || 0}/{report.total_sessions || 0}</div>
                  <Badge text={`${report.progress_percentage || 0}%`} variant="success" />
                </div>
                <div className="employee-card" style={{ boxShadow: 'none', padding: 16 }}>
                  <div style={{ color: T.slate, fontSize: 12 }}>Attendance</div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{report.attendance_percentage || 0}%</div>
                  <Badge text={`${report.present_days || 0} Present`} variant="info" />
                </div>
                <div className="employee-card" style={{ boxShadow: 'none', padding: 16 }}>
                  <div style={{ color: T.slate, fontSize: 12 }}>Present Days</div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{report.present_days || 0}</div>
                </div>
                <div className="employee-card" style={{ boxShadow: 'none', padding: 16 }}>
                  <div style={{ color: T.slate, fontSize: 12 }}>Absent Days</div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{report.absent_days || 0}</div>
                </div>
                <div className="employee-card" style={{ boxShadow: 'none', padding: 16 }}>
                  <div style={{ color: T.slate, fontSize: 12 }}>Test Result</div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{report.average_test_percentage || 0}%</div>
                  <Badge text={`${report.test_results_count || 0} Tests`} variant="primary" />
                </div>
                <div className="employee-card" style={{ boxShadow: 'none', padding: 16 }}>
                  <div style={{ color: T.slate, fontSize: 12 }}>Materials Uploaded</div>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{report.material_uploads_count || 0}</div>
                  <Badge text="Shared before reassignment" variant="info" />
                </div>
              </div>
            </div>

            <div className="employee-card" style={{ boxShadow: 'none', marginBottom: 18 }}>
              <SH title="Completed Sessions" count={(report.completed_session_details || []).length} />
              {(report.completed_session_details || []).length === 0 ? (
                <Empty msg="No completed sessions recorded" icon="fa-list-check" />
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {(report.completed_session_details || []).map((session, index) => (
                    <div
                      key={`${session.session_number}-${index}`}
                      style={{
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: 14,
                        background: '#fff',
                        lineHeight: 1.55,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <Badge text={`Session ${session.session_number || index + 1}`} variant="primary" />
                        <strong style={{ color: T.navy }}>{session.title || 'Untitled session'}</strong>
                      </div>
                      <p style={{ margin: 0, color: T.slate, whiteSpace: 'pre-wrap' }}>{session.topics || '-'}</p>
                      <div style={{ marginTop: 8, fontSize: 12, color: T.slate }}>
                        Completed: {session.staff_completed_at ? formatDateTime(session.staff_completed_at) : (session.completed_date || '-')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="employee-card" style={{ boxShadow: 'none', marginBottom: 18 }}>
              <SH title="Attendance Summary" count={(report.attendance_summary || []).length} />
              {(report.attendance_summary || []).length === 0 ? (
                <Empty msg="No attendance history recorded" icon="fa-clipboard-list" />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="employee-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Batch</th>
                        <th>Marked By</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(report.attendance_summary || []).map((attendance, index) => (
                        <tr key={`${attendance.date}-${index}`}>
                          <td>{attendance.date || '-'}</td>
                          <td>
                            <Badge
                              text={attendance.status || '-'}
                              variant={(attendance.status || '').toLowerCase() === 'present' ? 'success' : 'danger'}
                            />
                          </td>
                          <td>{attendance.batch_number || '-'}</td>
                          <td>{attendance.marked_by || '-'}</td>
                          <td>{attendance.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="employee-card" style={{ boxShadow: 'none' }}>
              <SH title="Test Results" count={(report.test_results || []).length} />
              {(report.test_results || []).length === 0 ? (
                <Empty msg="No test results recorded" icon="fa-file-alt" />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="employee-table">
                    <thead>
                      <tr>
                        <th>Test</th>
                        <th>Score</th>
                        <th>Percentage</th>
                        <th>Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(report.test_results || []).map((test, index) => (
                        <tr key={`${test.test_name}-${index}`}>
                          <td>{test.test_name || '-'}</td>
                          <td>{test.score || 0}/{test.total_questions || 0}</td>
                          <td>{test.percentage || 0}%</td>
                          <td>{test.submitted_at ? formatDateTime(test.submitted_at) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}



export function StaffAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewModal, setViewModal] = useState(null)

  useEffect(() => {
    api.get('/announcements/')
      .then(r => setAnnouncements(r.data.results || r.data || []))
      .catch(() => toast.error('Failed to load announcements'))
      .finally(() => setLoading(false))
  }, [])

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

  const important = announcements.filter(a => a.announcement_type === 'important').length
  const recent = announcements.filter(a => (Date.now() - new Date(a.created_at)) < 7 * 24 * 60 * 60 * 1000).length

  return (
    <div className="employee-root">
      <Styles />
      <PH title="📢 Admin Announcements" sub="Important updates and notices from admin" />

      <div className="employee-stat-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total', value: announcements.length, icon: 'fa-bullhorn', bg: 'rgba(46,196,182,.1)', color: T.teal },
          { label: 'Important', value: important, icon: 'fa-exclamation-triangle', bg: 'rgba(232,72,85,.1)', color: T.rose },
          { label: 'This Week', value: recent, icon: 'fa-calendar-week', bg: 'rgba(244,169,64,.1)', color: T.amber },
        ].map(s => (
          <div key={s.label} className="employee-stat-card">
            <div className="employee-stat-icon" style={{ background: s.bg, color: s.color }}>
              <i className={`fas ${s.icon}`} />
            </div>
            <div>
              <div className="employee-stat-value">{s.value}</div>
              <div className="employee-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="employee-card">
        <SH title="📢 Admin Announcements" count={announcements.length} />
        {loading ? <Spin /> : announcements.length === 0 ? (
          <Empty msg="No announcements yet." icon="fa-bullhorn" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>From</th>
                  <th style={{ width: 100 }}>Date</th>
                  <th style={{ width: 70 }}>View</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((ann, idx) => (
                  <tr key={ann.id}>
                    <td style={{ fontSize: 12, color: T.slate }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{ann.title}</div>
                      <div style={{ color: T.slate, fontSize: 11, marginTop: 3 }}>
                        {ann.message?.substring(0, 55)}{ann.message?.length > 55 ? '…' : ''}
                      </div>
                    </td>
                    <td><TypeBadge type={ann.announcement_type} /></td>
                    <td style={{ fontSize: 12, color: T.slate }}>
                      <i className="fas fa-user-shield" style={{ marginRight: 5, color: T.teal }} />
                      {ann.created_by_name || 'Admin'}
                    </td>
                    <td style={{ fontSize: 12, color: T.slate }}>
                      {new Date(ann.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <button
                        className="employee-btn employee-btn-sm"
                        style={{ background: '#f0f3f7', color: '#1a2e4a', border: 'none' }}
                        onClick={() => setViewModal(ann)}
                      >
                        <i className="fas fa-eye" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
          onClick={e => e.target === e.currentTarget && setViewModal(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560,
            margin: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              padding: '16px 24px', borderBottom: `1px solid ${T.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h5 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>📄 Announcement</h5>
              <button onClick={() => setViewModal(null)}
                style={{
                  background: '#f1f5f9', border: 'none', width: 32, height: 32,
                  borderRadius: 8, cursor: 'pointer', fontSize: 14
                }}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <TypeBadge type={viewModal.announcement_type} />
                <span style={{
                  background: '#e8f8f0', color: '#4caf81', padding: '3px 10px',
                  borderRadius: 20, fontSize: 11, fontWeight: 600
                }}>✓ Published</span>
              </div>
              <h4 style={{ margin: '0 0 10px', color: T.navy }}>{viewModal.title}</h4>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: T.slate }}>
                  <i className="fas fa-user-shield" style={{ marginRight: 5, color: T.teal }} />
                  {viewModal.created_by_name || 'Admin'}
                </span>
                <span style={{ fontSize: 12, color: T.slate }}>
                  <i className="fas fa-calendar" style={{ marginRight: 5 }} />
                  {new Date(viewModal.created_at).toLocaleString('en-IN')}
                </span>
              </div>
              <div style={{
                background: '#f8fafc', borderRadius: 10, padding: '16px 18px',
                lineHeight: 1.75, fontSize: 14, color: T.navyMid, whiteSpace: 'pre-wrap'
              }}>
                {viewModal.message}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function TrainerAnnouncements() {
  const emptyForm = {
    title: '',
    message: '',
    announcement_type: 'general',
    recipient_type: 'specific_batch',
    specific_batch: '',
    is_published: true,
  }
  const [announcements, setAnnouncements] = useState([])
  const [batches, setBatches] = useState([])
  const [students, setStudents] = useState([])
  const [selectedStudents, setSelectedStudents] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(null)
  const [viewModal, setViewModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [studentSearch, setStudentSearch] = useState('')

  const loadAnnouncements = useCallback(() => {
    setLoading(true)
    api.get('/trainer/announcements/')
      .then(r => setAnnouncements(r.data.results || r.data || []))
      .catch(() => toast.error('Failed to load trainer announcements'))
      .finally(() => setLoading(false))
  }, [])

  const loadBatches = useCallback(() => {
    api.get('/trainer/announcement-batches/')
      .then(r => setBatches(r.data.results || r.data || []))
      .catch(() => toast.error('Failed to load batches'))
  }, [])

  const loadStudents = useCallback((batchId) => {
    if (!batchId) {
      setStudents([])
      return
    }
    api.get(`/trainer/announcement-students/?batch=${batchId}`)
      .then(r => setStudents(r.data.results || r.data || []))
      .catch(() => setStudents([]))
  }, [])

  useEffect(() => {
    loadAnnouncements()
    loadBatches()
  }, [loadAnnouncements, loadBatches])

  useEffect(() => {
    loadStudents(form.specific_batch)
  }, [form.specific_batch, loadStudents])

  const resetForm = () => {
    setForm(emptyForm)
    setSelectedStudents([])
    setStudents([])
    setStudentSearch('')
  }

  const toggleStudent = (id) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  const payload = () => ({
    ...form,
    specific_batch: form.specific_batch || null,
    specific_student_ids: selectedStudents,
  })

  const validate = () => {
    if (!form.title.trim()) return toast.error('Enter title'), false
    if (!form.message.trim()) return toast.error('Enter message'), false
    if (!form.specific_batch) return toast.error('Select batch'), false
    if (form.recipient_type === 'specific_student' && selectedStudents.length === 0) {
      return toast.error('Select at least one student'), false
    }
    return true
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await api.post('/trainer/announcements/create/', payload())
      toast.success(form.is_published ? 'Announcement published!' : 'Saved as draft!')
      resetForm()
      setShowCreateModal(false)
      loadAnnouncements()
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.error || 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (ann) => {
    setForm({
      title: ann.title || '',
      message: ann.message || '',
      announcement_type: ann.announcement_type || 'general',
      recipient_type: ann.recipient_type || 'specific_batch',
      specific_batch: ann.specific_batch || ann.specific_batch_details?.id || '',
      is_published: !!ann.is_published,
    })
    setSelectedStudents((ann.specific_student_names || []).map(s => s.id))
    setShowEditModal(ann)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await api.patch(`/trainer/announcements/${showEditModal.id}/update/`, payload())
      toast.success('Announcement updated!')
      resetForm()
      setShowEditModal(null)
      loadAnnouncements()
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.error || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id) => {
    try {
      const r = await api.patch(`/trainer/announcements/${id}/toggle/`)
      toast.success(r.data.is_published ? 'Published!' : 'Unpublished')
      loadAnnouncements()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/trainer/announcements/${deleteModal.id}/delete/`)
      toast.success('Announcement deleted')
      setDeleteModal(null)
      loadAnnouncements()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const TYPE_META = {
    important: { bg: '#fdeaec', color: T.rose, label: 'Important', icon: 'fa-exclamation-triangle' },
    holiday: { bg: '#fef5e4', color: T.amber, label: 'Holiday', icon: 'fa-umbrella-beach' },
    event: { bg: '#e8f8f0', color: T.sage, label: 'Event', icon: 'fa-calendar-star' },
    update: { bg: '#e4f2fd', color: T.teal, label: 'Update', icon: 'fa-sync-alt' },
    general: { bg: '#f0f3f7', color: T.slate, label: 'General', icon: 'fa-bullhorn' },
    exam: { bg: '#e4f2fd', color: T.navy, label: 'Exam', icon: 'fa-file-alt' },
    course: { bg: '#e8f8f0', color: T.sage, label: 'Course', icon: 'fa-book-open' },
  }
  const TypeBadge = ({ type }) => {
    const m = TYPE_META[type] || TYPE_META.general
    return <span style={{ background: m.bg, color: m.color, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, display: 'inline-flex', gap: 5, alignItems: 'center' }}><i className={`fas ${m.icon}`} />{m.label}</span>
  }

  const audienceLabel = (ann) => ann.recipient_type === 'specific_student'
    ? `${ann.specific_student_names?.length || 0} student${ann.specific_student_names?.length === 1 ? '' : 's'}`
    : (ann.specific_batch_details?.batch_number || ann.specific_batch_name || 'Batch')

  const filteredStudents = students.filter(s => `${s.name} ${s.student_id}`.toLowerCase().includes(studentSearch.toLowerCase()))
  const published = announcements.filter(a => a.is_published).length
  const drafts = announcements.length - published

  const renderFormBody = (onSubmit) => (
    <form onSubmit={onSubmit}>
      <div className="employee-fg">
        <label className="employee-label">Title <span className="employee-req">*</span></label>
        <input className="employee-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Enter announcement title" />
      </div>
      <div className="employee-fg">
        <label className="employee-label">Type</label>
        <select className="employee-select" value={form.announcement_type} onChange={e => setForm(p => ({ ...p, announcement_type: e.target.value }))}>
          <option value="general">General Announcement</option>
          <option value="important">Important Notice</option>
          <option value="holiday">Holiday Notice</option>
          <option value="event">Event Announcement</option>
          <option value="exam">Exam Schedule</option>
          <option value="course">Course Related</option>
          <option value="update">Update</option>
        </select>
      </div>
      <div className="employee-fg">
        <label className="employee-label">Send To</label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { value: 'specific_batch', label: 'Specific Batch', icon: 'fa-layer-group' },
            { value: 'specific_student', label: 'Specific Student', icon: 'fa-user-graduate' },
          ].map(item => (
            <button
              key={item.value}
              type="button"
              className={`employee-btn ${form.recipient_type === item.value ? 'employee-btn-primary' : 'employee-btn-ghost'}`}
              onClick={() => setForm(p => ({ ...p, recipient_type: item.value }))}
            >
              <i className={`fas ${item.icon}`} /> {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="employee-fg">
        <label className="employee-label">Select Batch <span className="employee-req">*</span></label>
        <select className="employee-select" value={form.specific_batch} onChange={e => { setSelectedStudents([]); setForm(p => ({ ...p, specific_batch: e.target.value })) }}>
          <option value="">Choose batch</option>
          {batches.map(batch => <option key={batch.id} value={batch.id}>{batch.display_text || getBatchDisplayName(batch)}</option>)}
        </select>
      </div>
      {form.recipient_type === 'specific_student' && (
        <div className="employee-fg">
          <label className="employee-label">Select Students <span style={{ color: T.teal, marginLeft: 8 }}>{selectedStudents.length} selected</span></label>
          <input className="employee-input" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search student name or ID" style={{ marginBottom: 8 }} />
          <div style={{ maxHeight: 190, overflowY: 'auto', border: `1px solid ${T.border}`, borderRadius: 10 }}>
            {!form.specific_batch ? (
              <div style={{ padding: 16, color: T.slate, fontSize: 13 }}>Select a batch first.</div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ padding: 16, color: T.slate, fontSize: 13 }}>No students found.</div>
            ) : filteredStudents.map(student => (
              <label key={student.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: `1px solid ${T.border}`, background: selectedStudents.includes(student.id) ? '#e8f8f0' : '#fff', cursor: 'pointer' }}>
                <input type="checkbox" checked={selectedStudents.includes(student.id)} onChange={() => toggleStudent(student.id)} />
                <span><strong>{student.name}</strong><br /><small style={{ color: T.slate }}>{student.student_id}</small></span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="employee-fg">
        <label className="employee-label">Message <span className="employee-req">*</span></label>
        <textarea className="employee-input" rows={4} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Type announcement message" />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16 }}>
        <input type="checkbox" checked={form.is_published} onChange={e => setForm(p => ({ ...p, is_published: e.target.checked }))} />
        Publish immediately
      </label>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        <button type="submit" className="employee-btn employee-btn-primary" disabled={saving}>
          <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} />
          {saving ? 'Saving...' : 'Save Announcement'}
        </button>
        <button type="button" className="employee-btn employee-btn-ghost" onClick={() => { resetForm(); setShowCreateModal(false); setShowEditModal(null) }}>Cancel</button>
      </div>
    </form>
  )

  return (
    <div className="employee-root">
      <Styles />
      <PH title="Trainer Announcements" sub="Send announcements to a batch or selected students" btn={<button className="employee-btn employee-btn-primary" onClick={() => setShowCreateModal(true)}><i className="fas fa-plus" /> New Announcement</button>} />

      <div className="employee-stat-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total', value: announcements.length, icon: 'fa-bullhorn', bg: 'rgba(46,196,182,.1)', color: T.teal },
          { label: 'Published', value: published, icon: 'fa-check-circle', bg: 'rgba(76,175,129,.1)', color: T.sage },
          { label: 'Drafts', value: drafts, icon: 'fa-eye-slash', bg: 'rgba(244,169,64,.1)', color: T.amber },
        ].map(stat => (
          <div key={stat.label} className="employee-stat-card">
            <div className="employee-stat-icon" style={{ background: stat.bg, color: stat.color }}><i className={`fas ${stat.icon}`} /></div>
            <div><div className="employee-stat-value">{stat.value}</div><div className="employee-stat-label">{stat.label}</div></div>
          </div>
        ))}
      </div>

      <div className="employee-card">
        <SH title="My Announcements" count={announcements.length} actions={<button className="employee-btn employee-btn-primary employee-btn-sm" onClick={() => setShowCreateModal(true)}><i className="fas fa-plus" /> Create</button>} />
        {loading ? <Spin /> : announcements.length === 0 ? (
          <Empty msg="No trainer announcements yet." icon="fa-bullhorn" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead><tr><th>#</th><th>Title</th><th>Type</th><th>Audience</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {announcements.map((ann, idx) => (
                  <tr key={ann.id}>
                    <td>{idx + 1}</td>
                    <td><strong>{ann.title}</strong><div style={{ color: T.slate, fontSize: 11 }}>{ann.message?.slice(0, 60)}{ann.message?.length > 60 ? '...' : ''}</div></td>
                    <td><TypeBadge type={ann.announcement_type} /></td>
                    <td style={{ fontSize: 12 }}>{audienceLabel(ann)}</td>
                    <td><span style={{ background: ann.is_published ? '#e8f8f0' : '#f0f3f7', color: ann.is_published ? T.sage : T.slate, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{ann.is_published ? 'Published' : 'Draft'}</span></td>
                    <td style={{ color: T.slate, fontSize: 12 }}>{new Date(ann.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="employee-btn employee-btn-ghost employee-btn-icon" onClick={() => setViewModal(ann)} title="View"><i className="fas fa-eye" /></button>
                        <button className="employee-btn employee-btn-teal employee-btn-icon" onClick={() => openEdit(ann)} title="Edit"><i className="fas fa-edit" /></button>
                        <button className="employee-btn employee-btn-icon" onClick={() => handleToggle(ann.id)} title="Toggle" style={{ background: ann.is_published ? '#fef5e4' : '#e8f8f0', color: ann.is_published ? T.amber : T.sage }}><i className={`fas ${ann.is_published ? 'fa-eye-slash' : 'fa-eye'}`} /></button>
                        <button className="employee-btn employee-btn-danger employee-btn-icon" onClick={() => setDeleteModal(ann)} title="Delete"><i className="fas fa-trash-alt" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showCreateModal} onClose={() => { resetForm(); setShowCreateModal(false) }} title="Create Trainer Announcement" size="md">
        {renderFormBody(handleCreate)}
      </Modal>
      <Modal open={!!showEditModal} onClose={() => { resetForm(); setShowEditModal(null) }} title="Edit Trainer Announcement" size="md">
        {renderFormBody(handleUpdate)}
      </Modal>
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title="Announcement Details" size="md">
        {viewModal && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}><TypeBadge type={viewModal.announcement_type} /><span style={{ color: T.slate, fontSize: 12 }}>{audienceLabel(viewModal)}</span></div>
            <h4 style={{ margin: '0 0 10px' }}>{viewModal.title}</h4>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: 16, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{viewModal.message}</div>
          </div>
        )}
      </Modal>
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Announcement" size="sm">
        <p style={{ color: T.slate }}>Delete "{deleteModal?.title}"?</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="employee-btn employee-btn-ghost" onClick={() => setDeleteModal(null)}>Cancel</button>
          <button className="employee-btn employee-btn-danger" onClick={handleDelete}>Delete</button>
        </div>
      </Modal>
    </div>
  )
}

export function StaffDoubts() {
  const [doubts, setDoubts] = useState([])
  const [loading, setLoading] = useState(true)
  const [replyModal, setReplyModal] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = () => { setLoading(true); api.get('/doubts/staff/').then(r => setDoubts(r.data)).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const handleReply = async () => {
    if (!replyText.trim()) return toast.error('Reply cannot be empty')
    setSubmitting(true)
    try {
      await api.post(`/doubts/${replyModal.id}/reply/`, { reply: replyText })
      toast.success('Reply sent! Student has been notified.')
      setReplyModal(null); setReplyText(''); load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed')
    } finally { setSubmitting(false) }
  }

  const pending = doubts.filter(d => !d.is_resolved)
  const resolved = doubts.filter(d => d.is_resolved)

  return (
    <div className="employee-root">
      <Styles />
      <PH title="❓ Student Doubts" sub="Respond to student doubts about sessions" />

      <div className="employee-stat-grid" style={{ marginBottom: 24 }}>
        <div className="employee-stat-card" style={{ background: '#fff3cd', border: 'none' }}>
          <div><div className="employee-stat-value">{pending.length}</div><div className="employee-stat-label">⏳ Pending Doubts</div></div>
        </div>
        <div className="employee-stat-card" style={{ background: '#d1e7dd', border: 'none' }}>
          <div><div className="employee-stat-value">{resolved.length}</div><div className="employee-stat-label">✅ Resolved</div></div>
        </div>
      </div>

      <div className="employee-card">
        <SH title={`All Student Doubts (${doubts.length})`} />
        {loading ? <Spin /> : doubts.length === 0 ? (
          <Empty msg="All Clear! No doubts raised." icon="fa-check-circle" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr><th>#</th><th>Student</th><th>Session</th><th>Doubt</th><th>Raised On</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {doubts.map((d, i) => (
                  <tr key={d.id}>
                    <td>{i + 1}</td>
                    <td><strong>{d.student_name}</strong><br /><small>{d.student_id}</small></td>
                    <td>Session {d.session_number}<br /><small>{d.session_title?.substring(0, 30)}</small></td>
                    <td style={{ maxWidth: 250 }}>{d.doubt_text}</td>
                    <td style={{ fontSize: 12 }}>{d.raised_at}</td>
                    <td><Badge text={d.is_resolved ? 'Resolved' : 'Pending'} variant={d.is_resolved ? 'success' : 'warning'} /></td>
                    <td>
                      {!d.is_resolved && (
                        <button className="employee-btn employee-btn-sm employee-btn-primary" onClick={() => { setReplyModal(d); setReplyText('') }}>
                          <i className="fas fa-reply" /> Reply
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {replyModal && (
        <Modal open onClose={() => { setReplyModal(null); setReplyText('') }} title="💬 Reply to Doubt" size="md">
          <div className="employee-alert-info" style={{ marginBottom: 16 }}>
            <strong>{replyModal.student_name}</strong> — Session {replyModal.session_number}
          </div>
          <div className="employee-alert-warning" style={{ marginBottom: 16 }}>
            <strong>Student's Doubt:</strong>
            <p style={{ margin: '8px 0 0' }}>{replyModal.doubt_text}</p>
          </div>
          <div className="employee-fg">
            <label className="employee-label">Your Reply</label>
            <textarea className="employee-input" rows={4} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your reply..." />
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="employee-btn employee-btn-ghost" onClick={() => { setReplyModal(null); setReplyText('') }}>Cancel</button>
            <button className="employee-btn employee-btn-primary" onClick={handleReply} disabled={submitting || !replyText.trim()}>
              <i className={`fas ${submitting ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} />
              {submitting ? 'Sending...' : 'Send Reply'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export function ViewStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadStudents = async () => {
    setLoading(true)
    try {
      // First get trainer's batches
      const batchesRes = await api.get('/batches/')
      const batches = batchesRes.data.results || batchesRes.data || []

      // Get students from each batch
      let allStudents = []
      for (const batch of batches) {
        try {
          const studentsRes = await api.get(`/batches/${batch.id}/students/`)
          const batchStudents = studentsRes.data || []
          allStudents = [...allStudents, ...batchStudents.map(s => ({
            ...s,
            batch_number: batch.batch_number
          }))]
        } catch (err) {
          console.error(`Error loading students for batch ${batch.id}:`, err)
        }
      }

      // Remove duplicates
      const uniqueStudents = Array.from(
        new Map(allStudents.map(s => [s.id, s])).values()
      )

      setStudents(uniqueStudents)
      console.log(`Loaded ${uniqueStudents.length} students from ${batches.length} batches`)

    } catch (err) {
      console.error('Failed to load students:', err)
      toast.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadStudents() }, [])

  const filtered = students.filter(s =>
    `${s.first_name} ${s.last_name || ''} ${s.student_id}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="employee-root">
      <Styles />
      <PH
        title="👨‍🎓 My Students"
        sub="Students from your batches"
        btn={
          <button className="employee-btn employee-btn-sm employee-btn-primary" onClick={loadStudents}>
            <i className="fas fa-sync-alt" /> Refresh
          </button>
        }
      />

      <div className="employee-card">
        <SH title="Student List" count={filtered.length} actions={
          <input
            className="employee-input"
            style={{ width: 250 }}
            placeholder="🔍 Search students..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        } />

        {loading ? <Spin /> : filtered.length === 0 ? (
          <Empty msg="No students found in your batches" icon="fa-user-graduate" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Batch</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Course</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id}>
                    <td>{i + 1}</td>
                    <td><Badge text={s.student_id} variant="info" /></td>
                    <td><div style={{ fontWeight: 500 }}>{s.first_name} {s.last_name || ''}</div></td>
                    <td><Badge text={s.batch_number || '—'} variant="primary" /></td>
                    <td style={{ fontSize: 12 }}>{s.email}</td>
                    <td>{s.mobile_no}</td>
                    <td>{s.course}</td>
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

export function StaffStudentLeaveRequests() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/staff/student-leave/').then(r => {
      setLeaves(r.data.results || r.data || [])
    }).catch(err => {
      toast.error("Failed to load leave requests")
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const processLeave = async (id, action) => {
    if (!window.confirm(`${action === 'approved' ? 'Approve' : 'Reject'} this leave request?`)) return
    try {
      await api.patch(`/staff/student-leave/${id}/process/`, { status: action })
      toast.success(`Leave ${action} successfully!`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to process leave')
    }
  }

  const pendingLeaves = leaves.filter(l => l.status === 'pending')
  const processedLeaves = leaves.filter(l => l.status !== 'pending')
  const displayLeaves = showHistory ? processedLeaves : pendingLeaves

  return (
    <div className="employee-root">
      <Styles />
      <PH title="📋 Student Leave Requests" sub="Manage leave requests from your students" />

      <div className="employee-stat-grid">
        <div className="employee-stat-card" style={{ background: '#fff3cd', border: 'none' }}>
          <div><div className="employee-stat-value">{pendingLeaves.length}</div><div className="employee-stat-label">⏳ Pending Requests</div></div>
        </div>
        <div className="employee-stat-card" style={{ background: '#d1e7dd', border: 'none' }}>
          <div><div className="employee-stat-value">{processedLeaves.filter(l => l.status === 'approved').length}</div><div className="employee-stat-label">✅ Approved</div></div>
        </div>
        <div className="employee-stat-card" style={{ background: '#f8d7da', border: 'none' }}>
          <div><div className="employee-stat-value">{processedLeaves.filter(l => l.status === 'rejected').length}</div><div className="employee-stat-label">❌ Rejected</div></div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: `2px solid ${T.border}` }}>
        <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', padding: '10px 20px', fontWeight: !showHistory ? 700 : 400, color: !showHistory ? T.amber : T.slate, borderBottom: !showHistory ? `2px solid ${T.amber}` : 'none', cursor: 'pointer' }}>
          ⏳ Pending Requests ({pendingLeaves.length})
        </button>
        <button onClick={() => setShowHistory(true)} style={{ background: 'none', border: 'none', padding: '10px 20px', fontWeight: showHistory ? 700 : 400, color: showHistory ? T.amber : T.slate, borderBottom: showHistory ? `2px solid ${T.amber}` : 'none', cursor: 'pointer' }}>
          📋 Processed History ({processedLeaves.length})
        </button>
      </div>

      <div className="employee-card">
        {loading ? <Spin /> : displayLeaves.length === 0 ? (
          <Empty msg={`No ${showHistory ? 'processed' : 'pending'} leave requests`} icon="fa-inbox" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr><th>Student</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Applied On</th><th>Status</th>{!showHistory && <th>Actions</th>}</tr>
              </thead>
              <tbody>
                {displayLeaves.map(l => (
                  <tr key={l.id}>
                    <td><strong>{l.student_name}</strong><br /><small>{l.student_id}</small></td>
                    <td>{l.leave_type}</td>
                    <td>{l.start_date}</td>
                    <td>{l.end_date}</td>
                    <td><Badge text={`${l.number_of_days} days`} variant="warning" /></td>
                    <td style={{ maxWidth: 200 }}>{l.reason}</td>
                    <td style={{ fontSize: 12 }}>{l.applied_at ? new Date(l.applied_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td><Badge text={l.status} variant={l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'danger' : 'warning'} /></td>
                    {!showHistory && l.status === 'pending' && (
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="employee-btn employee-btn-sm employee-btn-teal" onClick={() => processLeave(l.id, 'approved')}><i className="fas fa-check" /> Approve</button>
                          <button className="employee-btn employee-btn-sm employee-btn-danger" onClick={() => processLeave(l.id, 'rejected')}><i className="fas fa-times" /> Reject</button>
                        </div>
                      </td>
                    )}
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

export function StaffOwnLeaveHistory() {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/staff-leave/').then(r => {
      setLeaves(r.data.results || r.data || [])
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="employee-root">
      <Styles />
      <PH title="📋 My Leave History" sub="View your own leave applications" />
      <div className="employee-card">
        <SH title="Leave Applications" count={leaves.length} />
        {loading ? <Spin /> : leaves.length === 0 ? (
          <Empty msg="No leave applications found" icon="fa-calendar-alt" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Reason</th><th>Status</th></tr></thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.leave_type}</td>
                    <td>{l.start_date}</td>
                    <td>{l.end_date}</td>
                    <td>{l.no_of_days}</td>
                    <td style={{ maxWidth: 200 }}>{l.reason}</td>
                    <td><Badge text={l.status} variant={l.status === 'Approved' ? 'success' : l.status === 'Rejected' ? 'danger' : 'warning'} /></td>
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
// TEST MANAGEMENT COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

export function CreateTest() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('manual')
  const [form, setForm] = useState({
    title: '',
    test_date: '',
    start_time: '',
    duration_minutes: 60,
    instructions: '',
  })
  const [questions, setQuestions] = useState([{ question_text: 'Write a program to display palindrome words.' }])
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)


  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const addTechnicalQuestion = () => setQuestions(prev => [...prev, { question_text: '' }])
  const updateTechnicalQuestion = (index, value) => {
    setQuestions(prev => prev.map((item, idx) => idx === index ? { ...item, question_text: value } : item))
  }
  const removeTechnicalQuestion = (index) => {
    if (questions.length === 1) return toast.error('At least one question is needed')
    setQuestions(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.test_date || !form.start_time) {
      toast.error('Fill title, date and start time')
      return
    }
    if (mode === 'manual' && questions.some(q => !q.question_text.trim())) {
      toast.error('Fill all technical questions')
      return
    }
    if (mode === 'upload' && !file) {
      toast.error('Upload technical test PDF/file')
      return
    }

    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('description', form.instructions)
      fd.append('test_type', 'technical')
      fd.append('creation_method', mode)
      fd.append('test_date', form.test_date)
      fd.append('start_time', form.start_time)
      fd.append('duration_minutes', form.duration_minutes || 60)
      fd.append('instructions', form.instructions)
      if (file) fd.append('question_paper', file)

      const response = await api.post('/tests/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (mode === 'manual') {
        for (const q of questions) {
          await api.post(`/tests/${response.data.id}/add-question/`, {
            question_text: q.question_text,
            option1: '',
            option2: '',
            option3: '',
            option4: '',
            correct_answer: '',
          })
        }
      }
      toast.success('Technical test published successfully!')
      navigate('/employee/tests')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create technical test')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH title="Technical Test" sub="Create coding/descriptive tests manually or upload a question paper" />
      <div className="employee-card" style={{ maxWidth: 900 }}>
        <div className="employee-card-body" style={{ padding: 22 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'inline-flex', gap: 6, padding: 5, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 18 }}>
              {[
                ['manual', 'Create Questions'],
                ['upload', 'Upload File'],
              ].map(([key, label]) => (
                <button key={key} type="button" className={`employee-btn ${mode === key ? 'employee-btn-primary' : 'employee-btn-ghost'}`} onClick={() => setMode(key)}>
                  {label}
                </button>
              ))}
            </div>

            <div className="employee-fg">
              <label className="employee-label">Test Title <span className="employee-req">*</span></label>
              <input type="text" className="employee-input" value={form.title} onChange={e => updateForm('title', e.target.value)} placeholder="e.g. Java String Programs" required />
            </div>

            <div className="employee-row-grid-2">
              <div className="employee-fg">
                <label className="employee-label">Test Date <span className="employee-req">*</span></label>
                <input type="date" className="employee-input" value={form.test_date} onChange={e => updateForm('test_date', e.target.value)} required />
              </div>
              <div className="employee-fg">
                <label className="employee-label">Start Time <span className="employee-req">*</span></label>
                <input type="time" className="employee-input" value={form.start_time} onChange={e => updateForm('start_time', e.target.value)} required />
              </div>
              <div className="employee-fg">
                <label className="employee-label">Duration</label>
                <input type="number" min="1" className="employee-input" value={form.duration_minutes} onChange={e => updateForm('duration_minutes', e.target.value)} />
              </div>
            </div>

            <div className="employee-fg">
              <label className="employee-label">Instructions</label>
              <textarea className="employee-input" rows={3} value={form.instructions} onChange={e => updateForm('instructions', e.target.value)} placeholder="Add coding rules, submission instructions, allowed language, etc." />
            </div>

            {mode === 'manual' ? (
              <div className="employee-card" style={{ background: '#f8fafc', marginBottom: 18 }}>
                <div className="employee-card-header">
                  <h5>Technical Questions ({questions.length})</h5>
                  <button type="button" className="employee-btn employee-btn-sm employee-btn-teal" onClick={addTechnicalQuestion}>
                    <i className="fas fa-plus" /> Add Question
                  </button>
                </div>
                <div style={{ padding: 18, display: 'grid', gap: 14 }}>
                  {questions.map((q, idx) => (
                    <div key={idx} className="employee-fg" style={{ margin: 0 }}>
                      <label className="employee-label">Question {idx + 1}</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <textarea className="employee-input" rows={2} value={q.question_text} onChange={e => updateTechnicalQuestion(idx, e.target.value)} placeholder="Write a program to display palindrome words." />
                        <button type="button" className="employee-btn employee-btn-sm employee-btn-danger" onClick={() => removeTechnicalQuestion(idx)}>
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="employee-fg">
                <label className="employee-label">Technical Test File / PDF <span className="employee-req">*</span></label>
                <input type="file" className="employee-input" accept=".pdf,.doc,.docx,.txt" onChange={e => setFile(e.target.files[0])} />
                <small className="employee-hint">Upload the technical question paper. PDF is supported.</small>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button type="button" className="employee-btn employee-btn-ghost" onClick={() => window.history.back()}>Cancel</button>
              <button type="submit" className="employee-btn employee-btn-primary" disabled={saving}>
                <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-plus'}`} />
                {saving ? 'Publishing...' : 'Publish Technical Test'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
export function ViewTests() {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [batches, setBatches] = useState([])
  const [selectedBatchIds, setSelectedBatchIds] = useState([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedTest, setSelectedTest] = useState(null)
  const [deleteId, setDeleteId] = useState(null)  // Add state for delete confirmation

  useEffect(() => { loadTests(); loadBatches() }, [])

  const loadTests = async () => {
    try {
      const response = await api.get('/tests/')
      const testsData = response.data.results || response.data || []

      // Get question counts for each test
      const testsWithCount = await Promise.all(testsData.map(async (test) => {
        try {
          let questionCount = 0

          try {
            const questionsRes = await api.get(`/tests/${test.id}/questions/`)
            if (questionsRes.data.count !== undefined) {
              questionCount = questionsRes.data.count
            } else if (questionsRes.data.questions) {
              questionCount = questionsRes.data.questions.length
            } else if (Array.isArray(questionsRes.data)) {
              questionCount = questionsRes.data.length
            } else if (questionsRes.data.results) {
              questionCount = questionsRes.data.results.length
            }
          } catch (err) {
            console.log(`No questions endpoint for test ${test.id}`)
          }

          return { ...test, question_count: questionCount }
        } catch (err) {
          console.error(`Error getting questions for test ${test.id}:`, err)
          return { ...test, question_count: 0 }
        }
      }))

      setTests(testsWithCount)
    } catch (err) {
      console.error('Failed to load tests:', err)
      toast.error('Failed to load tests')
    } finally {
      setLoading(false)
    }
  }

  const loadBatches = async () => {
    try {
      const [activeRes, previousRes] = await Promise.all([
        api.get('/batches/'),
        api.get('/batches/?access=previous').catch(() => ({ data: { results: [] } })),
      ])
      const active = activeRes.data.results || activeRes.data || []
      const previous = (previousRes.data.results || previousRes.data || []).map(batch => ({ ...batch, accessStatus: 'previous' }))
      setBatches([...active, ...previous])
    } catch (err) {
      console.error('Failed to load batches', err)
    }
  }

  const toggleAssignBatch = (batchId) => {
    const id = String(batchId)
    setSelectedBatchIds(prev => (
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    ))
  }

  const assignTest = async () => {
    if (!selectedTest || selectedBatchIds.length === 0) {
      toast.error('Please select at least one batch')
      return
    }
    try {
      await api.post('/assigned-tests/', { test: selectedTest.id, batch_ids: selectedBatchIds })
      toast.success(`Test "${selectedTest.title}" assigned to ${selectedBatchIds.length} batch(es) successfully!`)
      setShowAssignModal(false)
      setSelectedTest(null)
      setSelectedBatchIds([])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign test')
    }
  }

  const deleteTest = async () => {
    if (!deleteId) return

    try {
      await api.delete(`/tests/${deleteId}/`)
      toast.success('Test deleted successfully!')
      setDeleteId(null)
      loadTests()  // Refresh the list
    } catch (err) {
      console.error('Delete error:', err)
      toast.error(err.response?.data?.error || 'Failed to delete test')
    }
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH
        title="Technical Tests"
        sub="Manage technical tests and assigned batches"
        btn={
          <button className="employee-btn employee-btn-primary" onClick={() => window.location.href = '/employee/tests/create'}>
            <i className="fas fa-plus" /> Create Technical Test
          </button>
        }
      />

      <div className="employee-card">
        <SH title={`My Tests (${tests.length})`} />
        {loading ? <Spin /> : tests.length === 0 ? (
          <Empty msg="No tests created yet" icon="fa-file-alt" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Questions / Paper</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tests.map(test => (
                  <tr key={test.id}>
                    <td style={{ fontWeight: 600 }}>{test.title}</td>
                    <td style={{ maxWidth: 200 }}>{test.description || '�'}</td>
                    <td><Badge text={test.creation_method === 'upload' ? 'Uploaded File' : 'Manual'} variant={test.creation_method === 'upload' ? 'info' : 'success'} /></td>
                    <td style={{ textAlign: 'center' }}>
                      {test.creation_method === 'upload'
                        ? <Badge text={test.question_paper_url ? 'Paper Ready' : 'No File'} variant={test.question_paper_url ? 'success' : 'warning'} />
                        : <Badge text={test.question_count || 0} variant={test.question_count > 0 ? 'success' : 'warning'} />}
                    </td>
                    <td style={{ fontSize: 12 }}>{new Date(test.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="employee-btn employee-btn-sm employee-btn-primary"
                          onClick={() => { setSelectedTest(test); setShowAssignModal(true) }}
                          disabled={test.creation_method !== 'upload' && test.question_count === 0}
                          title={test.creation_method !== 'upload' && test.question_count === 0 ? "Cannot assign test with no questions" : "Assign test to batch"}
                        >
                          <i className="fas fa-plus" /> Assign
                        </button>
                        <button
                          className="employee-btn employee-btn-sm employee-btn-ghost"
                          onClick={() => window.location.href = `/employee/tests/${test.id}/add-questions`}
                        >
                          <i className="fas fa-edit" /> Questions
                        </button>
                        <button
                          className="employee-btn employee-btn-sm employee-btn-danger"
                          onClick={() => setDeleteId(test.id)}
                          title="Delete Test"
                        >
                          <i className="fas fa-trash-alt" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Test Modal */}
      {showAssignModal && (
        <Modal open onClose={() => setShowAssignModal(false)} title="Assign Test to Batch" size="md">
          <div className="employee-fg">
            <label className="employee-label">Test: <strong>{selectedTest?.title}</strong></label>
            {selectedTest?.question_count === 0 && (
              <div className="employee-alert-warning" style={{ marginTop: 8, padding: '8px 12px', fontSize: 12 }}>
                <i className="fas fa-exclamation-triangle" /> This test has no questions. Please add questions first.
              </div>
            )}
          </div>
          <div className="employee-fg">
            <label className="employee-label">Select Batches <span className="employee-req">*</span></label>
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: 10, maxHeight: 260, overflowY: 'auto', background: '#fff' }}>
              {batches.length === 0 ? (
                <div style={{ color: T.slate, fontSize: 13 }}>No batches found.</div>
              ) : batches.map(batch => (
                <label key={batch.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 8px', borderRadius: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedBatchIds.includes(String(batch.id))}
                    onChange={() => toggleAssignBatch(batch.id)}
                  />
                  <span style={{ fontWeight: 700 }}>{getBatchDisplayName(batch)}</span>
                  <span style={{ color: T.slate, fontSize: 12 }}>{batch.course_name_display || batch.course_name || ''}</span>
                </label>
              ))}
            </div>
            <small className="employee-hint">{selectedBatchIds.length} batch(es) selected</small>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="employee-btn employee-btn-ghost" onClick={() => setShowAssignModal(false)}>Cancel</button>
            <button
              className="employee-btn employee-btn-primary"
              onClick={assignTest}
              disabled={selectedTest?.question_count === 0 || selectedBatchIds.length === 0}
            >
              Assign Test
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <Modal open onClose={() => setDeleteId(null)} title="Delete Test" size="sm">
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: '#fdeaec',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <i className="fas fa-trash-alt" style={{ fontSize: 28, color: '#e84855' }} />
            </div>
            <h4 style={{ marginBottom: 8, fontSize: 18 }}>Are you sure?</h4>
            <p style={{ color: '#666', marginBottom: 20, fontSize: 14 }}>
              Delete this test? This action cannot be undone.
              <br />
              <strong>Note: This will also delete all questions in this test.</strong>
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="employee-btn employee-btn-ghost"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </button>
              <button
                className="employee-btn employee-btn-danger"
                onClick={deleteTest}
              >
                Delete Test
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}


export function TestResults() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState('')
  const [batches, setBatches] = useState([])
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    api.get('/batches/').then(r => setBatches(r.data.results || r.data || []))
  }, [])

  const loadResults = async (batchId) => {
    if (!batchId) { setResults([]); setSearched(false); return }
    setLoading(true)
    setSearched(true)
    try {
      const response = await api.get(`/staff/test-results/?batch_id=${batchId}`)
      const resultsData = response.data.results || response.data || []
      setResults(resultsData)
    } catch (err) {
      console.error('Failed to load test results:', err)
      toast.error('Failed to load test results')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleBatchChange = (e) => {
    const batchId = e.target.value
    setSelectedBatch(batchId)
    loadResults(batchId)
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH title="📊 Test Results" sub="Select a batch to view student test performances" />

      <div className="employee-card" style={{ marginBottom: 20 }}>
        <div style={{ padding: 20 }}>
          <label className="employee-label">Select Batch</label>
          <select
            className="employee-select"
            style={{ maxWidth: 350 }}
            value={selectedBatch}
            onChange={handleBatchChange}
          >
            <option value="">— Select a Batch —</option>
            {batches.map(batch => (
              <option key={batch.id} value={batch.id}>
                {getBatchDisplayName(batch)} — {batch.course_name_display}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="employee-card">
        <SH title="Test Results" count={results.length} />

        {!searched ? (
          <div style={{ padding: 60, textAlign: 'center', color: T.slate }}>
            <i className="fas fa-hand-point-up" style={{ fontSize: 40, opacity: 0.2, marginBottom: 16, display: 'block' }} />
            <p style={{ fontFamily: "'Playfair Display'", fontSize: 16 }}>Select a batch above to view results</p>
          </div>
        ) : loading ? (
          <Spin />
        ) : results.length === 0 ? (
          <Empty msg="No test results found for this batch" icon="fa-file-alt" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Test Title</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Result</th>
                  <th>Submitted Date</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, idx) => (
                  <tr key={result.id || idx}>
                    <td style={{ color: T.slate, fontSize: 12 }}>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{result.student_name || '—'}</td>
                    <td style={{ fontSize: 12 }}>{result.student_id || '—'}</td>
                    <td style={{ fontSize: 13 }}>{result.test_title || '—'}</td>
                    <td>{result.score || 0}/{result.total_questions || 0}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#e9ecef', borderRadius: 3, minWidth: 60 }}>
                          <div style={{
                            height: '100%',
                            width: `${result.percentage || 0}%`,
                            background: (result.percentage || 0) >= 50 ? T.sage : T.rose,
                            borderRadius: 3
                          }} />
                        </div>
                        <strong style={{ fontSize: 12 }}>{(result.percentage || 0).toFixed(1)}%</strong>
                      </div>
                    </td>
                    <td>
                      <Badge
                        text={(result.percentage || 0) >= 50 ? 'Passed' : 'Failed'}
                        variant={(result.percentage || 0) >= 50 ? 'success' : 'danger'}
                      />
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {result.submitted_at
                        ? new Date(result.submitted_at).toLocaleDateString('en-IN')
                        : '—'}
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

export function AddQuestions() {
  const [test, setTest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [questions, setQuestions] = useState([])
  const [existingQuestions, setExistingQuestions] = useState([])

  const testId = window.location.pathname.split('/')[3]
  const isTechnicalTest = test?.test_type === 'technical'

  useEffect(() => {
    loadData()
  }, [])

  const emptyQuestion = (technical = false) => ({
    id: null,
    question_text: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correct_answer: technical ? '' : '1'
  })

  const loadData = async () => {
    try {
      const [testRes, questionRes] = await Promise.all([
        api.get(`/tests/${testId}/`),
        api.get(`/tests/${testId}/questions/`)
      ])
      const loadedTest = testRes.data
      setTest(loadedTest)

      let existingQ = []
      if (questionRes.data.results) existingQ = questionRes.data.results
      else if (Array.isArray(questionRes.data)) existingQ = questionRes.data
      else if (questionRes.data.questions) existingQ = questionRes.data.questions

      setExistingQuestions(existingQ)

      if (existingQ.length > 0) {
        setQuestions(existingQ.map(q => ({
          id: q.id,
          question_text: q.question_text || '',
          option1: q.option1 || '',
          option2: q.option2 || '',
          option3: q.option3 || '',
          option4: q.option4 || '',
          correct_answer: loadedTest?.test_type === 'technical' ? '' : getCorrectAnswerLetter(q)
        })))
      } else {
        setQuestions([emptyQuestion(loadedTest?.test_type === 'technical')])
      }
    } catch (err) {
      console.error('Error loading questions:', err)
      toast.error('Failed to load questions')
      setQuestions([emptyQuestion(false)])
    } finally {
      setLoading(false)
    }
  }

  const getCorrectAnswerLetter = (q) => {
    const correctAnswer = q.correct_answer?.toLowerCase()
    if (correctAnswer === 'a' || correctAnswer === '1' || correctAnswer === q.option1) return '1'
    if (correctAnswer === 'b' || correctAnswer === '2' || correctAnswer === q.option2) return '2'
    if (correctAnswer === 'c' || correctAnswer === '3' || correctAnswer === q.option3) return '3'
    if (correctAnswer === 'd' || correctAnswer === '4' || correctAnswer === q.option4) return '4'
    return '1'
  }

  const addQuestion = () => setQuestions(prev => [...prev, emptyQuestion(isTechnicalTest)])

  const removeQuestion = (index) => {
    if (questions.length === 1) {
      toast.error('At least one question is required')
      return
    }
    setQuestions(prev => prev.filter((_, idx) => idx !== index))
  }

  const updateQuestion = (index, field, value) => {
    setQuestions(prev => prev.map((item, idx) => idx === index ? { ...item, [field]: value } : item))
  }

  const saveQuestions = async () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question_text.trim()) {
        toast.error(`Please enter question ${i + 1} text`)
        return
      }
      if (!isTechnicalTest && (!q.option1.trim() || !q.option2.trim())) {
        toast.error(`Please enter at least options 1 and 2 for question ${i + 1}`)
        return
      }
    }

    setSaving(true)
    try {
      const existingIds = existingQuestions.map(q => q.id)
      const currentIds = questions.filter(q => q.id).map(q => q.id)
      const idsToDelete = existingIds.filter(id => !currentIds.includes(id))

      for (const id of idsToDelete) {
        try {
          await api.delete(`/questions/${id}/delete/`)
        } catch (err) {
          console.error(`Error deleting question ${id}:`, err)
        }
      }

      for (const q of questions) {
        const payload = isTechnicalTest ? {
          question_text: q.question_text,
          option1: '',
          option2: '',
          option3: '',
          option4: '',
          correct_answer: ''
        } : {
          question_text: q.question_text,
          option1: q.option1,
          option2: q.option2,
          option3: q.option3 || '',
          option4: q.option4 || '',
          correct_answer: q.correct_answer
        }

        if (q.id) await api.put(`/questions/${q.id}/update/`, payload)
        else await api.post(`/tests/${testId}/add-question/`, payload)
      }

      toast.success(`${questions.length} question(s) saved successfully!`)
      window.location.href = '/employee/tests'
    } catch (err) {
      console.error('Save error:', err)
      toast.error(err.response?.data?.error || 'Failed to save questions')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH
        title={`${existingQuestions.length > 0 ? 'Edit' : 'Add'} ${isTechnicalTest ? 'Technical' : ''} Questions to "${test?.title}"`}
        sub={isTechnicalTest ? 'Add descriptive or coding questions for this technical test' : existingQuestions.length > 0 ? 'Edit existing questions - changes will be saved directly' : 'Manually type questions and options for your test'}
      />

      <div className="employee-card">
        <div className="employee-card-header" style={{ justifyContent: 'space-between' }}>
          <h5>{isTechnicalTest ? 'Technical Questions' : 'Questions'} ({questions.length})</h5>
          <button className="employee-btn employee-btn-sm employee-btn-teal" onClick={addQuestion}>
            <i className="fas fa-plus" /> Add Question
          </button>
        </div>

        <div className="employee-modal-body">
          {questions.map((q, idx) => (
            <div key={q.id || idx} className="employee-card" style={{ marginBottom: 20, background: '#f8fafc' }}>
              <div className="employee-card-header" style={{ background: 'transparent' }}>
                <strong>Question {idx + 1}</strong>
                {q.id && <Badge text="Existing" variant="info" style={{ marginLeft: 8 }} />}
                <button className="employee-btn employee-btn-sm employee-btn-danger" onClick={() => removeQuestion(idx)}>
                  <i className="fas fa-trash" /> Remove
                </button>
              </div>
              <div style={{ padding: 20 }}>
                <div className="employee-fg">
                  <label className="employee-label">Question Text *</label>
                  <textarea
                    className="employee-input"
                    rows={isTechnicalTest ? 4 : 2}
                    value={q.question_text}
                    onChange={e => updateQuestion(idx, 'question_text', e.target.value)}
                    placeholder={isTechnicalTest ? 'Write a Java program to reverse a string.' : 'Enter your question here...'}
                  />
                </div>

                {!isTechnicalTest && (
                  <>
                    <div className="employee-row-grid-2">
                      <div className="employee-fg">
                        <label className="employee-label">Option 1 *</label>
                        <div className="employee-input" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}>
                          <span style={{ background: T.amber, padding: '8px 12px', borderRadius: '8px 0 0 8px', color: T.navy, fontWeight: 600 }}>A</span>
                          <input className="employee-input" style={{ border: 'none', flex: 1 }} value={q.option1} onChange={e => updateQuestion(idx, 'option1', e.target.value)} placeholder="Option 1" />
                        </div>
                      </div>
                      <div className="employee-fg">
                        <label className="employee-label">Option 2 *</label>
                        <div className="employee-input" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}>
                          <span style={{ background: T.sage, padding: '8px 12px', borderRadius: '8px 0 0 8px', color: '#fff', fontWeight: 600 }}>B</span>
                          <input className="employee-input" style={{ border: 'none', flex: 1 }} value={q.option2} onChange={e => updateQuestion(idx, 'option2', e.target.value)} placeholder="Option 2" />
                        </div>
                      </div>
                      <div className="employee-fg">
                        <label className="employee-label">Option 3</label>
                        <div className="employee-input" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}>
                          <span style={{ background: T.teal, padding: '8px 12px', borderRadius: '8px 0 0 8px', color: '#fff', fontWeight: 600 }}>C</span>
                          <input className="employee-input" style={{ border: 'none', flex: 1 }} value={q.option3} onChange={e => updateQuestion(idx, 'option3', e.target.value)} placeholder="Option 3 (optional)" />
                        </div>
                      </div>
                      <div className="employee-fg">
                        <label className="employee-label">Option 4</label>
                        <div className="employee-input" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 0 }}>
                          <span style={{ background: T.rose, padding: '8px 12px', borderRadius: '8px 0 0 8px', color: '#fff', fontWeight: 600 }}>D</span>
                          <input className="employee-input" style={{ border: 'none', flex: 1 }} value={q.option4} onChange={e => updateQuestion(idx, 'option4', e.target.value)} placeholder="Option 4 (optional)" />
                        </div>
                      </div>
                    </div>

                    <div className="employee-fg">
                      <label className="employee-label">Correct Answer *</label>
                      <select
                        className="employee-select"
                        style={{ width: 'auto' }}
                        value={q.correct_answer}
                        onChange={e => updateQuestion(idx, 'correct_answer', e.target.value)}
                      >
                        <option value="1">Option 1 (A)</option>
                        <option value="2">Option 2 (B)</option>
                        <option value="3">Option 3 (C)</option>
                        <option value="4">Option 4 (D)</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="employee-btn employee-btn-ghost" onClick={() => window.location.href = '/employee/tests'}>
              Cancel
            </button>
            <button className="employee-btn employee-btn-primary" onClick={saveQuestions} disabled={saving}>
              <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-save'}`} />
              {saving ? 'Saving...' : 'Save All Questions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function UploadQuiz() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ title: '', description: '', duration_minutes: 30, passing_marks: 35, difficulty: 'medium' })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !file) { toast.error('Please fill all required fields'); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title); fd.append('description', form.description)
      fd.append('duration_minutes', form.duration_minutes); fd.append('passing_marks', form.passing_marks); fd.append('difficulty', form.difficulty)
      fd.append('source_file', file)
      const res = await api.post('/quiz/upload/', fd)
      toast.success(res.data?.message || 'Quiz uploaded successfully!')
      setForm({ title: '', description: '', duration_minutes: 30, passing_marks: 35, difficulty: 'medium' })
      setFile(null)
      navigate(location.pathname.startsWith('/admin') ? '/admin/quiz' : '/employee/quiz')
    } catch (err) { toast.error(err.response?.data?.error || 'Upload failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH title="Upload Quiz" sub="Upload quiz from Excel/CSV file, then assign it from Manage Quizzes" />
      <div className="employee-card" style={{ maxWidth: 700 }}>
        <div className="employee-card-body" style={{ padding: 22 }}>
          <form onSubmit={handleSubmit}>
            <div className="employee-fg"><label className="employee-label">Quiz Title *</label><input className="employee-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="employee-fg"><label className="employee-label">Description</label><textarea className="employee-input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="employee-row-grid-2">
              <div className="employee-fg"><label className="employee-label">Duration (minutes)</label><input type="number" className="employee-input" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) })} /></div>
              <div className="employee-fg"><label className="employee-label">Passing Marks (%)</label><input type="number" className="employee-input" value={form.passing_marks} onChange={e => setForm({ ...form, passing_marks: parseInt(e.target.value) })} /></div>
            </div>
            <div className="employee-fg"><label className="employee-label">Quiz File (Excel/CSV) *</label><input type="file" className="employee-input" style={{ padding: 7 }} onChange={e => setFile(e.target.files[0])} accept=".csv,.xlsx,.xls" required /><small className="employee-hint">Upload CSV or Excel file with columns: Question, Option_1, Option_2, Option_3, Option_4, Correct Answer</small></div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="submit" className="employee-btn employee-btn-primary" disabled={saving}><i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-upload'}`} /> {saving ? 'Uploading...' : 'Upload Quiz'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export function ManageQuizzes() {
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [batches, setBatches] = useState([])
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [detailQuiz, setDetailQuiz] = useState(null)
  const [selectedBatchIds, setSelectedBatchIds] = useState([])
  const [assigning, setAssigning] = useState(false)

  useEffect(() => { loadQuizzes(); loadBatches() }, [])

  const loadQuizzes = async () => {
    try {
      // This endpoint should return ONLY quizzes uploaded by the logged-in staff
      const response = await api.get('/quiz/')
      const allQuizzes = response.data.results || response.data || []

      // Filter on frontend as backup (but backend should already filter)
      setQuizzes(allQuizzes)
    } catch (err) {
      console.error('Failed to load quizzes:', err)
      toast.error('Failed to load quizzes')
    } finally {
      setLoading(false)
    }
  }

  const loadBatches = async () => {
    try {
      const [activeRes, previousRes] = await Promise.all([
        api.get('/batches/'),
        api.get('/batches/?access=previous').catch(() => ({ data: { results: [] } })),
      ])
      const active = activeRes.data.results || activeRes.data || []
      const previous = (previousRes.data.results || previousRes.data || []).map(batch => ({ ...batch, accessStatus: 'previous' }))
      setBatches([...active, ...previous])
    } catch (err) {
      console.error('Failed to load batches:', err)
      toast.error('Failed to load batches')
    }
  }

  const openAssignModal = (quiz) => {
    setSelectedQuiz(quiz)
    setSelectedBatchIds([])
  }

  const toggleBatchSelection = (batchId) => {
    const id = String(batchId)
    setSelectedBatchIds(prev => (
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    ))
  }

  const assignQuiz = async () => {
    if (!selectedQuiz || selectedBatchIds.length === 0) {
      toast.error('Please select at least one batch')
      return
    }
    setAssigning(true)
    try {
      await api.post(`/quiz/${selectedQuiz.id}/assign/`, { batch_ids: selectedBatchIds })
      toast.success(`Quiz "${selectedQuiz.title}" assigned successfully!`)
      setSelectedQuiz(null)
      setSelectedBatchIds([])
      loadQuizzes()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign quiz')
    } finally {
      setAssigning(false)
    }
  }

  const togglePublish = async (quizId, isPublished) => {
    try {
      await api.patch(`/quiz/${quizId}/toggle-publish/`)
      toast.success(`Quiz ${isPublished ? 'unpublished' : 'published'} successfully!`)
      loadQuizzes()
    } catch (err) {
      toast.error('Failed to update quiz status')
    }
  }

  const deleteQuiz = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return
    try {
      await api.delete(`/quiz/${quizId}/delete/`)
      toast.success('Quiz deleted successfully!')
      loadQuizzes()
    } catch (err) {
      toast.error('Failed to delete quiz')
    }
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH
        title="Manage Quizzes"
        sub="View, publish, and manage your uploaded quizzes"
        btn={
          <button className="employee-btn employee-btn-primary" onClick={() => window.location.href = '/employee/quiz/upload'}>
            <i className="fas fa-upload" /> Upload Quiz
          </button>
        }
      />
      <div className="employee-card">
        <SH title={`My Quizzes (${quizzes.length})`} />
        {loading ? <Spin /> : quizzes.length === 0 ? (
          <Empty msg="You haven't uploaded any quizzes yet" icon="fa-question-circle" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Batch</th>
                  <th>Uploaded By</th>
                  <th>Type</th>
                  <th>Questions / Paper</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.map(quiz => (
                  <tr key={quiz.id}>
                    <td style={{ fontWeight: 600 }}>{quiz.title}</td>
                    <td>{quiz.batch_number || <Badge text="Not assigned" variant="warning" />}</td>
                    <td>{quiz.created_by_name || '-'}<div style={{ marginTop: 4 }}><Badge text={quiz.created_by_trainer_status || 'Current Trainer'} variant={quiz.created_by_trainer_status === 'Previous Trainer' ? 'warning' : 'success'} /></div></td>
                    <td style={{ textAlign: 'center' }}>{quiz.total_questions || 0}</td>
                    <td>{quiz.duration_minutes} min</td>
                    <td>
                      <Badge
                        text={quiz.is_published ? 'Published' : 'Draft'}
                        variant={quiz.is_published ? 'success' : 'warning'}
                      />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="employee-btn employee-btn-sm employee-btn-ghost"
                          onClick={() => setDetailQuiz(quiz)}
                          title="View complete quiz details"
                        >
                          <i className="fas fa-eye" /> View
                        </button>
                        <button
                          className="employee-btn employee-btn-sm employee-btn-primary"
                          onClick={() => openAssignModal(quiz)}
                          title="Assign quiz to batches"
                        >
                          <i className="fas fa-plus" /> Assign
                        </button>
                        <button
                          className={`employee-btn employee-btn-sm ${quiz.is_published ? 'employee-btn-warning' : 'employee-btn-teal'}`}
                          style={{ background: quiz.is_published ? T.amber : T.teal, color: '#fff' }}
                          onClick={() => togglePublish(quiz.id, quiz.is_published)}
                          disabled={!quiz.batch_number && !quiz.is_published}
                          title={!quiz.batch_number && !quiz.is_published ? 'Assign this quiz to a batch first' : ''}
                        >
                          <i className={`fas ${quiz.is_published ? 'fa-eye-slash' : 'fa-eye'}`} />
                          {quiz.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          className="employee-btn employee-btn-sm employee-btn-danger"
                          onClick={() => deleteQuiz(quiz.id)}
                        >
                          <i className="fas fa-trash" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedQuiz && (
        <Modal open onClose={() => setSelectedQuiz(null)} title="Assign Quiz to Batches" size="md">
          <div className="employee-fg">
            <label className="employee-label">Quiz: <strong>{selectedQuiz.title}</strong></label>
            <div className="employee-hint" style={{ marginTop: 6 }}>
              Select one or more batches. Each selected batch will get this quiz in student web and mobile.
            </div>
          </div>
          <div className="employee-fg">
            <label className="employee-label">Select Batches <span className="employee-req">*</span></label>
            <div style={{ border: `1px solid ${T.border}`, borderRadius: 8, maxHeight: 260, overflowY: 'auto', padding: 8 }}>
              {batches.length === 0 ? (
                <div style={{ color: T.slate, fontSize: 13, padding: 10 }}>No batches found.</div>
              ) : batches.map(batch => (
                <label key={batch.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 8px', borderRadius: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedBatchIds.includes(String(batch.id))}
                    onChange={() => toggleBatchSelection(batch.id)}
                  />
                  <span style={{ fontWeight: 600 }}>{getBatchDisplayName(batch)}{batch.accessStatus === 'previous' ? ' - Reassigned' : ''}</span>
                  <span style={{ color: T.slate, fontSize: 12 }}>{batch.course_name_display || batch.course_name || ''}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="employee-btn employee-btn-ghost" onClick={() => setSelectedQuiz(null)}>Cancel</button>
            <button className="employee-btn employee-btn-primary" onClick={assignQuiz} disabled={assigning || selectedBatchIds.length === 0}>
              <i className={`fas ${assigning ? 'fa-spinner fa-spin' : 'fa-check'}`} />
              {assigning ? 'Assigning...' : 'Assign Quiz'}
            </button>
          </div>
        </Modal>
      )}

      <Modal open={!!detailQuiz} onClose={() => setDetailQuiz(null)} title="Quiz Details" size="xl">
        {detailQuiz && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
              <div className="employee-card" style={{ boxShadow: 'none', padding: 14 }}><strong>Title</strong><div>{detailQuiz.title}</div></div>
              <div className="employee-card" style={{ boxShadow: 'none', padding: 14 }}><strong>Batch</strong><div>{detailQuiz.batch_number || 'Not assigned'}</div></div>
              <div className="employee-card" style={{ boxShadow: 'none', padding: 14 }}><strong>Questions</strong><div>{detailQuiz.total_questions || 0}</div></div>
              <div className="employee-card" style={{ boxShadow: 'none', padding: 14 }}><strong>Marks</strong><div>{detailQuiz.total_marks || 0}</div></div>
              <div className="employee-card" style={{ boxShadow: 'none', padding: 14 }}><strong>Duration</strong><div>{detailQuiz.duration_minutes || 0} min</div></div>
              <div className="employee-card" style={{ boxShadow: 'none', padding: 14 }}><strong>Status</strong><div><Badge text={detailQuiz.is_published ? 'Active' : 'Draft'} variant={detailQuiz.is_published ? 'success' : 'warning'} /></div></div>
            </div>
            {detailQuiz.description && (
              <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, marginBottom: 18 }}>
                {detailQuiz.description}
              </div>
            )}
            <div style={{ overflowX: 'auto' }}>
              <table className="employee-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Question</th>
                    <th>Options</th>
                    <th>Correct</th>
                    <th>Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {(detailQuiz.questions || []).map(question => (
                    <tr key={question.id}>
                      <td>{question.question_number}</td>
                      <td style={{ minWidth: 220 }}>{question.question_text}</td>
                      <td style={{ minWidth: 260 }}>
                        <div>A. {question.option_a || '-'}</div>
                        <div>B. {question.option_b || '-'}</div>
                        {question.option_c && <div>C. {question.option_c}</div>}
                        {question.option_d && <div>D. {question.option_d}</div>}
                      </td>
                      <td><Badge text={question.correct_answer || '-'} variant="success" /></td>
                      <td>{question.marks || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}



export function StaffQuizResults() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [review, setReview] = useState(null)
  const [reviewLoading, setReviewLoading] = useState(false)

  useEffect(() => {
    loadResults()
  }, [])

  const loadResults = async () => {
    setLoading(true)
    setError(null)

    try {
      let response = null
      let success = false
      const endpoints = ['/api/quiz/staff-results/', '/quiz/staff-results/', '/staff-quiz-results/', '/api/staff-quiz-results/']

      for (const endpoint of endpoints) {
        try {
          response = await api.get(endpoint)
          if (response && response.data) {
            success = true
            break
          }
        } catch {
          continue
        }
      }

      if (!success || !response) throw new Error('No quiz results endpoint available')

      const allResults = response.data.results || (Array.isArray(response.data) ? response.data : [])
      setResults(allResults)
      setError(allResults.length === 0 ? 'No quiz results available yet' : null)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load quiz results')
      toast.error('Failed to load quiz results')
    } finally {
      setLoading(false)
    }
  }

  const formatPercent = (value) => Number(value || 0).toFixed(1)

  const loadReview = async (attemptId) => {
    if (!attemptId || String(attemptId).startsWith('public-')) {
      toast.error('Question-wise review is not available for this result')
      return
    }

    setReviewLoading(true)
    try {
      const response = await api.get(`/quiz/result/${attemptId}/`)
      setReview(response.data)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load quiz review')
    } finally {
      setReviewLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="employee-root">
        <Styles />
        <Spin />
      </div>
    )
  }

  return (
    <div className="employee-root">
      <Styles />
      <PH title="Quiz Results" sub="Batch quiz results for your students" />

      {error && (
        <div className="employee-alert-warning" style={{ marginBottom: 20, padding: 12 }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: 8 }} />
          {error}
        </div>
      )}

      <div className="employee-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <SH title="Quiz Results" count={results.length} />
          <button className="employee-btn employee-btn-sm employee-btn-primary" onClick={loadResults}>
            <i className="fas fa-sync-alt" /> Refresh
          </button>
        </div>

        {results.length === 0 ? (
          <Empty msg="No quiz results available yet" icon="fa-chart-line" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Quiz Title</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Result</th>
                  <th>Submitted</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, idx) => {
                  const percentage = Number(result.percentage || 0)
                  const isPassed = result.is_passed
                  const canReview = !String(result.id || '').startsWith('public-')

                  return (
                    <tr key={result.id || idx}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{result.student_name || result.student?.first_name || '-'}</td>
                      <td>{result.student_id || result.student?.student_id || '-'}</td>
                      <td>{result.quiz_title || result.quiz?.title || '-'}</td>
                      <td>{result.score || 0}/{result.total_marks || result.total_questions || 0}</td>
                      <td><strong>{formatPercent(percentage)}%</strong></td>
                      <td><Badge text={isPassed ? 'Passed' : 'Failed'} variant={isPassed ? 'success' : 'danger'} /></td>
                      <td style={{ fontSize: 12 }}>{result.submitted_at ? new Date(result.submitted_at).toLocaleDateString('en-IN') : '-'}</td>
                      <td>
                        <button className="employee-btn employee-btn-sm employee-btn-primary" onClick={() => loadReview(result.id)} disabled={reviewLoading || !canReview}>
                          View
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

      {review && <EmployeeQuizReviewPanel review={review} onClose={() => setReview(null)} />}
    </div>
  )
}

function EmployeeQuizReviewPanel({ review, onClose }) {
  const questions = review.questions || []

  return (
    <div className="employee-card" style={{ marginTop: 20 }}>
      <div className="employee-card-header">
        <div>
          <h5>{review.student_name || 'Student'} - {review.quiz_title || 'Quiz Review'}</h5>
          <div style={{ color: T.slate, fontSize: 12, marginTop: 4 }}>
            {review.student_id || 'Student'} | Score {review.score || 0}/{review.total_marks || 0} | {Number(review.percentage || 0).toFixed(1)}%
          </div>
        </div>
        <button className="employee-btn employee-btn-sm employee-btn-ghost" onClick={onClose}>Close</button>
      </div>
      <div style={{ padding: 20, display: 'grid', gap: 14 }}>
        {questions.map((q, index) => (
          <div key={q.question_id || index} style={{ border: `1px solid ${q.is_correct ? 'rgba(76,175,129,.28)' : 'rgba(232,72,85,.28)'}`, borderRadius: 12, padding: 16, background: q.is_correct ? 'rgba(76,175,129,.06)' : 'rgba(232,72,85,.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
              <strong>Q{q.question_number || index + 1}. {q.question_text}</strong>
              <Badge text={q.is_correct ? 'Correct' : 'Wrong'} variant={q.is_correct ? 'success' : 'danger'} />
            </div>
            <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
              <div><strong>Student answer:</strong> {q.selected_answer} - {q.selected_option_text}</div>
              <div><strong>Correct answer:</strong> {q.correct_answer} - {q.correct_option_text}</div>
              <div><strong>Marks:</strong> {q.marks_obtained || 0}/{q.marks || 0}</div>
              {q.explanation && <div><strong>Explanation:</strong> {q.explanation}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
export function BranchAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewModal, setViewModal] = useState(null)

  useEffect(() => {
    api.get('/branch-announcements/')
      .then(r => setAnnouncements(r.data.results || r.data || []))
      .catch(() => toast.error('Failed to load branch announcements'))
      .finally(() => setLoading(false))
  }, [])

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

  return (
    <div className="employee-root">
      <Styles />
      <PH title="📍 Branch Announcements" sub="Announcements from your branch counselor" />

      {/* Stats */}
      <div className="employee-stat-grid" style={{ marginBottom: 24 }}>
        <div className="employee-stat-card">
          <div className="employee-stat-icon" style={{ background: 'rgba(46,196,182,.1)', color: '#2ec4b6' }}>
            <i className="fas fa-map-marker-alt" />
          </div>
          <div>
            <div className="employee-stat-value">{announcements.length}</div>
            <div className="employee-stat-label">Total</div>
          </div>
        </div>
        <div className="employee-stat-card">
          <div className="employee-stat-icon" style={{ background: 'rgba(232,72,85,.1)', color: '#e84855' }}>
            <i className="fas fa-exclamation-triangle" />
          </div>
          <div>
            <div className="employee-stat-value">{announcements.filter(a => a.announcement_type === 'important').length}</div>
            <div className="employee-stat-label">Important</div>
          </div>
        </div>
        <div className="employee-stat-card">
          <div className="employee-stat-icon" style={{ background: 'rgba(244,169,64,.1)', color: '#f4a940' }}>
            <i className="fas fa-calendar-week" />
          </div>
          <div>
            <div className="employee-stat-value">
              {announcements.filter(a => (Date.now() - new Date(a.created_at)) < 7 * 24 * 60 * 60 * 1000).length}
            </div>
            <div className="employee-stat-label">This Week</div>
          </div>
        </div>
      </div>

      <div className="employee-card">
        <SH title="📍 Branch Announcements" count={announcements.length} />
        {loading ? <Spin /> : announcements.length === 0 ? (
          <Empty msg="No branch announcements yet." icon="fa-map-marker-alt" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="employee-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>From</th>
                  <th style={{ width: 100 }}>Date</th>
                  <th style={{ width: 70 }}>View</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((ann, idx) => (
                  <tr key={ann.id}>
                    <td style={{ fontSize: 12, color: '#8099b3' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{ann.title}</div>
                      <div style={{ color: '#8099b3', fontSize: 11, marginTop: 3 }}>
                        {ann.message?.substring(0, 55)}{ann.message?.length > 55 ? '…' : ''}
                      </div>
                    </td>
                    <td><TypeBadge type={ann.announcement_type} /></td>
                    <td style={{ fontSize: 12, color: '#8099b3' }}>
                      <i className="fas fa-user-tie" style={{ marginRight: 5, color: '#f4a940' }} />
                      {ann.created_by_name || 'Counselor'}
                    </td>
                    <td style={{ fontSize: 12, color: '#8099b3' }}>
                      {new Date(ann.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td>
                      <button
                        className="employee-btn employee-btn-sm"
                        style={{ background: '#f0f3f7', color: '#1a2e4a', border: 'none' }}
                        onClick={() => setViewModal(ann)}
                      >
                        <i className="fas fa-eye" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
          onClick={e => e.target === e.currentTarget && setViewModal(null)}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560,
            margin: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid #e9ecef',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h5 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>📄 Announcement</h5>
              <button onClick={() => setViewModal(null)}
                style={{
                  background: '#f1f5f9', border: 'none', width: 32, height: 32,
                  borderRadius: 8, cursor: 'pointer', fontSize: 14
                }}>✕</button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <TypeBadge type={viewModal.announcement_type} />
              </div>
              <h4 style={{ margin: '0 0 10px', color: '#0f1b2d' }}>{viewModal.title}</h4>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: '#8099b3' }}>
                  <i className="fas fa-user-tie" style={{ marginRight: 5, color: '#f4a940' }} />
                  {viewModal.created_by_name || 'Counselor'}
                </span>
                <span style={{ fontSize: 12, color: '#8099b3' }}>
                  <i className="fas fa-calendar" style={{ marginRight: 5 }} />
                  {new Date(viewModal.created_at).toLocaleString('en-IN')}
                </span>
              </div>
              <div style={{
                background: '#f8fafc', borderRadius: 10, padding: '16px 18px',
                lineHeight: 1.75, fontSize: 14, color: '#1a2e4a', whiteSpace: 'pre-wrap'
              }}>
                {viewModal.message}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
