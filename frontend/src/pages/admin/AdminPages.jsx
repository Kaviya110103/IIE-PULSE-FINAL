import { useState, useEffect } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router-dom'  // ← ADD THIS
import { useAuth } from '../../context/AuthContext'  // ← ADD THIS


// ── Design tokens (matching student UI) ─────────────────────────────────────────────
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

// ── Global Styles (matching student UI) ─────────────────────────────────────────────
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

const viewPdf = async (endpoint, filters, filename = 'report.pdf') => {
  const params = new URLSearchParams()
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value) params.append(key, value)
  })
  const query = params.toString()
  const viewer = window.open('', '_blank')
  const res = await api.get(`${endpoint}${query ? `?${query}` : ''}`, { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  if (viewer) {
    viewer.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${filename}</title>
          <style>
            html, body { margin: 0; height: 100%; font-family: Arial, sans-serif; background: #111827; }
            .bar { height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; background: #0f172a; color: #fff; box-sizing: border-box; }
            .title { font-size: 14px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .download { color: #0f172a; background: #fff; border-radius: 8px; padding: 8px 12px; font-size: 12px; font-weight: 900; text-decoration: none; }
            iframe { width: 100%; height: calc(100% - 48px); border: 0; background: #fff; }
          </style>
        </head>
        <body>
          <div class="bar">
            <div class="title">${filename}</div>
            <a class="download" href="${url}" download="${filename}">Download PDF</a>
          </div>
          <iframe src="${url}"></iframe>
        </body>
      </html>
    `)
    viewer.document.close()
  } else {
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
}

export function AdminStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

      .admin-root {
        font-family: 'DM Sans', sans-serif;
        color: ${T.navy};
      }
      .admin-root h1, .admin-root h2, .admin-root h3, 
      .admin-root h4, .admin-root h5 {
        font-family: 'Playfair Display', serif;
      }

      .admin-card {
        background: #fff;
        border-radius: 16px;
        box-shadow: ${T.shadow};
        border: 1px solid ${T.border};
        overflow: hidden;
        margin-bottom: 24px;
        transition: box-shadow .25s, transform .25s;
      }
      .admin-card:hover {
        box-shadow: ${T.shadowMd};
      }

      .admin-card-header {
        padding: 16px 22px;
        border-bottom: 1px solid ${T.border};
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
      }
      .admin-card-header h5 {
        margin: 0;
        font-family: 'Playfair Display';
        font-size: 17px;
        font-weight: 600;
      }

      .admin-page-header {
        margin-bottom: 24px;
        padding-bottom: 18px;
        border-bottom: 2px solid ${T.border};
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
      }
      .admin-page-header h3 {
        margin: 0 0 4px;
        font-size: 24px;
        background: linear-gradient(135deg, ${T.navy}, ${T.navyLight});
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .admin-page-header p {
        margin: 0;
        color: ${T.slate};
        font-size: 13.5px;
      }

      .admin-table {
        width: 100%;
        border-collapse: collapse;
      }
      .admin-table th {
        background: linear-gradient(135deg, ${T.navy}, ${T.navyMid});
        color: white;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: .7px;
        text-transform: uppercase;
        padding: 13px 14px;
        text-align: left;
        white-space: nowrap;
      }
      .admin-table td {
        padding: 12px 14px;
        border-bottom: 1px solid ${T.border};
        font-size: 13.5px;
        color: ${T.navy};
      }
      .admin-table tr:last-child td {
        border-bottom: none;
      }
      .admin-table tr:hover td {
        background: rgba(244,169,64,.04);
      }

      .admin-btn {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 9px 18px;
        border-radius: 10px;
        border: none;
        font-family: 'DM Sans';
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: all .18s;
        white-space: nowrap;
        text-decoration: none;
      }
      .admin-btn-primary {
        background: ${T.amber};
        color: ${T.navy};
      }
      .admin-btn-primary:hover {
        background: ${T.amberLight};
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(244,169,64,.35);
      }
      .admin-btn-ghost {
        background: transparent;
        color: ${T.slate};
        border: 1.5px solid ${T.border};
      }
      .admin-btn-ghost:hover {
        background: ${T.white};
        color: ${T.navy};
        border-color: ${T.slateLight};
      }
      .admin-btn-danger {
        background: ${T.rose};
        color: white;
      }
      .admin-btn-success {
        background: ${T.sage};
        color: white;
      }
      .admin-btn-sm {
        padding: 5px 12px;
        font-size: 12px;
        border-radius: 8px;
      }

      .admin-input {
        padding: 9px 13px;
        border: 1.5px solid ${T.border};
        border-radius: 10px;
        font-family: 'DM Sans';
        font-size: 13px;
        outline: none;
        background: ${T.white};
        width: 100%;
        box-sizing: border-box;
        color: ${T.navy};
      }
      .admin-input:focus {
        border-color: ${T.amber};
        box-shadow: 0 0 0 3px rgba(244,169,64,.15);
      }
      .admin-select {
        padding: 9px 13px;
        border: 1.5px solid ${T.border};
        border-radius: 10px;
        font-family: 'DM Sans';
        font-size: 13px;
        outline: none;
        background: ${T.white};
        width: 100%;
        box-sizing: border-box;
        color: ${T.navy};
      }

      .admin-stat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 28px;
      }
      .admin-stat-card {
        background: #fff;
        border-radius: 20px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        border: 1px solid ${T.border};
        box-shadow: ${T.shadow};
        transition: transform .2s;
      }
      .admin-stat-card:hover {
        transform: translateY(-2px);
      }
      .admin-stat-icon {
        width: 56px;
        height: 56px;
        border-radius: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      }
      .admin-stat-value {
        font-size: 28px;
        font-weight: 700;
        color: ${T.navy};
        line-height: 1.2;
      }
      .admin-stat-label {
        font-size: 13px;
        color: ${T.slate};
        font-weight: 500;
      }

      .admin-badge {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 11.5px;
        font-weight: 600;
        white-space: nowrap;
      }

      .admin-empty {
        padding: 60px;
        text-align: center;
        color: ${T.slate};
      }
      .admin-empty-icon {
        font-size: 48px;
        opacity: 0.2;
        margin-bottom: 16px;
      }

      .admin-tab {
        padding: 9px 20px;
        border: none;
        background: transparent;
        font-family: 'DM Sans', sans-serif;
        font-size: 13px;
        font-weight: 500;
        color: ${T.slate};
        cursor: pointer;
        border-bottom: 2.5px solid transparent;
        transition: all .18s;
      }
      .admin-tab.active {
        color: ${T.amber};
        border-bottom-color: ${T.amber};
        font-weight: 600;
      }
      .admin-tab:hover:not(.active) {
        color: ${T.navy};
        background: rgba(244,169,64,.06);
      }

      .admin-person-cell {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .admin-avatar {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
        color: white;
        flex-shrink: 0;
      }

      .admin-spin {
        width: 40px;
        height: 40px;
        border: 3px solid ${T.border};
        border-top-color: ${T.amber};
        border-radius: 50%;
        animation: adminSpin 1s linear infinite;
        margin: 40px auto;
      }

      @keyframes adminSpin {
        to { transform: rotate(360deg); }
      }

      .admin-fade {
        animation: adminFadeUp .35s ease both;
      }

      @keyframes adminFadeUp {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .admin-crumb {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 20px;
        font-size: 13px;
      }
      .admin-crumb-btn {
        background: none;
        border: none;
        color: ${T.amber};
        cursor: pointer;
        font-weight: 600;
        font-family: 'DM Sans';
        font-size: 13px;
        padding: 0;
      }
      .admin-crumb-sep {
        color: ${T.slateLight};
      }

      .admin-row-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      @media (max-width: 640px) {
        .admin-row-grid-2 {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  )
}

// ── Shared Components ──────────────────────────────────────────────────────
export function AdminSpin() {
  return (
    <div style={{ padding: 56, textAlign: 'center' }}>
      <div className="admin-spin" />
    </div>
  )
}

export function AdminEmpty({ msg = 'No data found.', icon = 'fa-inbox' }) {
  return (
    <div className="admin-empty">
      <div className="admin-empty-icon"><i className={`fas ${icon}`} /></div>
      <p style={{ margin: 0, fontFamily: "'Playfair Display'", fontSize: 16 }}>{msg}</p>
    </div>
  )
}

export function AdminBadge({ text, variant = 'default' }) {
  const variants = {
    success: { bg: '#e8f8f0', color: '#1a6b3e' },
    danger: { bg: '#fdeaec', color: '#9b1c27' },
    warning: { bg: '#fef5e4', color: '#8a5a00' },
    info: { bg: '#e4f2fd', color: '#1260a0' },
    teal: { bg: '#e0f7f5', color: '#1a7a72' },
    pending: { bg: '#fff3cd', color: '#664d03' },
    default: { bg: '#f0f3f7', color: T.slate },
  }
  const s = variants[variant] || variants.default
  return <span className="admin-badge" style={{ background: s.bg, color: s.color }}>{text}</span>
}

export function AdminPageHeader({ title, sub, btn }) {
  return (
    <div className="admin-page-header">
      <div><h3>{title}</h3>{sub && <p>{sub}</p>}</div>
      {btn}
    </div>
  )
}

export function AdminSectionHeader({ title, count, actions }) {
  return (
    <div className="admin-card-header">
      <h5>{title}{count != null && <span style={{ color: T.slate, fontWeight: 400, fontSize: 14, marginLeft: 8 }}>({count})</span>}</h5>
      {actions}
    </div>
  )
}

const avatarGradients = [
  'linear-gradient(135deg,#f4a940,#e8843a)',
  'linear-gradient(135deg,#2ec4b6,#1a9e93)',
  'linear-gradient(135deg,#e84855,#c62d39)',
  'linear-gradient(135deg,#4caf81,#2d8a5e)',
  'linear-gradient(135deg,#667eea,#764ba2)',
]

function AdminAvatar({ name = '', size = 36 }) {
  const grad = avatarGradients[(name?.charCodeAt(0) || 0) % avatarGradients.length]
  return (
    <div className="admin-avatar" style={{ width: size, height: size, background: grad }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

function ReasonModal({ reason, name, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,45,.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="admin-card" style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ background: `linear-gradient(135deg, ${T.navy}, ${T.navyLight})`, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px 16px 0 0' }}>
          <h6 style={{ margin: 0, color: 'white', fontFamily: "'Playfair Display'", fontSize: 16 }}>Leave Reason — {name}</h6>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', width: 28, height: 28, borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
        <div style={{ padding: '20px 22px' }}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: T.navy }}>{reason}</p>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
const toDateInputValue = (date) => {
  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10)
}

const formatMonitoringTime = (value, fallback = '-') => (
  value ? new Date(value).toLocaleString('en-IN') : fallback
)

function MonitoringFilters({ type, filters, setFilters, options, onApply, onClear }) {
  const applyPreset = (preset) => {
    const today = new Date()
    let from = new Date(today)
    let to = new Date(today)

    if (preset === 'yesterday') {
      from.setDate(today.getDate() - 1)
      to.setDate(today.getDate() - 1)
    } else if (preset === 'week') {
      const day = today.getDay() || 7
      from.setDate(today.getDate() - day + 1)
    } else if (preset === 'month') {
      from = new Date(today.getFullYear(), today.getMonth(), 1)
    }

    const next = { ...filters, date_from: toDateInputValue(from), date_to: toDateInputValue(to) }
    setFilters(next)
    onApply(next)
  }

  return (
    <div className="admin-card" style={{ marginBottom: 20 }}>
      <AdminSectionHeader title="Filters" />
      <div style={{ padding: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>From Date</label>
            <input className="admin-input" type="date" value={filters.date_from} onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>To Date</label>
            <input className="admin-input" type="date" value={filters.date_to} onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Branch</label>
            <select className="admin-select" value={filters.branch} onChange={e => setFilters(p => ({ ...p, branch: e.target.value }))}>
              <option value="">All branches</option>
              {(options.branches || []).map(branch => <option key={branch} value={branch}>{branch}</option>)}
            </select>
          </div>
          {type === 'employee' ? (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Role</label>
              <select className="admin-select" value={filters.designation} onChange={e => setFilters(p => ({ ...p, designation: e.target.value }))}>
                <option value="">All roles</option>
                {(options.designations || []).map(role => <option key={role} value={role}>{role}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Staff / Mentor</label>
              <select className="admin-select" value={filters.staff} onChange={e => setFilters(p => ({ ...p, staff: e.target.value }))}>
                <option value="">All staff</option>
                {(options.staff || []).map(staff => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>Search</label>
            <input
              className="admin-input"
              value={filters.search}
              onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
              placeholder={type === 'employee' ? 'Name, email, staff ID' : 'Name, email, student ID'}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 14 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="admin-btn admin-btn-ghost admin-btn-sm" type="button" onClick={() => applyPreset('today')}>Today</button>
            <button className="admin-btn admin-btn-ghost admin-btn-sm" type="button" onClick={() => applyPreset('yesterday')}>Yesterday</button>
            <button className="admin-btn admin-btn-ghost admin-btn-sm" type="button" onClick={() => applyPreset('week')}>This Week</button>
            <button className="admin-btn admin-btn-ghost admin-btn-sm" type="button" onClick={() => applyPreset('month')}>This Month</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="admin-btn admin-btn-ghost" type="button" onClick={onClear}><i className="fas fa-times" /> Clear Filter</button>
            <button className="admin-btn admin-btn-primary" type="button" onClick={() => onApply(filters)}><i className="fas fa-filter" /> Apply Filter</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function UserMonitoringPage({ type }) {
  const isEmployee = type === 'employee'
  const endpoint = isEmployee ? '/admin/monitoring/employees/' : '/admin/monitoring/students/'
  const initialBranch = new URLSearchParams(window.location.search).get('branch') || ''
  const [records, setRecords] = useState([])
  const [filterOptions, setFilterOptions] = useState({})
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    branch: initialBranch,
    designation: '',
    staff: '',
    search: '',
  })

  const load = async (nextFilters = filters) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      const query = params.toString()
      const res = await api.get(`${endpoint}${query ? `?${query}` : ''}`)
      setRecords(res.data.results || [])
      setFilterOptions(res.data.filters || {})
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load monitoring records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [endpoint])

  const clearFilters = () => {
    const empty = { date_from: '', date_to: '', branch: '', designation: '', staff: '', search: '' }
    setFilters(empty)
    load(empty)
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadPdf(
        `${endpoint}report/`,
        filters,
        isEmployee ? 'employee_monitoring_report.pdf' : 'student_monitoring_report.pdf'
      )
      toast.success('PDF downloaded')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to download PDF')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="admin-root">
      <AdminStyles />
      <AdminPageHeader
        title={isEmployee ? 'Employee Monitoring' : 'Student Monitoring'}
        sub={isEmployee ? 'Login, logout, and last-seen activity for employees and counselors' : 'Login, logout, and last-seen activity for students'}
        btn={<button className="admin-btn admin-btn-primary" type="button" onClick={handleDownload} disabled={downloading}><i className="fas fa-file-pdf" /> {downloading ? 'Downloading...' : 'Download PDF'}</button>}
      />
      <MonitoringFilters type={type} filters={filters} setFilters={setFilters} options={filterOptions} onApply={load} onClear={clearFilters} />
      <div className="admin-card">
        <AdminSectionHeader title={isEmployee ? 'Employee Login Records' : 'Student Login Records'} count={records.length} />
        {loading ? <AdminSpin /> : records.length === 0 ? (
          <AdminEmpty msg="No monitoring records found" icon="fa-user-clock" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  {isEmployee ? <th>Role</th> : <th>Branch</th>}
                  {isEmployee ? <th>Branch</th> : <th>Staff Name</th>}
                  <th>Login Time</th>
                  <th>Logout Time</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {records.map(record => (
                  <tr key={record.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{record.name || '-'}</div>
                      <div style={{ fontSize: 11, color: T.slate }}>{record.email || record.student_id || record.staff_id || ''}</div>
                    </td>
                    {isEmployee ? (
                      <>
                        <td>{record.designation || '-'}</td>
                        <td>{record.branch || '-'}</td>
                      </>
                    ) : (
                      <>
                        <td>{record.branch || '-'}</td>
                        <td>{record.staff_name || '-'}</td>
                      </>
                    )}
                    <td>{formatMonitoringTime(record.login_time)}</td>
                    <td>{record.logout_time ? formatMonitoringTime(record.logout_time) : 'Still active'}</td>
                    <td>{formatMonitoringTime(record.last_seen)}</td>
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

export function AdminEmployeeMonitoring() { return <UserMonitoringPage type="employee" /> }
export function AdminStudentMonitoring() { return <UserMonitoringPage type="student" /> }

export function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()  // ← ADD THIS

  useEffect(() => {
    api.get('/dashboard/admin/').then(r => setStats(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="admin-root"><AdminStyles /><AdminSpin /></div>

  return <ModernAdminDashboard stats={stats} navigate={navigate} />

  const statCards = [
    { label: 'Active Students', value: stats?.student_count ?? 0, icon: 'fa-user-graduate', color: T.amber, bgColor: 'rgba(244,169,64,0.1)', to: '/admin/students' },
    { label: 'Employees', value: stats?.employee_count ?? 0, icon: 'fa-users-gear', color: T.teal, bgColor: 'rgba(46,196,182,0.1)', to: '/admin/employees' },
    { label: 'Courses', value: stats?.course_count ?? 0, icon: 'fa-book-open', color: T.sage, bgColor: 'rgba(76,175,129,0.1)', to: '/admin/courses' },
    { label: 'Batches', value: stats?.batch_count ?? 0, icon: 'fa-layer-group', color: T.navy, bgColor: 'rgba(15,27,45,0.1)', to: '/admin/batches' },
    { label: 'Completed', value: stats?.completed_count ?? 0, icon: 'fa-graduation-cap', color: T.rose, bgColor: 'rgba(232,72,85,0.1)', to: '/admin/completed' },
    { label: 'Counselors', value: stats?.counselor_count ?? 0, icon: 'fa-user-tie', color: T.amber, bgColor: 'rgba(244,169,64,0.1)', to: '/admin/employees?designation=counselor' },
    { label: 'Fee Management', value: 'View', icon: 'fa-rupee-sign', color: T.sage, bgColor: 'rgba(76,175,129,0.1)', to: '/admin/fees' },]
  const branchStudentCounts = stats?.student_branch_counts || []
  const batchBranchCounts = stats?.batch_branch_counts || []
  const maxBranchCount = Math.max(...branchStudentCounts.map(item => item.count || 0), 1)

  return (
    <div className="admin-root admin-fade">
      <AdminStyles />
      <AdminPageHeader
        title="Administrator Portal"
        sub="Indra Institute of Education — Management Dashboard"
      />
      <div className="admin-stat-grid">
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className="admin-stat-card"
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
            <div className="admin-stat-icon" style={{ background: stat.bgColor, color: stat.color }}>
              <i className={`fas ${stat.icon}`} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="admin-stat-value">{stat.value}</div>
              <div className="admin-stat-label">{stat.label}</div>
            </div>
            <i className="fas fa-arrow-right" style={{ color: stat.color, opacity: 0.4, fontSize: 12 }} />
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 26,
          background: 'linear-gradient(135deg, #0f1b2d, #1a2e4a)',
          borderRadius: 18,
          padding: 22,
          boxShadow: '0 12px 34px rgba(15,27,45,.16)',
          border: '1px solid rgba(255,255,255,.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
              <div style={{ width: 42, height: 42, borderRadius: 14, background: 'rgba(244,169,64,.16)', color: T.amber, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-location-dot" />
              </div>
              <div>
                <h5 style={{ margin: 0, color: '#fff', fontFamily: "'Playfair Display'", fontSize: 20 }}>Active Students by Branch</h5>
                <p style={{ margin: '3px 0 0', color: 'rgba(248,250,252,.68)', fontSize: 13 }}>Total active students and branch-wise live count</p>
              </div>
            </div>
          </div>
          <div style={{ minWidth: 132, borderRadius: 14, background: 'rgba(255,255,255,.08)', padding: '10px 14px', textAlign: 'right' }}>
            <div style={{ color: '#fff', fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{stats?.student_count ?? 0}</div>
            <div style={{ color: 'rgba(248,250,252,.68)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>Total Active</div>
          </div>
        </div>

        {branchStudentCounts.length ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
            {branchStudentCounts.map((item, index) => {
              const count = item.count || 0
              const percent = Math.max(7, Math.round((count / maxBranchCount) * 100))
              return (
                <div key={`${item.branch}-${index}`} style={{ borderRadius: 14, background: 'rgba(255,255,255,.07)', padding: 14, border: '1px solid rgba(255,255,255,.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                    <div style={{ color: '#fff', fontSize: 14, fontWeight: 800, textTransform: 'capitalize' }}>{item.branch || 'Unassigned'}</div>
                    <div style={{ color: T.amberLight, fontSize: 20, fontWeight: 900 }}>{count}</div>
                  </div>
                  <div style={{ height: 7, borderRadius: 999, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
                    <div style={{ width: `${percent}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${T.amber}, ${T.teal})` }} />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ color: 'rgba(248,250,252,.72)', fontSize: 13, fontWeight: 700, padding: '10px 0' }}>
            No active students found by branch.
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// LEAVE TABLE (Reusable component)
// ══════════════════════════════════════════════════════════════════════════════
const fmtDateTime = (value) => value ? new Date(value).toLocaleString('en-IN') : '-'
const fmtDateOnly = (value) => value ? new Date(value).toLocaleDateString('en-IN') : '-'

function TinyMetric({ label, value, icon = 'fa-chart-simple', color = T.teal }) {
  return (
    <div className="admin-card" style={{ padding: 14, minHeight: 96 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ color: '#0f172a', fontSize: 24, fontWeight: 900, lineHeight: 1 }}>{value ?? 0}</div>
          <div style={{ color: T.slate, fontSize: 11, fontWeight: 800, marginTop: 6 }}>{label}</div>
        </div>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}22`, color, display: 'grid', placeItems: 'center' }}>
          <i className={`fas ${icon}`} />
        </div>
      </div>
    </div>
  )
}

function TrackBar({ label, value, color = T.teal, labelColor = '#334155', trackColor = '#e2e8f0' }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11, fontWeight: 800, color: labelColor, marginBottom: 5 }}>
        <span>{label}</span><span>{pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: trackColor, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: color }} />
      </div>
    </div>
  )
}

function TrackingList({ title, items = [], render }) {
  return (
    <div className="admin-card" style={{ padding: 18 }}>
      <AdminSectionHeader title={title} count={items.length} />
      <div style={{ maxHeight: 290, overflow: 'auto' }}>
        {items.length ? items.map((item, idx) => (
          <div key={idx} style={{ padding: '11px 0', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#334155' }}>{render(item)}</div>
        )) : <AdminEmpty msg={`No ${title.toLowerCase()} found`} />}
      </div>
    </div>
  )
}

function NewTrackingBadge({ text = 'New' }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 8px',
      borderRadius: 999,
      background: '#dcfce7',
      color: '#15803d',
      border: '1px solid #bbf7d0',
      fontSize: 10,
      fontWeight: 900,
      textTransform: 'uppercase',
      letterSpacing: 0,
      whiteSpace: 'nowrap',
    }}>
      <i className="fas fa-star" /> {text}
    </span>
  )
}

function TrackingMiniStat({ label, value, icon, color = '#2563eb' }) {
  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: '11px 12px',
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      minHeight: 62,
    }}>
      <div>
        <div style={{ fontSize: 21, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{value ?? 0}</div>
        <div style={{ marginTop: 5, fontSize: 11, fontWeight: 800, color: T.slate }}>{label}</div>
      </div>
      <div style={{ width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', background: `${color}18`, color }}>
        <i className={`fas ${icon}`} />
      </div>
    </div>
  )
}

function TrackingDonut({ value, color = '#2563eb', size = 92, label }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  const inner = Math.max(46, size - 28)
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
      <div style={{ width: size, height: size, borderRadius: '50%', background: `conic-gradient(${color} ${pct * 3.6}deg, #e2e8f0 0deg)`, display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
        <div style={{ width: inner, height: inner, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', color, fontSize: Math.max(15, size / 4.3), fontWeight: 900 }}>
          {pct}%
        </div>
      </div>
      {label && <div style={{ color: T.slate, fontSize: 11, fontWeight: 900, textAlign: 'center' }}>{label}</div>}
    </div>
  )
}

function PerformanceMetricRow({ label, count, value, icon, color, action }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 13, background: '#f8fafc', padding: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', background: `${color}18`, color, flex: '0 0 auto' }}>
          <i className={`fas ${icon}`} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
            <div style={{ color: '#0f172a', fontSize: 13, fontWeight: 900 }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ color, fontSize: 18, fontWeight: 900 }}>{count ?? 0}</div>
              {action}
            </div>
          </div>
          <TrackBar label={`${label} graph`} value={pct} color={color} />
        </div>
      </div>
    </div>
  )
}

export function AdminEmployeeTracking() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [reportDownloading, setReportDownloading] = useState(false)

  const load = (params = '') => {
    setLoading(true)
    api.get(`/admin/employee-tracking/${params}`).then(r => setData(r.data)).catch(err => {
      toast.error(err.response?.data?.error || 'Failed to load employee tracking')
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load(window.location.search || '') }, [])

  if (loading) return <div className="admin-root"><AdminStyles /><AdminSpin /></div>
  if (!data) return <div className="admin-root"><AdminStyles /><AdminEmpty msg="No tracking data found" /></div>

  const displayBranch = (branch) => ({
    '100ft': '100ft',
    hopes: 'Hopes',
    kuniyamuthur: 'Kuniyamuthur',
    kunniyamuthur: 'Kuniyamuthur',
  }[branch] || branch || 'Unassigned')

  const Crumb = () => (
    <div className="admin-crumb">
      <button className="admin-crumb-btn" onClick={() => load()}><i className="fas fa-sitemap" style={{ marginRight: 5 }} />Branches</button>
      {data.branch && <><span className="admin-crumb-sep">/</span><button className="admin-crumb-btn" onClick={() => load(`?branch=${encodeURIComponent(data.branch)}`)}>{displayBranch(data.branch)}</button></>}
      {data.view_mode === 'staff_detail' && <><span className="admin-crumb-sep">/</span><span style={{ fontWeight: 800 }}>{data.staff?.staff?.first_name} {data.staff?.staff?.last_name || ''}</span></>}
    </div>
  )

  if (data.view_mode === 'branches') {
    return (
      <div className="admin-root admin-fade">
        <AdminStyles />
        <AdminPageHeader title="Employee Tracking" sub="Branch-wise staff activity, student handling, content, attendance, login, and session progress" />
        <div className="admin-stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <TinyMetric label="Branches" value={data.totals?.branches} icon="fa-building" color="#2563eb" />
          <TinyMetric label="Staff" value={data.totals?.staff} icon="fa-user-tie" color="#059669" />
          <TinyMetric label="Students" value={data.totals?.students} icon="fa-user-graduate" color="#ca8a04" />
          <TinyMetric label="Batches" value={data.totals?.batches} icon="fa-layer-group" color="#7c3aed" />
        </div>
        <div className="admin-row-grid-2">
          {(data.branch_cards || []).map((branch, index) => {
            const color = ['#2563eb', '#059669', '#ca8a04'][index % 3]
            return (
              <div key={branch.branch} className="admin-card" onClick={() => load(`?branch=${encodeURIComponent(branch.branch)}`)} style={{ padding: 18, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}22`, color, display: 'grid', placeItems: 'center', marginBottom: 10 }}><i className="fas fa-building" /></div>
                    <h4 style={{ margin: 0, textTransform: 'capitalize', fontFamily: "'Playfair Display'" }}>{displayBranch(branch.branch)}</h4>
                    <div style={{ color: T.slate, fontSize: 12, marginTop: 5 }}>{branch.staff_count} staff | {branch.student_count} students | {branch.batch_count} batches</div>
                  </div>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: `conic-gradient(${color} ${(branch.activity_score || 0) * 3.6}deg, #e2e8f0 0deg)`, display: 'grid', placeItems: 'center' }}>
                    <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', color, fontWeight: 900 }}>{branch.activity_score || 0}%</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16 }}>
                  <AdminBadge text={`${branch.attendance_marked_count} attendance`} variant="info" />
                  <AdminBadge text={`${branch.sessions_completed} sessions`} variant="teal" />
                  <AdminBadge text={`${branch.materials_count} materials`} variant="success" />
                  <AdminBadge text={`${branch.quizzes_count} quizzes`} variant="warning" />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (data.view_mode === 'branch_staff') {
    return (
      <div className="admin-root admin-fade">
        <AdminStyles />
        <Crumb />
        <AdminPageHeader title={`${displayBranch(data.branch)} Employee Tracking`} sub="Select a staff member to see detailed work activity" />
        <div className="admin-stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <TinyMetric label="Staff" value={data.totals?.staff} icon="fa-user-tie" color="#2563eb" />
          <TinyMetric label="Handled Students" value={data.totals?.students} icon="fa-user-graduate" color="#059669" />
          <TinyMetric label="Batches" value={data.totals?.batches} icon="fa-layer-group" color="#ca8a04" />
          <TinyMetric label="Completed Students" value={data.totals?.completed_students} icon="fa-user-check" color="#7c3aed" />
        </div>
        <div className="admin-row-grid-2">
          {(data.staff || []).map(item => (
            <div key={item.staff.id} className="admin-card" onClick={() => load(`?branch=${encodeURIComponent(data.branch)}&staff_id=${item.staff.id}`)} style={{ padding: 18, cursor: 'pointer' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <AdminAvatar name={item.staff.first_name} size={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900 }}>{item.staff.first_name} {item.staff.last_name || ''}</div>
                  <div style={{ color: T.slate, fontSize: 12 }}>{item.staff.designation || 'Staff'} | Last login: {fmtDateTime(item.last_login)}</div>
                </div>
                <div style={{ textAlign: 'right', color: '#0f172a', fontWeight: 900 }}>{item.activity_score}%</div>
              </div>
              <div style={{ marginTop: 15 }}>
                <TrackBar label={item.tracking_type === 'counselor' ? 'Counsellor activity' : 'Session completion'} value={item.tracking_type === 'counselor' ? item.activity_score : item.session_completion_percentage} color="#059669" />
                <TrackBar label="Activity score" value={item.activity_score} color="#2563eb" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 10 }}>
                <AdminBadge text={`${item.student_count} students`} />
                <AdminBadge text={`${item.batch_count} batches`} variant="info" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const staff = data.staff || {}
  const staffInfo = staff.staff || {}
  const staffName = `${staffInfo.first_name || ''} ${staffInfo.last_name || ''}`.trim() || 'Staff'
  const isCounselorTracking = staff.tracking_type === 'counselor' || String(staffInfo.designation || '').toLowerCase() === 'counselor'
  const reportFilename = `staff_activity_${staffName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
  const handleDownloadStaffReport = async () => {
    setReportDownloading(true)
    try {
      await viewPdf(
        '/admin/employee-tracking/report/',
        { staff_id: staffInfo.id },
        reportFilename
      )
      toast.success('Staff activity report opened')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to open report')
    } finally {
      setReportDownloading(false)
    }
  }

  return (
    <div className="admin-root admin-fade">
      <AdminStyles />
      <Crumb />
      <div style={{
        position: 'relative',
        borderRadius: 20,
        padding: 20,
        marginBottom: 18,
        background: 'linear-gradient(135deg, #0f172a 0%, #164e63 58%, #f59e0b 160%)',
        color: '#fff',
        boxShadow: '0 18px 42px rgba(15,23,42,.18)',
      }}>
        <button
          type="button"
          onClick={handleDownloadStaffReport}
          disabled={reportDownloading}
          style={{ position: 'absolute', top: 16, right: 16, border: '1px solid rgba(255,255,255,.28)', background: 'rgba(255,255,255,.14)', color: '#fff', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 900, cursor: reportDownloading ? 'not-allowed' : 'pointer', backdropFilter: 'blur(8px)', opacity: reportDownloading ? .72 : 1 }}
        >
          <i className="fas fa-file-pdf" style={{ marginRight: 7 }} /> {reportDownloading ? 'Opening...' : 'View Report'}
        </button>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(300px, .75fr)', gap: 18, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', minWidth: 0 }}>
            <AdminAvatar name={staffInfo.first_name || 'Staff'} size={64} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.1 }}>{staffInfo.first_name || ''} {staffInfo.last_name || ''}</div>
              <div style={{ marginTop: 6, color: 'rgba(255,255,255,.76)', fontSize: 13, fontWeight: 800 }}>{staffInfo.designation || 'Staff'} | {displayBranch(staffInfo.branch)} | Last login {fmtDateTime(staff.last_login)}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <span style={{ border: '1px solid rgba(255,255,255,.18)', background: 'rgba(255,255,255,.1)', borderRadius: 999, padding: '6px 10px', fontSize: 11, fontWeight: 900 }}>{staff.student_count || 0} students handled</span>
                <span style={{ border: '1px solid rgba(255,255,255,.18)', background: 'rgba(255,255,255,.1)', borderRadius: 999, padding: '6px 10px', fontSize: 11, fontWeight: 900 }}>{isCounselorTracking ? `${staff.assigned_students_count || 0} assigned` : `${staff.batch_count || 0} batches`}</span>
                <span style={{ border: '1px solid rgba(255,255,255,.18)', background: 'rgba(255,255,255,.1)', borderRadius: 999, padding: '6px 10px', fontSize: 11, fontWeight: 900 }}>{staff.new_students_count || 0} new students</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 15, alignItems: 'center' }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: `conic-gradient(#f59e0b ${(data.charts?.login_usage || 0) * 3.6}deg, rgba(255,255,255,.16) 0deg)`, display: 'grid', placeItems: 'center' }}>
              <div style={{ width: 66, height: 66, borderRadius: '50%', background: 'rgba(15,23,42,.9)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 18, fontWeight: 900 }}>{data.charts?.login_usage || 0}%</div>
            </div>
            <div>
              <TrackBar label={`Login usage (${data.charts?.login_usage || 0}%)`} value={data.charts?.login_usage} color="#f59e0b" labelColor="rgba(255,255,255,.86)" trackColor="rgba(255,255,255,.16)" />
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ padding: 20 }}>
        <AdminSectionHeader title="Performance Graph" />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 210px', gap: 18, alignItems: 'center' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {isCounselorTracking ? (
              <>
                <PerformanceMetricRow label="Students Added" count={staff.month_students_added || 0} value={data.charts?.students_added} icon="fa-user-plus" color="#0891b2" />
                <PerformanceMetricRow label="Batches Added" count={staff.month_batches_added || 0} value={data.charts?.batches_added} icon="fa-layer-group" color="#7c3aed" />
                <PerformanceMetricRow label="Students Assigned" count={staff.month_students_assigned || 0} value={data.charts?.students_assigned} icon="fa-user-check" color="#059669" />
                <PerformanceMetricRow label="Fee Managed" count={staff.month_fee_managed || 0} value={data.charts?.fee_management} icon="fa-rupee-sign" color="#dc2626" />
              </>
            ) : (
              <>
                <PerformanceMetricRow label="Materials Upload" count={staff.materials_uploaded} value={data.charts?.material_upload} icon="fa-cloud-arrow-up" color="#0891b2" />
                <PerformanceMetricRow label="Quiz Upload" count={staff.quizzes_created} value={data.charts?.quiz_upload} icon="fa-circle-question" color="#7c3aed" />
                <PerformanceMetricRow label="Batch Completion" count={`${staff.completed_batch_count || 0}/${staff.batch_count || 0} batches`} value={data.charts?.batch_completion} icon="fa-layer-group" color="#059669" />
              </>
            )}
            <PerformanceMetricRow
              label="Login Usage"
              count={`${staff.login_usage_count ?? 0}/${staff.login_usage_target || 7} logins`}
              value={data.charts?.login_usage}
              icon="fa-right-to-bracket"
              color="#ca8a04"
              action={(
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(true)}
                  style={{ border: '1px solid #fed7aa', background: '#fff7ed', color: '#9a3412', borderRadius: 8, padding: '5px 8px', fontSize: 10, fontWeight: 900, cursor: 'pointer' }}
                >
                  View Login
                </button>
              )}
            />
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 18, minHeight: 250, display: 'grid', placeItems: 'center', background: 'linear-gradient(180deg,#fff,#f8fafc)' }}>
            <TrackingDonut value={data.charts?.activity_score} color="#0f766e" size={142} label="Overall Performance" />
          </div>
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 18, padding: 18 }}>
        <AdminSectionHeader title={isCounselorTracking ? "Counsellor Branch Operations" : "Batch-wise Session and Student Attendance Progress"} count={isCounselorTracking ? (data.highlights?.last_month_students_count || data.last_month_added_students?.length || 0) : (data.batch_details || []).length} />
        {isCounselorTracking ? (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
              <TrackingMiniStat label="Last Month Added Students" value={data.highlights?.last_month_students_count || data.last_month_added_students?.length || 0} icon="fa-user-plus" color="#0891b2" />
              <TrackingMiniStat label="Assigned Students" value={staff.month_students_assigned || 0} icon="fa-user-check" color="#059669" />
              <TrackingMiniStat label="Fee Managed" value={staff.month_fee_managed || 0} icon="fa-rupee-sign" color="#dc2626" />
              <TrackingMiniStat label="Login History" value={(data.login_records || []).length} icon="fa-right-to-bracket" color="#ca8a04" />
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
              <div style={{ padding: '13px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: T.ink }}>Last Month Added Students</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.slate }}>Students created under this branch</div>
                </div>
                <AdminBadge text={`${data.highlights?.last_month_students_count || data.last_month_added_students?.length || 0} students`} variant="info" />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead><tr><th>Student</th><th>Batch</th><th>Assigned Staff</th><th>Created</th></tr></thead>
                  <tbody>
                    {(data.last_month_added_students || []).map(student => (
                      <tr key={student.id}>
                        <td>
                          <strong>{student.name || '-'}</strong>
                          <div style={{ color: T.slate, fontSize: 11 }}>{student.student_id || '-'} | {student.mobile_no || '-'}</div>
                        </td>
                        <td>{student.batch || '-'}</td>
                        <td>{student.assigned_staff || '-'}</td>
                        <td>{fmtDateOnly(student.created_at)}</td>
                      </tr>
                    ))}
                    {(data.last_month_added_students || []).length === 0 && <tr><td colSpan="4"><AdminEmpty msg="No students added in the last month" icon="fa-user-plus" /></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
              <div style={{ padding: '13px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: T.ink }}>Login History</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: T.slate }}>Recent counsellor login activity</div>
                </div>
                <AdminBadge text={`${(data.login_records || []).length} records`} variant="warning" />
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead><tr><th>Login</th><th>Logout</th><th>Last Seen</th></tr></thead>
                  <tbody>
                    {(data.login_records || []).map((item, idx) => (
                      <tr key={idx}>
                        <td>{fmtDateTime(item.login_time)}</td>
                        <td>{item.logout_time ? fmtDateTime(item.logout_time) : 'Still active'}</td>
                        <td>{fmtDateTime(item.last_seen)}</td>
                      </tr>
                    ))}
                    {(data.login_records || []).length === 0 && <tr><td colSpan="3"><AdminEmpty msg="No login history found" icon="fa-right-to-bracket" /></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {(data.batch_details || []).map(batch => (
            <div key={batch.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: batch.is_new ? '#f0fdf4' : '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, color: '#0f172a' }}>{batch.batch_number}</h4>
                    {batch.is_new && <NewTrackingBadge text="New Batch" />}
                  </div>
                  <div style={{ color: T.slate, fontSize: 12, marginTop: 4 }}>{batch.course || '-'} | {batch.course_type || '-'} | {batch.timing || '-'}</div>
                </div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <AdminBadge text={`${batch.student_count} students`} variant="info" />
                    <AdminBadge text={`${batch.new_student_count || 0} new`} variant="success" />
                    {isCounselorTracking ? (
                      <AdminBadge text={`${batch.trainer || 'No trainer'}`} variant="teal" />
                    ) : (
                      <>
                        <AdminBadge text={`${batch.content_upload_total || 0} uploads`} variant="teal" />
                        <AdminBadge text={`${batch.sessions_completed || 0}/${batch.total_sessions || 0} sessions done`} variant="warning" />
                      </>
                    )}
                  </div>
                  {!isCounselorTracking && <TrackingDonut value={batch.session_percentage} color="#059669" size={88} label="Sessions" />}
                </div>
              </div>
              {!isCounselorTracking && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10, marginTop: 14 }}>
                    <TrackingMiniStat label="Materials Uploaded" value={batch.materials_uploaded} icon="fa-cloud-arrow-up" color="#0891b2" />
                    <TrackingMiniStat label="Quizzes Uploaded" value={batch.quizzes_uploaded} icon="fa-circle-question" color="#7c3aed" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, marginTop: 13 }}>
                    <TrackBar label={`Batch session progress (${batch.sessions_completed}/${batch.total_sessions})`} value={batch.session_percentage} color="#059669" />
                    <TrackBar label={`Batch attendance progress (${batch.attendance_present}/${batch.attendance_total})`} value={batch.attendance_percentage} color="#2563eb" />
                  </div>
                </>
              )}
              {(batch.recent_uploads || []).length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4, marginBottom: 8 }}>
                  {(batch.recent_uploads || []).slice(0, 6).map((item, idx) => (
                    <span key={`${item.kind}-${idx}`} style={{ border: '1px solid #e2e8f0', borderRadius: 999, padding: '5px 9px', background: '#f8fafc', color: '#334155', fontSize: 11, fontWeight: 800 }}>
                      {item.kind}: {item.title || '-'}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ overflowX: 'auto', marginTop: 8 }}>
                <table className="admin-table">
                  <thead><tr><th>Student</th><th>Attendance Progress</th><th>Session Progress</th><th>Created</th></tr></thead>
                  <tbody>
                    {(batch.students || []).map(student => (
                      <tr key={student.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <strong>{student.name}</strong>
                            {student.is_new && <NewTrackingBadge text="New Student" />}
                          </div>
                          <div style={{ color: T.slate, fontSize: 11 }}>{student.student_id} | {student.mobile_no}</div>
                        </td>
                        <td>{student.attendance_present}/{student.attendance_total} ({student.attendance_percentage}%)</td>
                        <td>{student.sessions_completed}/{student.total_sessions} ({student.session_percentage}%)</td>
                        <td>{fmtDateOnly(student.created_at)}</td>
                      </tr>
                    ))}
                    {(batch.students || []).length === 0 && <tr><td colSpan="4"><AdminEmpty msg="No students assigned to this batch" /></td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {(data.batch_details || []).length === 0 && <AdminEmpty msg="No batches handled by this staff" icon="fa-layer-group" />}
        </div>
        )}
      </div>

      <AdminModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} title={`${staffInfo.first_name || ''} ${staffInfo.last_name || ''} - Weekly Login`} size="lg">
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <TrackingMiniStat label="Last 7 Days Logins" value={staff.login_usage_count || 0} icon="fa-right-to-bracket" color="#ca8a04" />
            <TrackingMiniStat label="Target Logins" value={staff.login_usage_target || 7} icon="fa-bullseye" color="#2563eb" />
            <TrackingMiniStat label="Usage" value={`${data.charts?.login_usage || 0}%`} icon="fa-chart-simple" color="#059669" />
          </div>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#f8fafc', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: T.ink }}>Login Records</div>
                <div style={{ fontSize: 11, color: T.slate, fontWeight: 800 }}>Last 7 days activity</div>
              </div>
              <AdminBadge text={`${(data.weekly_login_records || []).length} records`} variant="warning" />
            </div>
            <div style={{ maxHeight: '52vh', overflow: 'auto', padding: 12 }}>
              {(data.weekly_login_records || []).length ? (
                <table className="admin-table" style={{ margin: 0, minWidth: 620 }}>
                  <thead>
                    <tr><th style={{ width: '34%' }}>Login</th><th style={{ width: '33%' }}>Logout</th><th style={{ width: '33%' }}>Last Seen</th></tr>
                  </thead>
                  <tbody>
                    {(data.weekly_login_records || []).map((item, idx) => (
                      <tr key={idx}>
                        <td><strong>{fmtDateTime(item.login_time)}</strong></td>
                        <td>{item.logout_time ? fmtDateTime(item.logout_time) : <AdminBadge text="Still active" variant="success" />}</td>
                        <td>{fmtDateTime(item.last_seen)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <AdminEmpty msg="No login records in the last 7 days" icon="fa-user-clock" />}
            </div>
          </div>
        </div>
      </AdminModal>

    </div>
  )
}

function ModernAdminDashboard({ stats, navigate }) {
  const branchStudentCounts = stats?.student_branch_counts || []
  const batchBranchCounts = stats?.batch_branch_counts || []
  const completedBranchCounts = stats?.completed_branch_counts || []
  const branchUsageStats = stats?.branch_usage_stats || []
  const branchTrackingCards = stats?.branch_tracking_cards || []
  const maxBranchCount = Math.max(...branchStudentCounts.map(item => item.count || 0), 1)
  const displayBranch = (branch) => {
    const labels = {
      '100ft': '100ft',
      hopes: 'Hopes',
      kuniyamuthur: 'Kuniyamuthur',
      kunniyamuthur: 'Kuniyamuthur',
    }
    return labels[branch] || branch || 'Unassigned'
  }
  const openBranchStudents = (branch) => {
    if (!branch) navigate('/admin/students')
    else navigate(`/admin/students?branch=${encodeURIComponent(branch)}`)
  }
  const openBranchBatches = (branch) => {
    if (!branch) navigate('/admin/batches')
    else navigate(`/admin/batches?branch=${encodeURIComponent(branch)}`)
  }
  const openBranchCompleted = (branch) => {
    if (!branch) navigate('/admin/completed')
    else navigate(`/admin/completed?branch=${encodeURIComponent(branch)}`)
  }
  const branchOrder = ['100ft', 'hopes', 'kuniyamuthur']
  const makeBranchSegments = (items, onClick) => branchOrder.map((branch, index) => ({
    label: displayBranch(branch),
    value: items.find(item => ['kuniyamuthur', 'kunniyamuthur'].includes(branch) ? ['kuniyamuthur', 'kunniyamuthur'].includes(item.branch) : item.branch === branch)?.count || 0,
    color: ['#7c3aed', '#059669', '#ca8a04'][index] || '#2563eb',
    onClick: () => onClick(branch),
  }))
  const makeFixedBranchCards = (items, onClick) => branchOrder.map((branch, index) => ({
    label: displayBranch(branch),
    value: items.find(item => ['kuniyamuthur', 'kunniyamuthur'].includes(branch) ? ['kuniyamuthur', 'kunniyamuthur'].includes(item.branch) : item.branch === branch)?.count || 0,
    color: ['#7c3aed', '#059669', '#ca8a04'][index] || '#2563eb',
    onClick: () => onClick(branch),
  }))
  const heroCards = [
    {
      label: 'Active Students',
      value: stats?.student_count ?? 0,
      color: '#2563eb',
      onClick: () => navigate('/admin/students'),
    },
    ...makeFixedBranchCards(branchStudentCounts, openBranchStudents),
  ]
  const statCards = [
    {
      label: 'Employees',
      value: stats?.employee_count ?? 0,
      icon: 'fa-users-gear',
      color: '#0891b2',
      soft: '#cffafe',
      to: '/admin/employees',
      segments: [
        { label: 'Mentors', value: stats?.mentor_count ?? 0, onClick: () => navigate('/admin/employees?designation=mentor') },
        { label: 'Counselors', value: stats?.counselor_count ?? 0, onClick: () => navigate('/admin/employees?designation=counselor') },
      ],
      segmentColumns: 2,
    },
    {
      label: 'Batches',
      value: stats?.batch_count ?? 0,
      icon: 'fa-layer-group',
      color: '#7c3aed',
      soft: '#ede9fe',
      to: '/admin/batches',
      segments: makeBranchSegments(batchBranchCounts, openBranchBatches),
      segmentColumns: 3,
    },
    {
      label: 'Completed',
      value: stats?.completed_count ?? 0,
      icon: 'fa-graduation-cap',
      color: '#dc2626',
      soft: '#fee2e2',
      to: '/admin/completed',
      segments: makeBranchSegments(completedBranchCounts, openBranchCompleted),
      segmentColumns: 3,
    },
    { label: 'Courses', value: stats?.course_count ?? 0, icon: 'fa-book-open', color: '#16a34a', soft: '#dcfce7', to: '/admin/courses' },
    { label: 'Fee Management', value: 'View', icon: 'fa-rupee-sign', color: '#059669', soft: '#d1fae5', to: '/admin/fees' },
  ]

  return (
    <div className="admin-root admin-fade" style={{ width: '100%', overflowX: 'hidden' }}>
      <AdminStyles />
      <div style={{
        borderRadius: 22,
        padding: '14px 20px',
        marginBottom: 18,
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 55%, #eef6ff 100%)',
        border: '1px solid rgba(148,163,184,.22)',
        boxShadow: '0 18px 44px rgba(15,23,42,.08)',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, .95fr)',
        gap: 18,
        alignItems: 'center',
        width: '100%',
      }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', minWidth: 0 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, boxShadow: '0 12px 24px rgba(15,23,42,.18)', flex: '0 0 auto' }}>
            <i className="fas fa-chart-line" />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 900, letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: 6 }}>Administrator Portal</div>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: 'clamp(22px, 2vw, 30px)', lineHeight: 1, fontWeight: 900, fontFamily: "'Playfair Display'", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Management Dashboard</h2>
            <p style={{ margin: '7px 0 0', color: '#475569', fontSize: 'clamp(11px, .9vw, 13px)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Indra Institute of Education overview with live active student distribution.
            </p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, alignItems: 'stretch', minWidth: 0 }}>
          {heroCards.length ? heroCards.map(({ label, value, color, onClick }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              style={{
                borderRadius: 16,
                background: 'rgba(255,255,255,.58)',
                border: '1px solid #e2e8f0',
                padding: '10px 11px',
                minHeight: 68,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'DM Sans',
              }}
            >
              <div style={{ color: '#0f172a', fontSize: 19, fontWeight: 900, lineHeight: 1.05, textTransform: 'capitalize' }}>{value}</div>
              <div style={{ color: '#64748b', fontSize: 8.8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
            </button>
          )) : (
            <div style={{ borderRadius: 16, background: '#fff', border: '1px solid #e2e8f0', padding: 14, minHeight: 88, color: '#64748b', fontSize: 13, fontWeight: 800 }}>
              No branch students found
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}>
        {statCards.map((stat) => (
          <div
            key={stat.label}
            onClick={() => stat.to && navigate(stat.to)}
            style={{
              cursor: 'pointer',
              minHeight: 168,
              borderRadius: 14,
              background: 'rgba(255,255,255,.58)',
              border: '1px solid rgba(148,163,184,.22)',
              boxShadow: '0 12px 28px rgba(15,23,42,.07)',
              backdropFilter: 'blur(8px)',
              padding: 14,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              textAlign: 'left',
              fontFamily: 'DM Sans',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 11, background: stat.soft, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                <i className={`fas ${stat.icon}`} />
              </div>
              <i className="fas fa-arrow-up-right-from-square" style={{ color: '#64748b', opacity: 0.82, fontSize: 13 }} />
            </div>
            <div>
              <div style={{ color: '#0f172a', fontSize: stat.value === 'View' ? 22 : 25, fontWeight: 900, lineHeight: 1, letterSpacing: 0 }}>{stat.value}</div>
              <div style={{ color: '#334155', fontSize: 11.5, fontWeight: 900, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stat.label}</div>
              {stat.segments && (
                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: `repeat(${stat.segmentColumns || stat.segments.length}, minmax(0, 1fr))`, gap: 6 }}>
                  {stat.segments.map(segment => (
                    <button
                      key={segment.label}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        segment.onClick()
                      }}
                      style={{
                        borderRadius: 10,
                        background: 'rgba(255,255,255,.52)',
                        border: `1px solid ${segment.color || stat.color}4d`,
                        color: '#0f172a',
                        padding: '6px 7px',
                        minHeight: 40,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        gap: 5,
                        fontSize: 8.8,
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        fontFamily: 'DM Sans',
                      }}
                    >
                      <strong style={{ color: segment.color || stat.color, fontSize: 14, lineHeight: 1 }}>{segment.value}</strong>
                      <span style={{ color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{segment.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#64748b', fontSize: 10, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>User Monitoring</div>
            <h3 style={{ margin: '2px 0 0', color: '#0f172a', fontSize: 19, fontWeight: 900, fontFamily: "'Playfair Display'" }}>Branch Usage</h3>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
          {branchUsageStats.map((branchStat, index) => {
            const color = ['#2563eb', '#059669', '#ca8a04', '#7c3aed', '#dc2626'][index % 5]
            const percentage = Math.max(0, Math.min(100, Number(branchStat.usage_percentage) || 0))
            return (
              <div
                key={branchStat.branch}
                style={{
                  borderRadius: 16,
                  background: 'rgba(255,255,255,.58)',
                  border: '1px solid rgba(148,163,184,.22)',
                  boxShadow: 'none',
                  backdropFilter: 'blur(8px)',
                  padding: 16,
                  minHeight: 190,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ width: 34, height: 34, borderRadius: 11, background: `${color}22`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, marginBottom: 8 }}>
                      <i className="fas fa-chart-pie" />
                    </div>
                    <div style={{ color: '#334155', fontSize: 12, fontWeight: 900, textTransform: 'capitalize' }}>{displayBranch(branchStat.branch)}</div>
                  </div>
                  <div style={{ width: 54, height: 54, borderRadius: '50%', background: `conic-gradient(${color} ${percentage * 3.6}deg, rgba(15,23,42,.08) 0deg)`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,.72)', border: '1px solid rgba(148,163,184,.16)', display: 'grid', placeItems: 'center', color, fontSize: 15 }}>
                      <i className="fas fa-gauge-high" />
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ color: '#0f172a', fontSize: 34, lineHeight: 1, fontWeight: 950, marginTop: 12 }}>{percentage}%</div>
                  <div style={{ color: '#64748b', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 5 }}>Usage</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 7, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/monitoring/employees?branch=${encodeURIComponent(branchStat.branch)}`)}
                    style={{
                      minHeight: 34,
                      borderRadius: 10,
                      border: `1px solid ${color}66`,
                      background: 'rgba(255,255,255,.52)',
                      color: '#334155',
                      fontWeight: 900,
                      cursor: 'pointer',
                      fontFamily: 'DM Sans',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      fontSize: 11,
                    }}
                  >
                    <i className="fas fa-user-tie" /> Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/monitoring/students?branch=${encodeURIComponent(branchStat.branch)}`)}
                    style={{
                      minHeight: 34,
                      borderRadius: 10,
                      border: `1px solid ${color}66`,
                      background: 'rgba(255,255,255,.52)',
                      color: '#334155',
                      fontWeight: 900,
                      cursor: 'pointer',
                      fontFamily: 'DM Sans',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      fontSize: 11,
                    }}
                  >
                    <i className="fas fa-user-graduate" /> Student
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#64748b', fontSize: 10, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>Track Activity</div>
            <h3 style={{ margin: '2px 0 0', color: '#0f172a', fontSize: 19, fontWeight: 900 }}>Branch Staff Activity</h3>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/employee-tracking')}
            style={{
              border: '1px solid #e2e8f0',
              background: '#fff',
              color: '#334155',
              borderRadius: 10,
              padding: '9px 12px',
              fontSize: 12,
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            <i className="fas fa-list" style={{ marginRight: 7 }} /> View All
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
          {branchTrackingCards.map((branch, index) => {
            const color = ['#2563eb', '#059669', '#ca8a04'][index % 3]
            const soft = ['#dbeafe', '#d1fae5', '#fef3c7'][index % 3]
            const score = Math.max(0, Math.min(100, Number(branch.activity_score) || 0))
            return (
              <button
                key={branch.branch}
                type="button"
                onClick={() => navigate(`/admin/employee-tracking?branch=${encodeURIComponent(branch.branch)}`)}
                style={{
                  borderRadius: 20,
                  background: '#fff',
                  border: '1px solid rgba(226,232,240,.9)',
                  padding: 24,
                  minHeight: 205,
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: '0 18px 38px rgba(15,23,42,.08)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: soft, color, display: 'grid', placeItems: 'center', fontSize: 20, marginBottom: 14 }}>
                      <i className="fas fa-building" />
                    </div>
                    <h4 style={{ margin: 0, color: '#0f172a', fontSize: 20, fontWeight: 900 }}>{displayBranch(branch.branch)}</h4>
                    <div style={{ color: '#7891b0', fontSize: 16, marginTop: 8, fontWeight: 700 }}>
                      {branch.staff_count} staff | {branch.student_count} students | {branch.batch_count} batches
                    </div>
                  </div>
                  <div style={{ width: 108, height: 108, borderRadius: '50%', background: `conic-gradient(${color} ${score * 3.6}deg, #e2e8f0 0deg)`, display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
                    <div style={{ width: 78, height: 78, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', color, fontSize: 22, fontWeight: 900 }}>{score}%</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginTop: 25 }}>
                  <AdminBadge text={`${branch.attendance_marked_count} attendance`} variant="info" />
                  <AdminBadge text={`${branch.sessions_completed} sessions`} variant="teal" />
                  <AdminBadge text={`${branch.materials_count} materials`} variant="success" />
                  <AdminBadge text={`${branch.quizzes_count} quizzes`} variant="warning" />
                </div>
              </button>
            )
          })}
          {branchTrackingCards.length === 0 && <AdminEmpty msg="No branch tracking data found" icon="fa-users-viewfinder" />}
        </div>
      </div>
    </div>
  )
}

function LeaveTable({ title, fetchUrl, processUrl, isHistory }) {
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [reasonModal, setReasonModal] = useState(null)

  const load = () => {
    setLoading(true)
    api.get(`${fetchUrl}?history=${isHistory ? 'true' : 'false'}`).then(r => setLeaves(r.data)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [isHistory, fetchUrl])

  const process = async (id, action) => {
    if (!window.confirm(`${action === 'Accept' ? 'Approve' : 'Reject'} this leave request?`)) return
    try {
      await api.patch(`${processUrl}${id}/process/`, { action })
      toast.success(`Leave ${action === 'Accept' ? 'approved' : 'rejected'}`)
      load()
    } catch { toast.error('Failed to update') }
  }

  const pending = leaves.filter(l => l.status === 'Pending').length
  const approved = leaves.filter(l => l.status === 'Approved').length
  const rejected = leaves.filter(l => l.status === 'Rejected').length

  return (
    <div className="admin-root admin-fade">
      <AdminStyles />
      <AdminPageHeader
        title={`🗓️ ${title}`}
        sub={isHistory ? 'Processed leave requests history' : 'Pending leave requests awaiting approval'}
      />
      <div className="admin-stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="admin-stat-card" style={{ background: '#fef5e4', border: 'none' }}>
          <div className="admin-stat-icon" style={{ background: 'rgba(244,169,64,0.1)', color: T.amber }}><i className="fas fa-clock" /></div>
          <div><div className="admin-stat-value">{pending}</div><div className="admin-stat-label">Pending</div></div>
        </div>
        <div className="admin-stat-card" style={{ background: '#e8f8f0', border: 'none' }}>
          <div className="admin-stat-icon" style={{ background: 'rgba(76,175,129,0.1)', color: T.sage }}><i className="fas fa-check-circle" /></div>
          <div><div className="admin-stat-value">{approved}</div><div className="admin-stat-label">Approved</div></div>
        </div>
        <div className="admin-stat-card" style={{ background: '#fdeaec', border: 'none' }}>
          <div className="admin-stat-icon" style={{ background: 'rgba(232,72,85,0.1)', color: T.rose }}><i className="fas fa-times-circle" /></div>
          <div><div className="admin-stat-value">{rejected}</div><div className="admin-stat-label">Rejected</div></div>
        </div>
      </div>
      <div className="admin-card">
        <AdminSectionHeader title={isHistory ? '📋 Leave History' : '⏳ Pending Leave Requests'} count={leaves.length} />
        {loading ? <AdminSpin /> : leaves.length === 0 ? (
          <AdminEmpty msg="No leave requests found" icon="fa-calendar-times" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th><th>Staff Member</th><th>Type</th><th>Dates</th>
                  <th>Duration</th>
                  <th>Applied</th><th>Status</th>
                  {!isHistory && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {leaves.map((l, i) => (
                  <tr key={l.id}>
                    <td style={{ color: T.slate, fontSize: 12 }}>{i + 1}</td>
                    <td>
                      <div className="admin-person-cell">
                        <AdminAvatar name={l.staff_name} size={34} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{l.staff_name}</div>
                          <div style={{ fontSize: 11, color: T.slate }}>{l.staff_designation}</div>
                        </div>
                      </div>
                    </td>
                    <td><AdminBadge text={l.leave_type} variant="info" /></td>
                    <td style={{ fontSize: 12 }}>
                      <div style={{ fontWeight: 500 }}>{l.start_date}</div>
                      <div style={{ color: T.slate }}>→ {l.end_date}</div>
                    </td>
                    <td><AdminBadge text={`${l.no_of_days}d`} variant="warning" /></td>
                    {/* Contact column removed per UI change request */}
                    {/* <td>
                      <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setReasonModal({ reason: l.reason, name: l.staff_name })}>
                        <i className="fas fa-eye" /> View
                      </button>
                    </td> */}
                    <td style={{ fontSize: 11, color: T.slate }}>{l.applied_at}</td>
                    <td><AdminBadge text={l.status} variant={l.status === 'Approved' ? 'success' : l.status === 'Rejected' ? 'danger' : 'pending'} /></td>
                    {!isHistory && (
                      <td>
                        {l.status === 'Pending' ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="admin-btn admin-btn-success admin-btn-sm" onClick={() => process(l.id, 'Accept')}>
                              <i className="fas fa-check" />
                            </button>
                            <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => process(l.id, 'Reject')}>
                              <i className="fas fa-times" />
                            </button>
                          </div>
                        ) : <AdminBadge text={l.status} variant={l.status === 'Approved' ? 'success' : 'danger'} />}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {reasonModal && <ReasonModal reason={reasonModal.reason} name={reasonModal.name} onClose={() => setReasonModal(null)} />}
    </div>
  )
}

export function AdminMentorLeaveRequest() { return <LeaveTable title="Mentor Leave Requests" fetchUrl="/admin/staff-leave/" processUrl="/admin/staff-leave/" isHistory={false} /> }
export function AdminMentorLeaveHistory() { return <LeaveTable title="Mentor Leave History" fetchUrl="/admin/staff-leave/" processUrl="/admin/staff-leave/" isHistory={true} /> }
export function AdminCounselorLeaveRequest() { return <LeaveTable title="Counselor Leave Requests" fetchUrl="/admin/counselor-leave/" processUrl="/admin/counselor-leave/" isHistory={false} /> }
export function AdminCounselorLeaveHistory() { return <LeaveTable title="Counselor Leave History" fetchUrl="/admin/counselor-leave/" processUrl="/admin/counselor-leave/" isHistory={true} /> }

// ══════════════════════════════════════════════════════════════════════════════
// SUPPORT TABLE (Reusable component)
// ══════════════════════════════════════════════════════════════════════════════
function SupportTable({ title, endpoint, historyEndpoint, historyOnly, nameKey = 'staff_name' }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  const load = () => {
    setLoading(true)
    api.get(historyOnly ? historyEndpoint : endpoint).then(r => {
      let data = r.data.results || r.data
      if (filter && !historyOnly) data = data.filter(req => req.status === filter)
      setRequests(data)
    }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [filter, historyOnly])

  const update = async (id, status) => {
    try {
      const updateUrl = endpoint.replace('/admin/', '/admin/').replace(/\/$/, '') + `/${id}/update/`
      await api.patch(updateUrl, { status })
      toast.success('Status updated')
      load()
    } catch { toast.error('Failed') }
  }

  const pending = requests.filter(r => r.status === 'pending').length
  const inProgress = requests.filter(r => r.status === 'in_progress').length
  const resolved = requests.filter(r => r.status === 'resolved').length

  return (
    <div className="admin-root admin-fade">
      <AdminStyles />
      <AdminPageHeader
        title={`💬 ${title}`}
        sub={historyOnly ? 'Processed support requests' : 'Manage and respond to support requests'}
      />
      <div className="admin-stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="admin-stat-card" style={{ background: '#fef5e4', border: 'none' }}>
          <div className="admin-stat-icon" style={{ background: 'rgba(244,169,64,0.1)', color: T.amber }}><i className="fas fa-clock" /></div>
          <div><div className="admin-stat-value">{pending}</div><div className="admin-stat-label">Pending</div></div>
        </div>
        <div className="admin-stat-card" style={{ background: '#e4f2fd', border: 'none' }}>
          <div className="admin-stat-icon" style={{ background: 'rgba(18,96,160,0.1)', color: '#1260a0' }}><i className="fas fa-spinner" /></div>
          <div><div className="admin-stat-value">{inProgress}</div><div className="admin-stat-label">In Progress</div></div>
        </div>
        <div className="admin-stat-card" style={{ background: '#e8f8f0', border: 'none' }}>
          <div className="admin-stat-icon" style={{ background: 'rgba(76,175,129,0.1)', color: T.sage }}><i className="fas fa-check-circle" /></div>
          <div><div className="admin-stat-value">{resolved}</div><div className="admin-stat-label">Resolved</div></div>
        </div>
      </div>

      {!historyOnly && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[['', 'All'], ['pending', 'Pending'], ['in_progress', 'In Progress'], ['resolved', 'Resolved']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className="admin-btn admin-btn-sm"
              style={{ background: filter === val ? T.amber : 'white', color: filter === val ? T.navy : T.slate, border: `1.5px solid ${filter === val ? T.amber : T.border}` }}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="admin-card">
        <AdminSectionHeader title={`All ${title}`} count={requests.length} />
        {loading ? <AdminSpin /> : requests.length === 0 ? (
          <AdminEmpty msg="No requests found" icon="fa-headset" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Person</th><th>Message</th><th>Status</th>
                  <th>Date</th>{!historyOnly && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id}>
                    <td>
                      <div className="admin-person-cell">
                        <AdminAvatar name={req[nameKey]} size={34} />
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{req[nameKey] || '—'}</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, color: T.slate }}>{req.message}</div>
                    </td>
                    <td><AdminBadge text={req.status} variant={req.status === 'resolved' ? 'success' : req.status === 'in_progress' ? 'info' : 'pending'} /></td>
                    <td style={{ fontSize: 12, color: T.slate }}>{req.created_at ? new Date(req.created_at).toLocaleDateString('en-IN') : '—'}</td>
                    {!historyOnly && (
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {req.status !== 'resolved' && <button className="admin-btn admin-btn-success admin-btn-sm" onClick={() => update(req.id, 'resolved')}><i className="fas fa-check" /></button>}
                          {req.status !== 'in_progress' && <button className="admin-btn" style={{ padding: '5px 10px', border: 'none', borderRadius: 8, background: '#e4f2fd', color: '#1260a0', cursor: 'pointer', fontSize: 12 }} onClick={() => update(req.id, 'in_progress')}><i className="fas fa-spinner" /></button>}
                          {req.status !== 'pending' && <button className="admin-btn" style={{ padding: '5px 10px', border: 'none', borderRadius: 8, background: '#fef5e4', color: '#8a5a00', cursor: 'pointer', fontSize: 12 }} onClick={() => update(req.id, 'pending')}><i className="fas fa-clock" /></button>}
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

export function AdminMentorSupportRequest() { return <SupportTable title="Mentor Support Requests" endpoint="/admin/staff-support/" historyEndpoint="/admin/staff-support/history/" historyOnly={false} nameKey="staff_name" /> }
export function AdminMentorSupportHistory() { return <SupportTable title="Mentor Support History" endpoint="/admin/staff-support/" historyEndpoint="/admin/staff-support/history/" historyOnly={true} nameKey="staff_name" /> }
export function AdminCounselorSupportRequest() { return <SupportTable title="Counselor Support Requests" endpoint="/admin/counselor-support/" historyEndpoint="/admin/counselor-support/history/" historyOnly={false} nameKey="counselor_name" /> }
export function AdminCounselorSupportHistory() { return <SupportTable title="Counselor Support History" endpoint="/admin/counselor-support/" historyEndpoint="/admin/counselor-support/history/" historyOnly={true} nameKey="counselor_name" /> }
export function AdminStudentSupportRequest() { return <SupportTable title="Student Support Requests" endpoint="/admin/student-support/" historyEndpoint="/admin/student-support/history/" historyOnly={false} nameKey="student_name" /> }
export function AdminStudentSupportHistory() { return <SupportTable title="Student Support History" endpoint="/admin/student-support/" historyEndpoint="/admin/student-support/history/" historyOnly={true} nameKey="student_name" /> }


// ══════════════════════════════════════════════════════════════════════════════
// BRANCH ATTENDANCE — 3-level drill with Student Modal
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// BRANCH ATTENDANCE — 3-level drill with Student Modal (FIXED)
// ══════════════════════════════════════════════════════════════════════════════
export function AdminBranchAttendance() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [staffData, setStaffData] = useState([])
  const [loadingStaff, setLoadingStaff] = useState(false)
  const location = useLocation()
  const deepLink = new URLSearchParams(location.search)
  const targetStudentId = deepLink.get('student_id')
  const targetBatchId = deepLink.get('batch_id')
  const targetTab = deepLink.get('tab') || 'overview'

  const load = (params = '') => {
    setLoading(true)
    api.get(`/admin/branch-attendance/${params}`).then(r => setData(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const branch = params.get('branch')
    const staffId = params.get('staff_id')
    if (staffId) {
      const query = new URLSearchParams()
      if (branch) query.set('branch', branch)
      query.set('staff_id', staffId)
      load(`?${query.toString()}`)
    } else if (branch) {
      load(`?branch=${encodeURIComponent(branch)}`)
    } else {
      load()
    }
  }, [location.search])

  // Fetch correct student counts when in branch_staff view
  useEffect(() => {
    const loadStaffWithCorrectCounts = async () => {
      if (!data || data.view_mode !== 'branch_staff') return

      setLoadingStaff(true)
      const staffList = data.attendance_data || []

      const updatedStaff = await Promise.all(
        staffList.map(async (staffItem) => {
          try {
            const studentsRes = await api.get(`/students/?assigned_staff=${staffItem.staff.id}`)
            const allStudents = studentsRes.data.results || studentsRes.data || []
            const branchFilteredStudents = allStudents.filter(student =>
              student.branch?.toLowerCase() === data.branch_name?.toLowerCase()
            )
            return { ...staffItem, student_count: branchFilteredStudents.length }
          } catch (err) {
            return { ...staffItem, student_count: 0 }
          }
        })
      )
      setStaffData(updatedStaff)
      setLoadingStaff(false)
    }

    loadStaffWithCorrectCounts()
  }, [data])

  if (loading) return <div className="admin-root"><AdminStyles /><AdminSpin /></div>
  if (!data) return <div className="admin-root"><AdminStyles /><AdminSpin /></div>

  const { view_mode } = data

  const Crumb = () => (
    <div className="admin-crumb">
      <button className="admin-crumb-btn" onClick={() => load()}>
        <i className="fas fa-sitemap" style={{ marginRight: 5 }} />All Branches
      </button>
      {(view_mode === 'branch_staff' || view_mode === 'staff_details') && <>
        <span className="admin-crumb-sep">/</span>
        <button className="admin-crumb-btn" onClick={() => load(`?branch=${data.branch_name}`)}>
          <i className="fas fa-building" style={{ marginRight: 5 }} />{data.branch_name}
        </button>
      </>}
      {view_mode === 'staff_details' && <>
        <span className="admin-crumb-sep">/</span>
        <span style={{ color: T.navy, fontWeight: 600 }}>{data.staff?.first_name} {data.staff?.last_name}</span>
      </>}
    </div>
  )

  if (view_mode === 'branches') return (
    <div className="admin-root admin-fade">
      <AdminStyles />
      <AdminPageHeader title="🏢 Branch Overview" sub="Select a branch to view staff and student details" />
      <div className="admin-stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          ['Branches', data.total_branches, 'fa-sitemap', T.teal],
          ['Total Staff', data.total_staff, 'fa-user-tie', T.amber],
          ['Active Staff', data.staff_with_batches, 'fa-users', T.sage],
          ['Students', data.total_students, 'fa-user-graduate', T.rose],
        ].map(([l, v, ic, col]) => (
          <div key={l} className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: `rgba(${col === T.teal ? '46,196,182' : col === T.amber ? '244,169,64' : col === T.sage ? '76,175,129' : '232,72,85'},0.1)`, color: col }}>
              <i className={`fas ${ic}`} />
            </div>
            <div>
              <div className="admin-stat-value">{v ?? 0}</div>
              <div className="admin-stat-label">{l}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="admin-row-grid-2">
        {(data.branches || []).map(branch => {
          const s = data.branch_stats?.[branch] || {}
          return (
            <div key={branch} className="admin-card" onClick={() => load(`?branch=${branch}`)} style={{ cursor: 'pointer', padding: 20, transition: 'all .2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 13, background: `linear-gradient(135deg, ${T.navyMid}, ${T.navyLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  <i className="fas fa-building" style={{ color: T.amber }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, textTransform: 'capitalize', marginBottom: 6 }}>{branch}</div>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    <AdminBadge text={`${s.staff_count || 0} staff`} variant="info" />
                    <AdminBadge text={`${s.staff_with_batches || 0} active`} variant="teal" />
                  </div>
                </div>
                <i className="fas fa-chevron-right" style={{ color: T.slateLight, fontSize: 12 }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  if (view_mode === 'branch_staff') {
    const baseStaff = data.attendance_data || []
    const displayStaff = loadingStaff || (staffData.length === 0 && baseStaff.length > 0) ? baseStaff : staffData

    return (
      <div className="admin-root admin-fade">
        <AdminStyles />
        <Crumb />
        <AdminPageHeader title={`🏢 ${data.branch_name} — Staff`} sub="Click a staff member to view their students' details" />
        <div className="admin-row-grid-2">
          {loadingStaff ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="admin-card" style={{ padding: 18, opacity: 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e9ecef' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ width: '60%', height: 16, background: '#e9ecef', borderRadius: 4, marginBottom: 8 }} />
                    <div style={{ width: '40%', height: 12, background: '#e9ecef', borderRadius: 4 }} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ width: 40, height: 22, background: '#e9ecef', borderRadius: 4, marginBottom: 4 }} />
                    <div style={{ width: 30, height: 14, background: '#e9ecef', borderRadius: 4 }} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            displayStaff.map(d => (
              <div
                key={d.staff.id}
                className="admin-card"
                onClick={() => load(`?branch=${data.branch_name}&staff_id=${d.staff.id}`)}
                style={{ cursor: 'pointer', padding: 18, transition: 'all 0.2s ease' }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = T.shadowMd
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = T.shadow
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <AdminAvatar name={d.staff.first_name} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{d.staff.first_name} {d.staff.last_name}</div>
                    <div style={{ fontSize: 12, color: T.slate }}>{d.staff.designation}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 18, fontFamily: "'Playfair Display'" }}>{d.batch_count || 0}</div>
                    <div style={{ fontSize: 11, color: T.slate }}>batches</div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: T.sage, marginTop: 4 }}>{d.student_count || 0}</div>
                    <div style={{ fontSize: 11, color: T.slate }}>students</div>
                  </div>
                </div>
              </div>
            ))
          )}
          {!loadingStaff && baseStaff.length === 0 && displayStaff.length === 0 && <AdminEmpty msg="No active staff found" icon="fa-user-slash" />}
        </div>
      </div>
    )
  }

  if (view_mode === 'staff_details') {
    return <StaffDetailsView staff={data.staff || {}} students={data.student_details || []} data={data} onBack={() => load(`?branch=${data.branch_name}`)} targetStudentId={targetStudentId} targetBatchId={targetBatchId} targetTab={targetTab} />
  }

  return <div className="admin-root"><AdminStyles /><AdminSpin /></div>
}

function StaffDetailsView({ staff, students, data, onBack, targetStudentId, targetBatchId, targetTab }) {
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState('batches')
  const [batches, setBatches] = useState([])
  const [batchStudents, setBatchStudents] = useState({})
  const [loading, setLoading] = useState(false)
  const [totalStudentsCount, setTotalStudentsCount] = useState(0)
  const [allStaffStudents, setAllStaffStudents] = useState([]) // Store all students assigned to staff

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

  // Fetch batches and students for this staff with proper filtering
  useEffect(() => {
    const fetchStaffData = async () => {
      setLoading(true)
      try {
        // FIRST: Fetch ALL students directly assigned to this staff (source of truth)
        const allStudentsRes = await api.get(`/students/?assigned_staff=${staff.id}`)
        const allDirectStudents = allStudentsRes.data.results || allStudentsRes.data || []

        // Filter by branch
        const branchFilteredStudents = allDirectStudents.filter(student =>
          student.branch?.toLowerCase() === staff.branch?.toLowerCase()
        )
        setAllStaffStudents(branchFilteredStudents)

        // Get batches for this staff member
        const response = await api.get(`/batches/?faculty=${staff.id}`)
        const batchesData = response.data.results || response.data || []

        // Filter batches by staff's branch
        const filteredBatches = batchesData.filter(batch =>
          batch.branch?.toLowerCase() === staff.branch?.toLowerCase()
        )
        console.log(`Batches for ${staff.first_name} (${staff.branch}):`, filteredBatches)
        setBatches(filteredBatches)

        // Create a map of student ID to student data
        const studentMap = new Map()
        branchFilteredStudents.forEach(student => {
          // Find existing data from the attendance endpoint
          const existingData = students.find(s => s.student.id === student.id)
          studentMap.set(student.id, {
            ...student,
            attendance_present: existingData?.attendance_present || 0,
            attendance_total: existingData?.attendance_total || 0,
            attendance_percentage: existingData?.attendance_percentage || 0,
            attendance_records: existingData?.attendance_records || [],
            test_results: existingData?.test_results || [],
            test_count: existingData?.test_count || 0,
            average_score: existingData?.average_score || 0,
            quiz_results: existingData?.quiz_results || [],
            quiz_count: existingData?.quiz_count || 0,
            leave_requests: existingData?.leave_requests || [],
            leaves_count: existingData?.leaves_count || 0,
            sessions_completed: existingData?.sessions_completed || 0,
            total_sessions: existingData?.total_sessions || 0,
            progress_percentage: existingData?.progress_percentage || 0,
            doubts_count: existingData?.doubts_count || 0,
            resolved_doubts: existingData?.resolved_doubts || 0,
            last_activity: existingData?.last_activity || null,
          })
        })

        // For each batch, fetch students and filter ONLY those assigned to this batch
        const studentsMap = {}
        let totalUniqueStudents = 0
        const uniqueStudentIdsForBatch = new Set() // Track unique students across all batches

        for (const batch of filteredBatches) {
          const studentsRes = await api.get(`/batches/${batch.id}/students/`)
          const batchStudentsRaw = studentsRes.data.results || studentsRes.data || []

          // IMPORTANT: Only include students whose assigned_batch matches this batch ID
          // AND who are in the correct branch
          const uniqueBatchStudentsMap = new Map()
          batchStudentsRaw.forEach(student => {
            // Check if student is actually assigned to this batch and belongs to correct branch
            if (Number(student.assigned_batch) === Number(batch.id) &&
              student.branch?.toLowerCase() === staff.branch?.toLowerCase() &&
              !uniqueBatchStudentsMap.has(student.id)) {
              const enrichedStudent = { ...(studentMap.get(student.id) || {}), ...student }
              uniqueBatchStudentsMap.set(student.id, enrichedStudent)
              uniqueStudentIdsForBatch.add(student.id)
            }
          })

          const filteredBatchStudents = Array.from(uniqueBatchStudentsMap.values())
          studentsMap[batch.id] = filteredBatchStudents
          totalUniqueStudents += filteredBatchStudents.length

          console.log(`Students for batch ${batch.batch_number}:`, filteredBatchStudents.length)
        }

        setBatchStudents(studentsMap)
        setTotalStudentsCount(uniqueStudentIdsForBatch.size) // Use unique count across batches
      } catch (err) {
        console.error('Error fetching staff data:', err)
        toast.error('Failed to load staff data')
      } finally {
        setLoading(false)
      }
    }

    if (staff?.id) {
      fetchStaffData()
    }
  }, [staff, students])

  useEffect(() => {
    if (!targetStudentId || !students.length) return
    const numericStudentId = Number(targetStudentId)
    const directStudent = students.find(item => Number(item.student?.id || item.id) === numericStudentId)
    if (!directStudent) return
    setSelectedStudent(directStudent)
    setViewMode('students')
    setModalOpen(true)
  }, [targetStudentId, students])

  useEffect(() => {
    if (loading || !targetStudentId || batches.length === 0) return
    const numericStudentId = Number(targetStudentId)
    const targetBatch = batches.find(batch => String(batch.id) === String(targetBatchId))
      || batches.find(batch => (batchStudents[batch.id] || []).some(student => Number(student.id) === numericStudentId))
    if (!targetBatch) return
    const targetStudent = (batchStudents[targetBatch.id] || []).find(student => Number(student.id) === numericStudentId)
    if (!targetStudent) return
    setSelectedBatch(targetBatch)
    setViewMode('students')
    setSelectedStudent(targetStudent)
    setModalOpen(true)
  }, [loading, targetStudentId, targetBatchId, batches, batchStudents])

  useEffect(() => {
    if (loading || targetStudentId || !targetBatchId || batches.length === 0) return
    const targetBatch = batches.find(batch => String(batch.id) === String(targetBatchId))
    if (!targetBatch) return
    setSelectedBatch(targetBatch)
    setViewMode('students')
    if (targetTab === 'attendance') {
      const firstStudent = (batchStudents[targetBatch.id] || [])[0]
      if (firstStudent) {
        setSelectedStudent(firstStudent)
        setModalOpen(true)
      }
    }
  }, [loading, targetStudentId, targetBatchId, targetTab, batches, batchStudents])

  const handleBatchClick = (batch) => {
    setSelectedBatch(batch)
    setViewMode('students')
  }

  const handleBackToBatches = () => {
    setViewMode('batches')
    setSelectedBatch(null)
  }

  const handleStudentClick = (student) => {
    setSelectedStudent(student)
    setModalOpen(true)
  }

  if (loading && batches.length === 0) {
    return <AdminSpin />
  }

  return (
    <div className="admin-root admin-fade">
      <AdminStyles />
      <div className="admin-crumb">
        <button className="admin-crumb-btn" onClick={() => window.location.reload()}><i className="fas fa-sitemap" style={{ marginRight: 5 }} />All Branches</button>
        <span className="admin-crumb-sep">/</span>
        <button className="admin-crumb-btn" onClick={onBack}><i className="fas fa-building" style={{ marginRight: 5 }} />{staff.branch}</button>
        <span className="admin-crumb-sep">/</span>
        <span style={{ color: T.navy, fontWeight: 600 }}>{staff.first_name} {staff.last_name}</span>
      </div>

      {/* Staff card */}
      <div className="admin-card" style={{ padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <AdminAvatar name={staff.first_name} size={56} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0, fontFamily: "'Playfair Display'" }}>{staff.first_name} {staff.last_name}</h4>
            <AdminBadge text={staff.branch} variant="primary" />
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: T.slate, flexWrap: 'wrap', marginTop: 8 }}>
            <span><i className="fas fa-id-card" style={{ marginRight: 6 }} />{staff.staff_id}</span>
            <span><i className="fas fa-briefcase" style={{ marginRight: 6 }} />{staff.designation}</span>
            <span><i className="fas fa-envelope" style={{ marginRight: 6 }} />{staff.email}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', background: T.white, borderRadius: 10, padding: '10px 18px', border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display'" }}>{batches.length}</div>
            <div style={{ fontSize: 11, color: T.slate }}>Batches</div>
          </div>
          <div style={{ textAlign: 'center', background: T.white, borderRadius: 10, padding: '10px 18px', border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display'" }}>{totalStudentsCount}</div>
            <div style={{ fontSize: 11, color: T.slate }}>Students</div>
          </div>
        </div>
      </div>

      {/* Back Button when in students view */}
      {viewMode === 'students' && (
        <button
          onClick={handleBackToBatches}
          className="admin-btn admin-btn-ghost"
          style={{ marginBottom: 20 }}
        >
          <i className="fas fa-arrow-left" /> Back to Batches
        </button>
      )}

      {/* Batches View - Show Batch Cards */}
      {viewMode === 'batches' && (
        <div className="admin-row-grid-2">
          {loading && batches.length === 0 ? (
            <div className="admin-card" style={{ padding: 40, textAlign: 'center', gridColumn: '1/-1' }}>
              <AdminSpin />
            </div>
          ) : batches.length === 0 ? (
            <div className="admin-card" style={{ padding: 40, textAlign: 'center', gridColumn: '1/-1' }}>
              <AdminEmpty msg={`No batches found for ${staff.branch} branch`} icon="fa-layer-group" />
              <div style={{ marginTop: 10, fontSize: 12, color: T.slate }}>
                Staff {staff.first_name} has no batches in {staff.branch} branch
              </div>
            </div>
          ) : (
            batches.map(batch => {
              const studentCount = batchStudents[batch.id]?.length || 0
              return (
                <div
                  key={batch.id}
                  onClick={() => handleBatchClick(batch)}
                  className="admin-card"
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
                        <AdminBadge text={`${studentCount} Students`} variant="info" />
                        <AdminBadge text={batch.branch} variant="primary" />
                        <AdminBadge text={batch.batch_timing || 'Timing'} variant="primary" />
                        <AdminBadge text={formatBatchDuration(batch)} variant="teal" />
                      </div>
                    </div>
                    <i className="fas fa-chevron-right" style={{ color: T.slateLight, fontSize: 14 }} />
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Students View - Show Students of Selected Batch */}
      {viewMode === 'students' && selectedBatch && (
        <div>
          {/* Batch Header */}
          <div className="admin-card" style={{ marginBottom: 20, padding: '16px 20px', background: `linear-gradient(135deg, ${T.navy}, ${T.navyMid})` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <i className="fas fa-layer-group" style={{ color: T.amber, fontSize: 20 }} />
              <div>
                <div style={{ fontWeight: 700, color: 'white', fontSize: 16 }}>{selectedBatch.batch_number}</div>
                <div style={{ fontSize: 12, color: T.slateLight, marginTop: 2 }}>
                  Duration: {formatBatchDuration(selectedBatch)}
                  <br />
                  {selectedBatch.batch_timing || '—'} • {selectedBatch.branch}
                </div>
              </div>
            </div>
          </div>

          {/* Students Grid */}
          <div className="admin-row-grid-2">
            {loading && !batchStudents[selectedBatch.id] ? (
              <div className="admin-card" style={{ padding: 40, textAlign: 'center', gridColumn: '1/-1' }}>
                <AdminSpin />
              </div>
            ) : (batchStudents[selectedBatch.id] || []).length === 0 ? (
              <div className="admin-card" style={{ padding: 40, textAlign: 'center', gridColumn: '1/-1' }}>
                <AdminEmpty msg={`No students in ${selectedBatch.branch} branch for this batch`} icon="fa-user-slash" />
              </div>
            ) : (
              (batchStudents[selectedBatch.id] || []).map(si => (
                <div
                  key={si.id}
                  onClick={() => handleStudentClick(si)}
                  className="admin-card"
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
                    <AdminAvatar name={si.first_name} size={44} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{si.first_name} {si.last_name}</div>
                      <div style={{ fontSize: 12, color: T.slate, marginBottom: 10 }}>{si.student_id} · {si.course}</div>
                      <AdminBadge text={si.branch} variant="primary" />
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        <AdminBadge text={`${si.test_count || 0} Tests`} variant="info" />
                        <AdminBadge text={`${si.quiz_count || 0} Quizzes`} variant="primary" />
                        <AdminBadge text={`${si.leaves_count || 0} Leaves`} variant="warning" />
                        <AdminBadge text={`${si.progress_percentage || 0}% Progress`} variant="success" />
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: T.slate }}>Progress:</span>
                          <div style={{ flex: 1, background: '#e9ecef', borderRadius: 4, height: 4 }}>
                            <div style={{ width: `${si.progress_percentage || 0}%`, background: T.sage, borderRadius: 4, height: 4 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600 }}>{si.progress_percentage || 0}%</span>
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
      <AdminStudentDetailModal
        open={modalOpen}
        student={selectedStudent}
        onClose={() => setModalOpen(false)}
        formatDate={formatDate}
        initialTab={targetTab}
      />
    </div>
  )
}

// ── ADMIN STUDENT DETAIL MODAL (Clean Design with Close Button) ─────────────────────────────────
function AdminStudentDetailModal({ open, student, onClose, formatDate, initialTab = 'overview' }) {
  const [modalTab, setModalTab] = useState(initialTab || 'overview')

  useEffect(() => {
    if (open) setModalTab(initialTab || 'overview')
  }, [open, initialTab])

  if (!open || !student) return null

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'fa-user' },
    { id: 'attendance', label: 'Attendance', icon: 'fa-calendar-check' },
    { id: 'tests', label: 'Tests', icon: 'fa-file-alt' },
    { id: 'quiz', label: 'Quizzes', icon: 'fa-question-circle' },
    { id: 'leaves', label: 'Leaves', icon: 'fa-calendar-minus' },
    { id: 'progress', label: 'Progress', icon: 'fa-chart-line' },
  ]

  // Get student data
  const studentName = student.student?.first_name || student.first_name || 'Student'
  const studentLastName = student.student?.last_name || student.last_name || ''
  const studentId = student.student?.student_id || student.student_id || '—'
  const studentCourse = student.student?.course || student.course || '—'
  const studentEmail = student.student?.email || student.email || '—'

  return (
    open && (
      <div style={{
        marginTop: 10,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }} onClick={onClose}>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          width: '90%',
          maxWidth: '900px',
          maxHeight: '85vh',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
        }} onClick={(e) => e.stopPropagation()}>

          {/* Header with Close Button */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e9ecef',
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1a2e4a' }}>
              <i className="fas fa-user-graduate" style={{ marginRight: '10px', color: '#f4a940' }} />
              Student Details: {studentName} {studentLastName}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#999',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0f0f0'
                e.currentTarget.style.color = '#333'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color = '#999'
              }}
            >
              ✕
            </button>
          </div>

          {/* Rest of your content remains the same */}
          {/* Content */}
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

            {/* Student Info Card */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e9ecef',
              marginBottom: '24px',
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f4a940, #e8843a)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'white',
              }}>
                {studentName[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f1b2d' }}>
                  {studentName} {studentLastName}
                </div>
                <div style={{ fontSize: '13px', color: '#8099b3', marginTop: '4px' }}>
                  <i className="fas fa-id-card" style={{ marginRight: '6px' }} />{studentId}
                  <span style={{ marginLeft: '16px' }}><i className="fas fa-graduation-cap" style={{ marginRight: '6px' }} />{studentCourse}</span>
                  <span style={{ marginLeft: '16px' }}><i className="fas fa-envelope" style={{ marginRight: '6px' }} />{studentEmail}</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex',
              gap: '4px',
              borderBottom: '2px solid #e9ecef',
              marginBottom: '24px',
              flexWrap: 'wrap',
            }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setModalTab(tab.id)}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13px',
                    fontWeight: modalTab === tab.id ? 600 : 500,
                    color: modalTab === tab.id ? '#f4a940' : '#8099b3',
                    cursor: 'pointer',
                    borderBottom: modalTab === tab.id ? '2px solid #f4a940' : '2px solid transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <i className={`fas ${tab.icon}`} style={{ marginRight: '8px' }} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>

              {/* Overview Tab */}
              {modalTab === 'overview' && (
                <div>
                  {/* Stats Cards - 4 in a row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '16px',
                    marginBottom: '24px',
                  }}>
                    {/* Attendance Card */}
                    <div style={{
                      background: '#fff',
                      borderRadius: '16px',
                      padding: '16px',
                      textAlign: 'center',
                      border: '1px solid #e9ecef',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(76,175,129,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px',
                      }}>
                        <i className="fas fa-calendar-check" style={{ fontSize: '24px', color: '#4caf81' }} />
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f1b2d' }}>
                        {student.attendance_percentage || 0}%
                      </div>
                      <div style={{ fontSize: '12px', color: '#8099b3', marginTop: '4px' }}>Attendance</div>
                      <div style={{ fontSize: '11px', color: '#b8ccdf', marginTop: '4px' }}>
                        {student.attendance_present || 0}/{student.attendance_total || 0} days
                      </div>
                    </div>

                    {/* Tests Card */}
                    <div style={{
                      background: '#fff',
                      borderRadius: '16px',
                      padding: '16px',
                      textAlign: 'center',
                      border: '1px solid #e9ecef',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(46,196,182,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px',
                      }}>
                        <i className="fas fa-file-alt" style={{ fontSize: '24px', color: '#2ec4b6' }} />
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f1b2d' }}>
                        {student.test_count || 0}
                      </div>
                      <div style={{ fontSize: '12px', color: '#8099b3', marginTop: '4px' }}>Tests Taken</div>
                      <div style={{ fontSize: '11px', color: '#b8ccdf', marginTop: '4px' }}>
                        Avg: {student.average_score || 0}%
                      </div>
                    </div>

                    {/* Quizzes Card */}
                    <div style={{
                      background: '#fff',
                      borderRadius: '16px',
                      padding: '16px',
                      textAlign: 'center',
                      border: '1px solid #e9ecef',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(244,169,64,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px',
                      }}>
                        <i className="fas fa-question-circle" style={{ fontSize: '24px', color: '#f4a940' }} />
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f1b2d' }}>
                        {student.quiz_count || 0}
                      </div>
                      <div style={{ fontSize: '12px', color: '#8099b3', marginTop: '4px' }}>Quizzes Taken</div>
                    </div>

                    {/* Progress Card */}
                    <div style={{
                      background: '#fff',
                      borderRadius: '16px',
                      padding: '16px',
                      textAlign: 'center',
                      border: '1px solid #e9ecef',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(232,72,85,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px',
                      }}>
                        <i className="fas fa-chart-line" style={{ fontSize: '24px', color: '#e84855' }} />
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f1b2d' }}>
                        {student.progress_percentage || 0}%
                      </div>
                      <div style={{ fontSize: '12px', color: '#8099b3', marginTop: '4px' }}>Progress</div>
                      <div style={{ fontSize: '11px', color: '#b8ccdf', marginTop: '4px' }}>
                        {student.sessions_completed || 0}/{student.total_sessions || 0} sessions
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Attendance Tab */}
              {modalTab === 'attendance' && (
                <div>
                  {student.attendance_records?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8099b3' }}>
                      <i className="fas fa-calendar-alt" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }} />
                      <p>No attendance records found</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e9ecef' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#0f1b2d' }}>Date</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#0f1b2d' }}>Status</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#0f1b2d' }}>Batch</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#0f1b2d' }}>Marked By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(student.attendance_records || []).map((a, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #e9ecef' }}>
                              <td style={{ padding: '10px 12px', fontSize: '12px', color: '#666' }}>{formatDate(a.date)}</td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{
                                  padding: '3px 10px',
                                  borderRadius: '20px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  background: a.status === 'Present' ? '#d4edda' : '#f8d7da',
                                  color: a.status === 'Present' ? '#155724' : '#721c24',
                                }}>{a.status}</span>
                              </td>
                              <td style={{ padding: '10px 12px', fontSize: '12px', color: '#666' }}>{a.batch_number}</td>
                              <td style={{ padding: '10px 12px', fontSize: '12px', color: '#8099b3' }}>{a.marked_by}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tests Tab */}
              {modalTab === 'tests' && (
                <div>
                  {student.test_results?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8099b3' }}>
                      <i className="fas fa-file-alt" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }} />
                      <p>No test results found</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Test Name</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Score</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Percentage</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Result</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(student.test_results || []).map((t, i) => {
                            let totalQuestions = t.total_questions || t.total_marks
                            if (!totalQuestions && t.score && t.percentage) {
                              totalQuestions = Math.round((t.score / t.percentage) * 100)
                            }
                            const scoreDisplay = totalQuestions ? `${t.score}/${totalQuestions}` : `${t.score}`
                            const percentage = t.percentage || 0
                            return (
                              <tr key={i} style={{ borderBottom: '1px solid #e9ecef' }}>
                                <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 500 }}>{t.test_name || t.test?.title || '—'}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>{scoreDisplay}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px' }}><strong>{percentage.toFixed(1)}%</strong></td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '3px 10px',
                                    borderRadius: '20px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    background: percentage >= 50 ? '#d4edda' : '#f8d7da',
                                    color: percentage >= 50 ? '#155724' : '#721c24',
                                  }}>{percentage >= 50 ? 'Pass' : 'Fail'}</span>
                                </td>
                                <td style={{ padding: '10px 12px', fontSize: '12px', color: '#666' }}>{formatDate(t.submitted_at)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Quizzes Tab */}
              {modalTab === 'quiz' && (
                <div>
                  {student.quiz_results?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8099b3' }}>
                      <i className="fas fa-question-circle" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }} />
                      <p>No quiz results found</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Quiz Name</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Score</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Percentage</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Result</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(student.quiz_results || []).map((q, i) => {
                            let totalMarks = q.total_marks
                            if (!totalMarks && q.score && q.percentage) {
                              totalMarks = Math.round((q.score / q.percentage) * 100)
                            }
                            const scoreDisplay = totalMarks ? `${q.score || 0}/${totalMarks}` : `${q.score || 0}`
                            const percentage = q.percentage || 0
                            return (
                              <tr key={i} style={{ borderBottom: '1px solid #e9ecef' }}>
                                <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 500 }}>{q.quiz_title || q.quiz?.title || '—'}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>{scoreDisplay}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px' }}><strong>{percentage.toFixed(1)}%</strong></td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '3px 10px',
                                    borderRadius: '20px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    background: percentage >= 50 ? '#d4edda' : '#f8d7da',
                                    color: percentage >= 50 ? '#155724' : '#721c24',
                                  }}>{percentage >= 50 ? 'Pass' : 'Fail'}</span>
                                </td>
                                <td style={{ padding: '10px 12px', fontSize: '12px', color: '#666' }}>{formatDate(q.submitted_at)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Leaves Tab */}
              {modalTab === 'leaves' && (
                <div>
                  {student.leave_requests?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8099b3' }}>
                      <i className="fas fa-calendar-alt" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }} />
                      <p>No leave requests found</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e9ecef' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Type</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>From</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>To</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Days</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Status</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(student.leave_requests || []).map((l, i) => {
                            let days = l.number_of_days || l.no_of_days || 0
                            if (days === 0 && l.start_date && l.end_date) {
                              const start = new Date(l.start_date)
                              const end = new Date(l.end_date)
                              days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
                            }
                            return (
                              <tr key={i} style={{ borderBottom: '1px solid #e9ecef' }}>
                                <td style={{ padding: '10px 12px' }}>
                                  <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: '#e4f2fd', color: '#1260a0' }}>{l.leave_type || '—'}</span>
                                </td>
                                <td style={{ padding: '10px 12px', fontSize: '12px' }}>{formatDate(l.start_date)}</td>
                                <td style={{ padding: '10px 12px', fontSize: '12px' }}>{formatDate(l.end_date)}</td>
                                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px' }}><strong>{days}</strong></td>
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '3px 10px',
                                    borderRadius: '20px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    background: l.status === 'approved' ? '#d4edda' : l.status === 'rejected' ? '#f8d7da' : '#fff3cd',
                                    color: l.status === 'approved' ? '#155724' : l.status === 'rejected' ? '#721c24' : '#856404',
                                  }}>{l.status || 'pending'}</span>
                                </td>
                                <td style={{ padding: '10px 12px', fontSize: '12px', color: '#666', maxWidth: '200px' }}>{l.reason || '—'}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Progress Tab */}
              {modalTab === 'progress' && (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#0f1b2d' }}>
                      <i className="fas fa-chart-simple" style={{ marginRight: '8px', color: '#4caf81' }} />
                      Sessions Completed
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1, background: '#e9ecef', borderRadius: '8px', height: '8px' }}>
                        <div style={{ width: `${student.progress_percentage || 0}%`, background: '#4caf81', borderRadius: '8px', height: '8px' }} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f1b2d' }}>{student.sessions_completed || 0}/{student.total_sessions || 0}</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#0f1b2d' }}>
                      <i className="fas fa-question-circle" style={{ marginRight: '8px', color: '#f4a940' }} />
                      Doubts Summary
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: '#fff3cd', color: '#856404' }}>
                        <i className="fas fa-question" style={{ marginRight: '6px' }} /> Raised: {student.doubts_count || 0}
                      </span>
                      <span style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: '#d4edda', color: '#155724' }}>
                        <i className="fas fa-check" style={{ marginRight: '6px' }} /> Resolved: {student.resolved_doubts || 0}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#0f1b2d' }}>
                      <i className="fas fa-clock" style={{ marginRight: '8px', color: '#8099b3' }} />
                      Last Activity
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{formatDate(student.last_activity)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  )
}



// ══════════════════════════════════════════════════════════════════════════════
// MATERIALS OVERVIEW - 3-level drill (Branch → Staff → Materials)
// ══════════════════════════════════════════════════════════════════════════════
export function AdminMaterialsOverview() {
  const [branches, setBranches] = useState([])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [staffMembers, setStaffMembers] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState('branches') // branches, staff, materials

  useEffect(() => {
    api.get('/admin/materials-overview/').then(r => setBranches(r.data.branches || []))
  }, [])

  const selectBranch = async (branch) => {
    setSelectedBranch(branch)
    setViewMode('staff')
    setLoading(true)
    try {
      // FIXED: Remove spaces from the URL
      const r = await api.get(`/admin/materials-overview/?branch=${branch}`)
      setStaffMembers(r.data.staff_members || [])
    } catch (err) {
      console.error('Error loading staff:', err)
      toast.error("Failed to load staff data")
    } finally {
      setLoading(false)
    }
  }

  const selectStaff = async (staff) => {
    setSelectedStaff(staff)
    setViewMode('materials')
    setLoading(true)
    try {
      // FIXED: Remove spaces from the URL
      const r = await api.get(`/admin/materials-overview/?branch=${selectedBranch}&staff_id=${staff.id}`)
      setMaterials(r.data.materials || [])
    } catch (err) {
      console.error('Error loading materials:', err)
      toast.error("Failed to load materials")
    } finally {
      setLoading(false)
    }
  }

  const goBackToStaff = () => {
    setViewMode('staff')
    setSelectedStaff(null)
    setMaterials([])
  }

  const goBackToBranches = () => {
    setViewMode('branches')
    setSelectedBranch('')
    setSelectedStaff(null)
    setStaffMembers([])
    setMaterials([])
  }

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

  // Breadcrumb navigation
  const Crumb = () => (
    <div className="admin-crumb">
      <button className="admin-crumb-btn" onClick={goBackToBranches}>
        <i className="fas fa-sitemap" style={{ marginRight: 5 }} />All Branches
      </button>
      {viewMode !== 'branches' && (
        <>
          <span className="admin-crumb-sep">/</span>
          <button className="admin-crumb-btn" onClick={goBackToStaff}>
            <i className="fas fa-building" style={{ marginRight: 5 }} />{selectedBranch}
          </button>
        </>
      )}
      {viewMode === 'materials' && selectedStaff && (
        <>
          <span className="admin-crumb-sep">/</span>
          <span style={{ color: T.navy, fontWeight: 600 }}>
            {selectedStaff.first_name} {selectedStaff.last_name || ''}
          </span>
        </>
      )}
    </div>
  )

  // LEVEL 1: Branches View
  if (viewMode === 'branches') {
    return (
      <div className="admin-root admin-fade">
        <AdminStyles />
        <AdminPageHeader title="🏢 Study Materials" sub="Select a branch to view staff and materials" />

        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <p style={{ color: T.slate, fontSize: 13, marginBottom: 14, fontWeight: 500 }}>Select a branch:</p>
          <div className="admin-row-grid-2">
            {branches.map(branch => (
              <div
                key={branch}
                onClick={() => selectBranch(branch)}
                className="admin-card"
                style={{
                  cursor: 'pointer',
                  padding: 20,
                  transition: 'all 0.2s ease',
                  border: `1px solid ${T.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.amber}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 13,
                  background: `linear-gradient(135deg, ${T.navyMid}, ${T.navyLight})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18
                }}>
                  <i className="fas fa-building" style={{ color: T.amber }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, textTransform: 'capitalize', marginBottom: 6 }}>{branch}</div>
                  <AdminBadge text="Click to view staff" variant="info" />
                </div>
                <i className="fas fa-chevron-right" style={{ color: T.slateLight, fontSize: 12 }} />
              </div>
            ))}
          </div>
          {branches.length === 0 && <AdminEmpty msg="No branches found" icon="fa-building" />}
        </div>
      </div>
    )
  }

  // LEVEL 2: Staff View
  if (viewMode === 'staff') {
    return (
      <div className="admin-root admin-fade">
        <AdminStyles />
        <Crumb />
        <AdminPageHeader title={`👨‍🏫 Staff - ${selectedBranch} Branch`} sub="Click on a staff member to view their uploaded materials" />

        <div className="admin-row-grid-2">
          {loading ? (
            <AdminSpin />
          ) : staffMembers.length === 0 ? (
            <div className="admin-card" style={{ padding: 40, textAlign: 'center', gridColumn: '1/-1' }}>
              <AdminEmpty msg="No staff members found in this branch" icon="fa-user-slash" />
            </div>
          ) : (
            staffMembers.map(staff => (
              <div
                key={staff.id}
                onClick={() => selectStaff(staff)}
                className="admin-card"
                style={{
                  cursor: 'pointer',
                  padding: 20,
                  transition: 'all 0.2s ease',
                  border: `1px solid ${T.border}`,
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.amber}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <AdminAvatar name={staff.first_name} size={50} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{staff.first_name} {staff.last_name || ''}</div>
                    <div style={{ fontSize: 12, color: T.slate, marginTop: 4 }}>{staff.designation}</div>
                    <div style={{ fontSize: 11, color: T.slateLight, marginTop: 2 }}>{staff.email}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <AdminBadge text={`${staff.material_count || 0} Materials`} variant={staff.material_count ? 'teal' : 'default'} />
                    <i className="fas fa-chevron-right" style={{ color: T.slateLight, marginTop: 8, display: 'block' }} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  // LEVEL 3: Materials View
  if (viewMode === 'materials') {
    return (
      <div className="admin-root admin-fade">
        <AdminStyles />
        <Crumb />

        {/* Staff Header */}
        <div className="admin-card" style={{ marginBottom: 20, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <AdminAvatar name={selectedStaff?.first_name} size={56} />
            <div>
              <h4 style={{ margin: 0, fontFamily: "'Playfair Display'" }}>
                {selectedStaff?.first_name} {selectedStaff?.last_name || ''}
              </h4>
              <div style={{ fontSize: 13, color: T.slate, marginTop: 4 }}>
                {selectedStaff?.designation} • {selectedStaff?.email}
              </div>
            </div>
          </div>
        </div>

        <AdminPageHeader
          title={`📚 Materials by ${selectedStaff?.first_name} ${selectedStaff?.last_name || ''}`}
          sub={`Branch: ${selectedBranch}`}
        />

        <div className="admin-card">
          <AdminSectionHeader title="Uploaded Materials" count={materials.length} />
          {loading ? (
            <AdminSpin />
          ) : materials.length === 0 ? (
            <AdminEmpty msg="No materials uploaded by this staff member" icon="fa-folder-open" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Batch</th>
                    <th>Description</th>
                    <th>Uploaded Date</th>
                    <th>Download</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m, i) => (
                    <tr key={m.id || i}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            background: `linear-gradient(135deg, ${T.rose}, ${T.rose}cc)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <i className={`fas ${fileIcon(m.file)}`} style={{ color: 'white', fontSize: 13 }} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{m.title}</div>
                          </div>
                        </div>
                      </td>
                      <td><AdminBadge text={m.batch_number || '—'} variant="info" /></td>
                      <td style={{ fontSize: 12, color: T.slate, maxWidth: 250 }}>{m.description || '—'}</td>
                      <td style={{ fontSize: 12, color: T.slate }}>{m.uploaded_at ? new Date(m.uploaded_at).toLocaleDateString('en-IN') : '—'}</td>
                      <td>
                        {m.file ? (
  <button
    type="button"
    className="admin-btn admin-btn-ghost admin-btn-sm"
    onClick={(e) => {
      e.preventDefault()
      e.stopPropagation()
      downloadMaterial(m)
    }}
  >
    <i className="fas fa-download" /> Download
  </button>
) : (
  <span style={{ color: T.slateLight, fontSize: 12 }}>—</span>
)}
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

  return null
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN COMPLETED STUDENTS - All branches (Using Admin Components)
// ══════════════════════════════════════════════════════════════════════════════
export function CompletedStudents() {
  const initialBranch = new URLSearchParams(window.location.search).get('branch') || ''
  const [students, setStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const normalizeFilterValue = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()
  const cleanFilterLabel = (value) => String(value || '').trim().replace(/\s+/g, ' ')
  const makeUniqueOptions = (items, getter) => {
    const options = new Map()
    items.forEach(item => {
      const label = cleanFilterLabel(getter(item))
      const key = normalizeFilterValue(label)
      if (key && !options.has(key)) options.set(key, label)
    })
    return Array.from(options.values()).sort((a, b) => a.localeCompare(b))
  }
  const sameFilterValue = (left, right) => normalizeFilterValue(left) === normalizeFilterValue(right)

  // Filter states
  const [filters, setFilters] = useState({
    branch: initialBranch,
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
    totalBatches: 0,
    totalBranches: 0
  })

  // Available filter options
  const [branches, setBranches] = useState([])
  const [batches, setBatches] = useState([])
  const [courses, setCourses] = useState([])

  useEffect(() => {
    loadCompletedStudents()
  }, [])

  // Function to fetch attendance for a single student
  const fetchStudentAttendance = async (studentId) => {
    try {
      // FIXED: Remove spaces from URL
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

  // Function to fetch test scores for a student
  const fetchStudentTestScores = async (studentId) => {
    try {
      // FIXED: Remove spaces from URL
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

  const loadCompletedStudents = async () => {
    setLoading(true)
    try {
      // FIXED: Remove spaces from URL - correct endpoint is /completed-students/
      const response = await api.get(`/completed-students/`)
      let data = response.data.results || response.data || []

      // Fetch attendance and test scores for each student
      const studentsWithData = await Promise.all(
        data.map(async (student) => {
          const originalStudentPk = /^\d+$/.test(String(student.original_student_id || ''))
            ? student.original_student_id
            : null
          const hasStoredAttendance = student.attendance_percentage != null && Number(student.attendance_percentage) > 0
          const attendance = hasStoredAttendance || !originalStudentPk
            ? {
                attendance_percentage: Math.round(Number(student.attendance_percentage || 0)),
                present_count: student.present_count || 0,
                total_attendance: student.total_attendance || 0,
              }
            : await fetchStudentAttendance(originalStudentPk)
          const avgScore = Math.round(Number(student.average_test_score || 0))

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

      const uniqueBranches = makeUniqueOptions(studentsWithData, s => s.branch)
      const uniqueBatches = makeUniqueOptions(studentsWithData, s => s.batch_number)
      const uniqueCourses = makeUniqueOptions(studentsWithData, s => s.course_name || s.course)

      setBranches(uniqueBranches)
      setBatches(uniqueBatches)
      setCourses(uniqueCourses)

      const totalSessions = studentsWithData.reduce((sum, s) => sum + (s.completed_sessions_count || s.total_sessions || 0), 0)
      setStats({
        totalGraduates: studentsWithData.length,
        totalSessions: totalSessions,
        totalBatches: uniqueBatches.length,
        totalBranches: uniqueBranches.length
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

    if (currentFilters.branch) {
      filtered = filtered.filter(s => sameFilterValue(s.branch, currentFilters.branch))
    }
    if (currentFilters.batch) {
      filtered = filtered.filter(s => sameFilterValue(s.batch_number, currentFilters.batch))
    }
    if (currentFilters.course) {
      filtered = filtered.filter(s => sameFilterValue(s.course_name || s.course, currentFilters.course))
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
        s.branch?.toLowerCase().includes(searchLower) ||
        s.faculty_name?.toLowerCase().includes(searchLower)
      )
    }

    setFilteredStudents(filtered)
    setCurrentPage(1)
  }

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    if (key === 'branch') {
      const url = new URL(window.location.href)
      if (value) url.searchParams.set('branch', value)
      else url.searchParams.delete('branch')
      window.history.replaceState(null, '', url)
    }
    applyFilters(students, newFilters)
  }

  const clearFilters = () => {
    const resetFilters = { branch: '', batch: '', course: '', dateFrom: '', dateTo: '', search: '' }
    setFilters(resetFilters)
    const url = new URL(window.location.href)
    url.searchParams.delete('branch')
    window.history.replaceState(null, '', url)
    applyFilters(students, resetFilters)
  }

  const downloadCompletedStudentsPdf = async () => {
    setDownloadingPdf(true)
    try {
      await downloadPdf('/completed-students/report/', {
        ...filters,
        branch: cleanFilterLabel(filters.branch),
        batch: cleanFilterLabel(filters.batch),
        course: cleanFilterLabel(filters.course),
        search: cleanFilterLabel(filters.search),
      }, 'completed_students_report.pdf')
      toast.success('Completed students PDF downloaded')
    } catch (err) {
      console.error('Completed students PDF error:', err)
      toast.error('Failed to download completed students PDF')
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
      <div className="admin-root admin-fade">
        <AdminStyles />
        <AdminSpin />
      </div>
    )
  }

  return (
    <div className="admin-root admin-fade">
      <AdminStyles />

      <AdminPageHeader
        title="🎓 Completed Students - All Branches"
        sub="Students who have successfully completed their courses across all branches"
        btn={<button className="admin-btn admin-btn-primary" onClick={downloadCompletedStudentsPdf} disabled={downloadingPdf}><i className={`fas ${downloadingPdf ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`} /> {downloadingPdf ? 'Downloading...' : 'Download PDF'}</button>}
      />

      {/* Statistics Cards */}
      <div className="admin-stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(76,175,129,0.1)', color: T.sage }}>
            <i className="fas fa-graduation-cap" />
          </div>
          <div>
            <div className="admin-stat-value">{stats.totalGraduates}</div>
            <div className="admin-stat-label">Total Graduates</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(244,169,64,0.1)', color: T.amber }}>
            <i className="fas fa-layer-group" />
          </div>
          <div>
            <div className="admin-stat-value">{stats.totalBatches}</div>
            <div className="admin-stat-label">Batches</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(15,27,45,0.1)', color: T.navy }}>
            <i className="fas fa-building" />
          </div>
          <div>
            <div className="admin-stat-value">{stats.totalBranches}</div>
            <div className="admin-stat-label">Branches</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: `1px solid ${T.border}`, display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <input
            className="admin-input"
            style={{ padding: '6px 10px', fontSize: '12px', width: '200px' }}
            placeholder="🔍 Search by name, ID, staff..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
          <select
            className="admin-select"
            style={{ padding: '6px 10px', fontSize: '12px', width: '130px' }}
            value={filters.branch}
            onChange={(e) => handleFilterChange('branch', e.target.value)}
          >
            <option value="">All Branches</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select
            className="admin-select"
            style={{ padding: '6px 10px', fontSize: '12px', width: '130px' }}
            value={filters.batch}
            onChange={(e) => handleFilterChange('batch', e.target.value)}
          >
            <option value="">All Batches</option>
            {batches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select
            className="admin-select"
            style={{ padding: '6px 10px', fontSize: '12px', width: '130px' }}
            value={filters.course}
            onChange={(e) => handleFilterChange('course', e.target.value)}
          >
            <option value="">All Courses</option>
            {courses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="date"
            className="admin-input"
            style={{ padding: '6px 10px', fontSize: '12px', width: '130px' }}
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
          />
          <span style={{ fontSize: '12px', color: T.slate }}>to</span>
          <input
            type="date"
            className="admin-input"
            style={{ padding: '6px 10px', fontSize: '12px', width: '130px' }}
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
          />
          <button
            className="admin-btn admin-btn-sm admin-btn-ghost"
            onClick={clearFilters}
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            <i className="fas fa-times" /> Clear
          </button>
        </div>
      </div>

      {/* Completed Students Table */}
      <div className="admin-card">
        <div className="admin-card-header" style={{ background: `linear-gradient(135deg, ${T.sage}, ${T.sage}cc)`, color: 'white' }}>
          <h5 style={{ color: 'white', margin: 0 }}>
            <i className="fas fa-graduation-cap" style={{ marginRight: 8 }} /> Graduated Students - All Branches
          </h5>
          <AdminBadge text={`${filteredStudents.length} Records`} variant="success" />
        </div>

        {filteredStudents.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <i className="fas fa-graduation-cap" style={{ fontSize: 48, color: T.slate, marginBottom: 16, opacity: 0.3 }} />
            <h4 style={{ color: T.slate }}>No completed students found</h4>
            <p style={{ color: T.slateLight }}>Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
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
                            <AdminAvatar name={x.first_name} size={28} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '12px' }}>{x.first_name} {x.last_name || ''}</div>
                              <div style={{ fontSize: '9px', color: T.slate }}>{x.email?.split('@')[0] || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}><AdminBadge text={x.student_id} variant="info" /></td>
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          <AdminBadge text={staffName} variant="primary" />
                        </td>
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}><AdminBadge text={x.batch_number} variant="default" /></td>
                        <td style={{ padding: '10px 8px', fontSize: '11px' }}>
                          <div><strong>{x.course_name || x.course || '—'}</strong></div>
                          <div style={{ fontSize: '9px', color: T.slate, marginTop: 2 }}>{x.branch || '—'}</div>
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
                          <AdminBadge text={new Date(x.completion_date).toLocaleDateString('en-IN')} variant="success" />
                        </td>

                        {/* UPDATED ATTENDANCE COLUMN - Shows detailed attendance */}
                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          {attendancePercentage > 0 ? (
                            <div>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                <div style={{ width: '60px', background: '#e9ecef', borderRadius: '4px', height: '6px' }}>
                                  <div style={{
                                    height: '100%',
                                    width: `${attendancePercentage}%`,
                                    background: attendancePercentage >= 75 ? T.sage : attendancePercentage >= 60 ? T.amber : T.rose,
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
                            <AdminBadge text="Not Marked" variant="warning" />
                          )}
                        </td>

                        <td style={{ padding: '10px 8px', fontSize: '11px', textAlign: 'center' }}>
                          <AdminBadge
                            text={`${avgScore}%`}
                            variant={avgScore >= 70 ? 'success' : avgScore >= 50 ? 'warning' : 'danger'}
                          />
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <button
                            className="admin-btn admin-btn-success admin-btn-sm"
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
                <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => goToPage(1)} disabled={currentPage === 1} style={{ padding: '4px 8px' }}>
                  <i className="fas fa-angle-double-left" />
                </button>
                <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} style={{ padding: '4px 8px' }}>
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
                      className={`admin-btn ${currentPage === pageNum ? 'admin-btn-primary' : 'admin-btn-ghost'} admin-btn-sm`}
                      onClick={() => goToPage(pageNum)}
                      style={{ padding: '4px 8px', minWidth: '28px' }}
                    >
                      {pageNum}
                    </button>
                  )
                })}

                <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} style={{ padding: '4px 8px' }}>
                  <i className="fas fa-angle-right" />
                </button>
                <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} style={{ padding: '4px 8px' }}>
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
export function AdminAssignedStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/students/').then(r => setStudents((r.data.results || r.data).filter(x => x.assigned_staff))).finally(() => setLoading(false))
  }, [])

  const filtered = students.filter(x => `${x.first_name} ${x.last_name} ${x.student_id}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="admin-root admin-fade">
      <AdminStyles />
      <AdminPageHeader title="👤 Assigned Students" sub="Students currently assigned to trainers" />
      <div className="admin-card">
        <div className="admin-card-header" style={{ justifyContent: 'space-between' }}>
          <h5>Assigned ({filtered.length})</h5>
          <input className="admin-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 220 }} />
        </div>
        {loading ? <AdminSpin /> : filtered.length === 0 ? (
          <AdminEmpty msg="No assigned students" icon="fa-user-slash" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Branch</th>
                  <th>Trainer</th>
                  <th>Batch</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((x, i) => (
                  <tr key={x.id}>
                    <td style={{ color: T.slate, fontSize: 12 }}>{i + 1}</td>
                    <td>
                      <div className="admin-person-cell">
                        <AdminAvatar name={x.first_name} size={34} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{x.first_name} {x.last_name}</div>
                          <div style={{ fontSize: 11, color: T.slate }}>{x.student_id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{x.course}</td>
                    <td><AdminBadge text={x.branch} variant="info" /></td>
                    <td><AdminBadge text={x.assigned_staff_name || '—'} variant="teal" /></td>
                    <td style={{ fontSize: 12 }}>{x.assigned_batch_number || '—'}</td>
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
// VIEW MENTORS
// ══════════════════════════════════════════════════════════════════════════════
export function ViewMentors() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [branch, setBranch] = useState('')

  useEffect(() => {
   setLoading(true)

api.get(`/employees/${branch ? `?branch=${branch}` : ''}`)
  .then(r => setEmployees(r.data.results || r.data))
  .finally(() => setLoading(false))

}, [branch])

  const filtered = employees.filter(e => `${e.first_name} ${e.last_name} ${e.staff_id} ${e.designation} ${e.email} `.toLowerCase().includes(search.toLowerCase()))
  const desigVariant = { counselor: 'info', trainer: 'teal', mentor: 'warning', hr: 'default' }

  return (
    <div className="admin-root admin-fade">
      <AdminStyles />
      <AdminPageHeader title="👨‍🏫 Mentors & Staff" sub="All employees across branches" />
      <div className="admin-card">
        <div className="admin-card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <h5>All Employees ({filtered.length})</h5>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="admin-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
            <select className="admin-select" value={branch} onChange={e => setBranch(e.target.value)} style={{ width: 150 }}>
              <option value="">All Branches</option>
              <option value="100ft">100ft</option>
              <option value="hopes">Hopes</option>
              <option value="kuniyamuthur">Kuniyamuthur</option>
            </select>
          </div>
        </div>
        {loading ? <AdminSpin /> : filtered.length === 0 ? (
          <AdminEmpty msg="No employees found" icon="fa-user-slash" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead><tr><th>#</th><th>Employee</th><th>Email</th><th>Mobile</th><th>Designation</th><th>Branch</th><th>Gender</th></tr></thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.id}>
                    <td style={{ color: T.slate, fontSize: 12 }}>{i + 1}</td>
                    <td>
                      <div className="admin-person-cell">
                        <AdminAvatar name={m.first_name} size={34} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{m.first_name} {m.last_name || ''}</div>
                          <div style={{ fontSize: 11, color: T.slate }}>{m.staff_id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: T.slate }}>{m.email}</td>
                    <td style={{ fontSize: 13 }}>{m.mobile_no}</td>
                    <td><AdminBadge text={m.designation} variant={desigVariant[m.designation] || 'default'} /></td>
                    <td style={{ fontSize: 13 }}>{m.branch}</td>
                    <td style={{ fontSize: 13 }}>{m.gender}</td>
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
// QUIZ / TEST RESULTS
// ══════════════════════════════════════════════════════════════════════════════
export function QuizResults() {
  const [results, setResults] = useState([])
  const [publicResults, setPublicResults] = useState([])
  const [activeSegment, setActiveSegment] = useState('students')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/quiz/staff-results/')
      .then(x => {
        const data = x.data || {}
        const practiceResults = data.public_results || []
        setResults(practiceResults.filter(result => result.audience === 'student'))
        setPublicResults(practiceResults.filter(result => result.audience !== 'student'))
      })
      .catch(() => toast.error('Failed to load quiz results'))
      .finally(() => setLoading(false))
  }, [])

  const formatPercent = (value) => Number(value || 0).toFixed(1)
  const activeCount = activeSegment === 'students' ? results.length : publicResults.length

  return (
    <div className="admin-root admin-fade">
      <AdminStyles />
      <AdminPageHeader title="Quiz Results" sub="Practice test attended results" />
      <div className="admin-card">
        <div style={{ padding: '14px 16px 0', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`admin-tab ${activeSegment === 'students' ? 'active' : ''}`}
              onClick={() => setActiveSegment('students')}
            >
              Our Students ({results.length})
            </button>
            <button
              type="button"
              className={`admin-tab ${activeSegment === 'public' ? 'active' : ''}`}
              onClick={() => setActiveSegment('public')}
            >
              Public Users ({publicResults.length})
            </button>
          </div>
        </div>
        <AdminSectionHeader title={activeSegment === 'students' ? 'Our Students' : 'Public Users'} count={activeCount} />
        {loading ? <AdminSpin /> : activeSegment === 'students' && results.length === 0 ? (
          <AdminEmpty msg="No practice test results yet" icon="fa-chart-bar" />
        ) : activeSegment === 'public' && publicResults.length === 0 ? (
          <AdminEmpty msg="No public practice test results yet" icon="fa-chart-bar" />
        ) : activeSegment === 'students' ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead><tr><th>Student</th><th>Quiz</th><th>Score</th><th>Percentage</th><th>Result</th><th>Submitted</th></tr></thead>
              <tbody>
                {results.map(x => (
                  <tr key={x.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{x.student_name || '-'}</td>
                    <td style={{ fontSize: 13 }}>{x.quiz_title || '-'}</td>
                    <td style={{ fontWeight: 600 }}>{Number(x.score || 0)} / {Number(x.total_marks || 0)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: T.border, borderRadius: 3, minWidth: 60 }}>
                          <div style={{ height: '100%', width: `${Math.min(Number(x.percentage || 0), 100)}%`, background: x.is_passed ? T.sage : T.rose, borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{formatPercent(x.percentage)}%</span>
                      </div>
                    </td>
                    <td><AdminBadge text={x.is_passed ? 'Passed' : 'Failed'} variant={x.is_passed ? 'success' : 'danger'} /></td>
                    <td style={{ fontSize: 12, color: T.slate }}>{x.submitted_at ? new Date(x.submitted_at).toLocaleDateString('en-IN') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : renderPublicQuizResults(publicResults, formatPercent)}
      </div>
    </div>
  )
}

function renderPublicQuizResults(publicResults, formatPercent) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="admin-table">
        <thead><tr><th>Name</th><th>Email ID</th><th>Mobile No</th><th>Result</th><th>Percentage</th></tr></thead>
        <tbody>
          {publicResults.map(x => (
            <tr key={x.id}>
              <td style={{ fontWeight: 600, fontSize: 13 }}>{x.name || x.student_name || x.username || '-'}</td>
              <td style={{ fontSize: 13 }}>{x.email || '-'}</td>
              <td style={{ fontSize: 13 }}>{x.mobile || '-'}</td>
              <td><AdminBadge text={x.is_passed ? 'Passed' : 'Failed'} variant={x.is_passed ? 'success' : 'danger'} /></td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: T.border, borderRadius: 3, minWidth: 60 }}>
                    <div style={{ height: '100%', width: `${Math.min(Number(x.percentage || 0), 100)}%`, background: x.is_passed ? T.sage : T.rose, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{formatPercent(x.percentage)}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AdminTestResults() { return <QuizResults /> }

// ══════════════════════════════════════════════════════════════════════════════
// STAFF DOUBTS
// ══════════════════════════════════════════════════════════════════════════════
export function StaffDoubts() {
  const [doubts, setDoubts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/sessions/staff-doubts/').then(r => setDoubts(r.data)).finally(() => setLoading(false))
  }, [])

  return (
    <div className="admin-root admin-fade">
      <AdminStyles />
      <AdminPageHeader title="❓ Student Doubts" sub="Doubts raised by students on sessions" />
      <div className="admin-card">
        <AdminSectionHeader title="All Doubts" count={doubts.length} />
        {loading ? <AdminSpin /> : doubts.length === 0 ? (
          <AdminEmpty msg="No doubts raised" icon="fa-question-circle" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead><tr><th>Student</th><th>ID</th><th>Session</th><th>Status</th></tr></thead>
              <tbody>
                {doubts.map(x => (
                  <tr key={x.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{x.student_name}</td>
                    <td><AdminBadge text={x.student_id} variant="info" /></td>
                    <td style={{ fontSize: 13 }}>Session {x.session_number}: {x.session_title}</td>
                    <td><AdminBadge text="Doubt Raised" variant="warning" /></td>
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

export function AdminSupportRequests() { return <AdminMentorSupportRequest /> }

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN ANNOUNCEMENTS - Complete with Checkboxes (Multiple Audience Selection)
// ══════════════════════════════════════════════════════════════════════════════

// Modal Component - No Background Overlay
function AdminModal({ open, onClose, title, children, size = 'sm' }) {
  if (!open) return null

  const maxW = { sm: 460, md: 600, lg: 820, xl: 960 }[size] || 460

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        background: 'rgba(15,23,42,.28)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: maxW,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          pointerEvents: 'auto',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid #e9ecef',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h5 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1a2e4a' }}>
            {title}
          </h5>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#666',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showViewModal, setShowViewModal] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: '',
    message: '',
    announcement_type: 'general',
    recipient_type: 'all',
    is_published: true
  })

  // Audience selection (multiple checkboxes)
  const [audience, setAudience] = useState({
    students: true,
    mentors: true,
    counselors: true
  })

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    setLoading(true)
    try {
      const response = await api.get('/announcements/')
      const data = response.data.results || response.data || []
      setAnnouncements(data)
    } catch (err) {
      console.error("Error loading announcements:", err)
      toast.error("Failed to load announcements")
    } finally {
      setLoading(false)
    }
  }

  const handleAudienceChange = (type, checked) => {
    const newAudience = { ...audience, [type]: checked }
    setAudience(newAudience)

    // Determine recipient_type based on selections
    const students = newAudience.students
    const mentors = newAudience.mentors
    const counselors = newAudience.counselors

    if (students && mentors && counselors) {
      setForm(prev => ({ ...prev, recipient_type: 'all' }))
    } else if (students && !mentors && !counselors) {
      setForm(prev => ({ ...prev, recipient_type: 'students' }))
    } else if (!students && mentors && !counselors) {
      setForm(prev => ({ ...prev, recipient_type: 'mentors' }))
    } else if (!students && !mentors && counselors) {
      setForm(prev => ({ ...prev, recipient_type: 'counselors' }))
    } else if (!students && mentors && counselors) {
      setForm(prev => ({ ...prev, recipient_type: 'staff' }))
    } else {
      setForm(prev => ({ ...prev, recipient_type: 'specific' }))
    }
  }

  const handleSelectAll = () => {
    setAudience({
      students: true,
      mentors: true,
      counselors: true
    })
    setForm(prev => ({ ...prev, recipient_type: 'all' }))
  }

  const resetForm = () => {
    setForm({
      title: '',
      message: '',
      announcement_type: 'general',
      recipient_type: 'all',
      is_published: true
    })
    setAudience({
      students: true,
      mentors: true,
      counselors: true
    })
  }

  const handleCreate = async (e) => {
    e.preventDefault()

    if (!form.title.trim()) {
      toast.error("Please enter a title")
      return
    }
    if (!form.message.trim()) {
      toast.error("Please enter a message")
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title,
        message: form.message,
        announcement_type: form.announcement_type,
        recipient_type: form.recipient_type,
        is_published: form.is_published,
        send_to_students: audience.students,
        send_to_mentors: audience.mentors,
        send_to_counselors: audience.counselors
      }

      await api.post('/announcements/create/', payload)
      toast.success(form.is_published ? "Announcement published!" : "Announcement saved as draft!")

      resetForm()
      setShowCreateModal(false)
      loadAnnouncements()
    } catch (err) {
      console.error("Create error:", err)
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || "Failed to create announcement"
      toast.error(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (announcement) => {
    // Populate form with announcement data
    setForm({
      title: announcement.title,
      message: announcement.message,
      announcement_type: announcement.announcement_type,
      recipient_type: announcement.recipient_type,
      is_published: announcement.is_published
    })

    // Parse audience from recipient_type
    const recipient = announcement.recipient_type
    setAudience({
      students: recipient === 'all' || recipient === 'students',
      mentors: recipient === 'all' || recipient === 'mentors' || recipient === 'staff',
      counselors: recipient === 'all' || recipient === 'counselors' || recipient === 'staff'
    })

    setShowEditModal(announcement)
  }

  // FIXED: Corrected URL - no spaces
  const handleUpdate = async (e) => {
    e.preventDefault()

    if (!form.title.trim()) {
      toast.error("Please enter a title")
      return
    }
    if (!form.message.trim()) {
      toast.error("Please enter a message")
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title,
        message: form.message,
        announcement_type: form.announcement_type,
        recipient_type: form.recipient_type,
        is_published: form.is_published,
        send_to_students: audience.students,
        send_to_mentors: audience.mentors,
        send_to_counselors: audience.counselors
      }

      const response = await api.patch(`/announcements/${showEditModal.id}/update/`, payload)

      toast.success("Announcement updated successfully!")
      resetForm()
      setShowEditModal(null)
      loadAnnouncements()
    } catch (err) {
      console.error("Update error:", err)
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || "Failed to update announcement"
      toast.error(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  // FIXED: Corrected URL - no spaces
  const handleTogglePublish = async (id) => {
    try {
      const response = await api.patch(`/announcements/${id}/toggle-publish/`)
      toast.success(`Announcement ${response.data.is_published ? 'published' : 'unpublished'}`)
      loadAnnouncements()
    } catch (err) {
      console.error("Toggle publish error:", err)
      toast.error("Failed to update status")
    }
  }

  // FIXED: Corrected URL - no spaces
  const handleDelete = async (id) => {
    try {
      await api.delete(`/announcements/${id}/delete/`)
      toast.success("Announcement deleted!")
      setShowDeleteModal(null)
      loadAnnouncements()
    } catch (err) {
      console.error("Delete error:", err)
      toast.error("Failed to delete announcement")
    }
  }

  const getTypeBadge = (type) => {
    const types = {
      important: { bg: '#fdeaec', color: '#e84855', label: 'Important', icon: 'fa-exclamation-triangle' },
      holiday: { bg: '#fef5e4', color: '#f4a940', label: 'Holiday', icon: 'fa-umbrella-beach' },
      event: { bg: '#e8f8f0', color: '#4caf81', label: 'Event', icon: 'fa-calendar-star' },
      update: { bg: '#e4f2fd', color: '#2ec4b6', label: 'Update', icon: 'fa-sync-alt' },
      general: { bg: '#f0f3f7', color: '#8099b3', label: 'General', icon: 'fa-bullhorn' },
      exam: { bg: '#e4f2fd', color: '#1a2e4a', label: 'Exam', icon: 'fa-file-alt' },
      course: { bg: '#e8f8f0', color: '#4caf81', label: 'Course', icon: 'fa-book-open' }
    }
    const t = types[type] || types.general
    return (
      <span style={{ background: t.bg, color: t.color, padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <i className={`fas ${t.icon}`} style={{ fontSize: 11 }} />
        {t.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="admin-root admin-fade">
        <AdminStyles />
        <AdminSpin />
      </div>
    )
  }

  return (
    <div className="admin-root admin-fade">
      <AdminStyles />

      <AdminPageHeader
        title="📢 Announcements"
        sub="Manage and create announcements for students and staff"
        btn={
          <button className="admin-btn admin-btn-primary" onClick={() => setShowCreateModal(true)}>
            <i className="fas fa-plus" /> Create Announcement
          </button>
        }
      />

      {/* Statistics Cards */}
      <div className="admin-stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(46,196,182,0.1)', color: '#2ec4b6' }}>
            <i className="fas fa-bullhorn" />
          </div>
          <div>
            <div className="admin-stat-value">{announcements.length}</div>
            <div className="admin-stat-label">Total</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(76,175,129,0.1)', color: '#4caf81' }}>
            <i className="fas fa-check-circle" />
          </div>
          <div>
            <div className="admin-stat-value">{announcements.filter(a => a.is_published).length}</div>
            <div className="admin-stat-label">Published</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(244,169,64,0.1)', color: '#f4a940' }}>
            <i className="fas fa-eye-slash" />
          </div>
          <div>
            <div className="admin-stat-value">{announcements.filter(a => !a.is_published).length}</div>
            <div className="admin-stat-label">Drafts</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(232,72,85,0.1)', color: '#e84855' }}>
            <i className="fas fa-exclamation-triangle" />
          </div>
          <div>
            <div className="admin-stat-value">{announcements.filter(a => a.announcement_type === 'important').length}</div>
            <div className="admin-stat-label">Important</div>
          </div>
        </div>
      </div>

      {/* Announcements Table */}
      <div className="admin-card">
        <div className="admin-card-header" style={{ background: `linear-gradient(135deg, #1a2e4a, #243b55)`, color: 'white' }}>
          <h5 style={{ color: 'white', margin: 0 }}>
            <i className="fas fa-list" style={{ marginRight: 8 }} /> All Announcements
          </h5>
          <span style={{ background: '#4caf81', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '11px' }}>{announcements.length} Records</span>
        </div>

        {announcements.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f0f3f7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <i className="fas fa-bullhorn" style={{ fontSize: 36, color: '#8099b3' }} />
            </div>
            <h4 style={{ color: '#8099b3' }}>No Announcements Yet</h4>
            <p style={{ color: '#b8ccdf' }}>Create your first announcement to share with students and staff.</p>
            <button className="admin-btn admin-btn-primary" onClick={() => setShowCreateModal(true)}>
              <i className="fas fa-plus" /> Create Announcement
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Audience</th>
                  <th style={{ width: 110 }}>Date</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((ann, idx) => (
                  <tr key={ann.id}>
                    <td style={{ color: '#8099b3', fontSize: 12 }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ann.title}</div>
                      <div style={{ fontSize: 11, color: '#8099b3', marginTop: 4, maxWidth: 300 }}>
                        {ann.message?.substring(0, 60)}...
                      </div>
                    </td>
                    <td>{getTypeBadge(ann.announcement_type)}</td>
                    <td>
                      <span style={{ background: '#e4f2fd', color: '#1260a0', padding: '4px 10px', borderRadius: '20px', fontSize: '11px' }}>
                        {ann.recipient_type}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{new Date(ann.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span style={{ background: ann.is_published ? '#e8f8f0' : '#f0f3f7', color: ann.is_published ? '#4caf81' : '#8099b3', padding: '4px 12px', borderRadius: '20px', fontSize: '11px' }}>
                        {ann.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setShowViewModal(ann)} title="View" style={{ padding: '6px 10px' }}>
                          <i className="fas fa-eye" />
                        </button>
                        <button className="admin-btn admin-btn-primary admin-btn-sm" onClick={() => handleEdit(ann)} title="Edit" style={{ padding: '6px 10px' }}>
                          <i className="fas fa-edit" />
                        </button>
                        <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => setShowDeleteModal(ann)} title="Delete" style={{ padding: '6px 10px' }}>
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

      {/* ========== CREATE ANNOUNCEMENT MODAL ========== */}
      <AdminModal open={showCreateModal} onClose={() => { resetForm(); setShowCreateModal(false); }} title="Create New Announcement" size="md">
        <form onSubmit={handleCreate}>
          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Title <span style={{ color: '#e84855' }}>*</span></label>
            <input
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 14 }}
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter announcement title"
              required
            />
          </div>

          {/* Type */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Type</label>
            <select
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 14 }}
              value={form.announcement_type}
              onChange={(e) => setForm(prev => ({ ...prev, announcement_type: e.target.value }))}
            >
              <option value="general">📢 General Announcement</option>
              <option value="important">⚠️ Important Notice</option>
              <option value="update">🔄 System Update</option>
              <option value="holiday">🎉 Holiday Notice</option>
              <option value="event">🎯 Event Announcement</option>
              <option value="exam">📝 Exam Schedule</option>
              <option value="course">📚 Course Related</option>
            </select>
          </div>

          {/* Audience */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 10, fontWeight: 600, fontSize: 13 }}>Audience (Select multiple)</label>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={audience.students}
                  onChange={(e) => handleAudienceChange('students', e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span><i className="fas fa-user-graduate" style={{ marginRight: 6, color: '#4caf81' }} /> Students</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={audience.mentors}
                  onChange={(e) => handleAudienceChange('mentors', e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span><i className="fas fa-chalkboard-teacher" style={{ marginRight: 6, color: '#f4a940' }} /> Mentors</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={audience.counselors}
                  onChange={(e) => handleAudienceChange('counselors', e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span><i className="fas fa-user-tie" style={{ marginRight: 6, color: '#2ec4b6' }} /> Counselors</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleSelectAll}
              style={{ background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer', marginTop: 8 }}
            >
              <i className="fas fa-check-double" style={{ marginRight: 4 }} /> Select All
            </button>

            <div style={{ marginTop: 12, padding: '8px 12px', background: '#e4f2fd', borderRadius: '8px', fontSize: 12 }}>
              <i className="fas fa-info-circle" style={{ marginRight: 6, color: '#1260a0' }} />
              Selected: {[
                audience.students && 'Students',
                audience.mentors && 'Mentors',
                audience.counselors && 'Counselors'
              ].filter(Boolean).join(', ') || 'None'}
            </div>
          </div>

          {/* Publish Option */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm(prev => ({ ...prev, is_published: e.target.checked }))}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Publish immediately</span>
            </label>
            <small style={{ fontSize: 11, color: '#8099b3', marginLeft: 24, display: 'block' }}>
              When checked, the announcement will be visible to selected audiences immediately.
            </small>
          </div>

          {/* Message */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Message <span style={{ color: '#e84855' }}>*</span></label>
            <textarea
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
              rows={5}
              value={form.message}
              onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Type your announcement message here..."
              required
            />
            <div style={{ textAlign: 'right', fontSize: 11, color: '#8099b3', marginTop: 4 }}>
              {form.message.length} characters
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid #e9ecef' }}>
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              onClick={() => { resetForm(); setShowCreateModal(false); }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create Announcement'}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* ========== EDIT ANNOUNCEMENT MODAL ========== */}
      <AdminModal open={showEditModal} onClose={() => { resetForm(); setShowEditModal(null); }} title="Edit Announcement" size="md">
        <form onSubmit={handleUpdate}>
          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Title <span style={{ color: '#e84855' }}>*</span></label>
            <input
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 14 }}
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter announcement title"
              required
            />
          </div>

          {/* Type */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Type</label>
            <select
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 14 }}
              value={form.announcement_type}
              onChange={(e) => setForm(prev => ({ ...prev, announcement_type: e.target.value }))}
            >
              <option value="general">📢 General Announcement</option>
              <option value="important">⚠️ Important Notice</option>
              <option value="update">🔄 System Update</option>
              <option value="holiday">🎉 Holiday Notice</option>
              <option value="event">🎯 Event Announcement</option>
              <option value="exam">📝 Exam Schedule</option>
              <option value="course">📚 Course Related</option>
            </select>
          </div>

          {/* Audience */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 10, fontWeight: 600, fontSize: 13 }}>Audience (Select multiple)</label>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={audience.students}
                  onChange={(e) => handleAudienceChange('students', e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span><i className="fas fa-user-graduate" style={{ marginRight: 6, color: '#4caf81' }} /> Students</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={audience.mentors}
                  onChange={(e) => handleAudienceChange('mentors', e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span><i className="fas fa-chalkboard-teacher" style={{ marginRight: 6, color: '#f4a940' }} /> Mentors</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={audience.counselors}
                  onChange={(e) => handleAudienceChange('counselors', e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                <span><i className="fas fa-user-tie" style={{ marginRight: 6, color: '#2ec4b6' }} /> Counselors</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleSelectAll}
              style={{ background: 'transparent', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', cursor: 'pointer', marginTop: 8 }}
            >
              <i className="fas fa-check-double" style={{ marginRight: 4 }} /> Select All
            </button>

            <div style={{ marginTop: 12, padding: '8px 12px', background: '#e4f2fd', borderRadius: '8px', fontSize: 12 }}>
              <i className="fas fa-info-circle" style={{ marginRight: 6, color: '#1260a0' }} />
              Selected: {[
                audience.students && 'Students',
                audience.mentors && 'Mentors',
                audience.counselors && 'Counselors'
              ].filter(Boolean).join(', ') || 'None'}
            </div>
          </div>

          {/* Publish Option */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm(prev => ({ ...prev, is_published: e.target.checked }))}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Publish immediately</span>
            </label>
            <small style={{ fontSize: 11, color: '#8099b3', marginLeft: 24, display: 'block' }}>
              When checked, the announcement will be visible to selected audiences immediately.
            </small>
          </div>

          {/* Message */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Message <span style={{ color: '#e84855' }}>*</span></label>
            <textarea
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
              rows={5}
              value={form.message}
              onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Type your announcement message here..."
              required
            />
            <div style={{ textAlign: 'right', fontSize: 11, color: '#8099b3', marginTop: 4 }}>
              {form.message.length} characters
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid #e9ecef' }}>
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              onClick={() => { resetForm(); setShowEditModal(null); }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={saving}
            >
              {saving ? 'Updating...' : 'Update Announcement'}
            </button>
          </div>
        </form>
      </AdminModal>

      {/* ========== VIEW ANNOUNCEMENT MODAL ========== */}
      <AdminModal open={showViewModal} onClose={() => setShowViewModal(null)} title="Announcement Details" size="md">
        {showViewModal && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Title</label>
              <div style={{ padding: '10px 12px', background: '#f8f9fa', borderRadius: '8px', fontSize: 14 }}>{showViewModal.title}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Type</label>
              <div>{getTypeBadge(showViewModal.announcement_type)}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Audience</label>
              <span style={{ background: '#e4f2fd', color: '#1260a0', padding: '4px 12px', borderRadius: '20px', fontSize: 12 }}>{showViewModal.recipient_type}</span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Message</label>
              <div style={{ background: '#f8f9fa', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap', fontSize: 14 }}>{showViewModal.message}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Created</label>
              <div style={{ fontSize: 13, color: '#666' }}>{new Date(showViewModal.created_at).toLocaleString()}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Status</label>
              <span style={{ background: showViewModal.is_published ? '#e8f8f0' : '#f0f3f7', color: showViewModal.is_published ? '#4caf81' : '#8099b3', padding: '4px 12px', borderRadius: '20px', fontSize: 12 }}>
                {showViewModal.is_published ? 'Published' : 'Draft'}
              </span>
            </div>

            {/* Edit button in view modal */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid #e9ecef' }}>
              <button
                className="admin-btn admin-btn-primary"
                onClick={() => {
                  setShowViewModal(null);
                  handleEdit(showViewModal);
                }}
              >
                <i className="fas fa-edit" /> Edit Announcement
              </button>
            </div>
          </>
        )}
      </AdminModal>

      {/* ========== DELETE CONFIRMATION MODAL ========== */}
      <AdminModal open={showDeleteModal} onClose={() => setShowDeleteModal(null)} title="Delete Announcement" size="sm">
        {showDeleteModal && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fdeaec', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="fas fa-trash-alt" style={{ fontSize: 28, color: '#e84855' }} />
            </div>
            <h4 style={{ marginBottom: 8, fontSize: 18 }}>Are you sure?</h4>
            <p style={{ color: '#666', marginBottom: 20, fontSize: 14 }}>
              Delete "<strong>{showDeleteModal.title}</strong>"? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => setShowDeleteModal(null)}
              >
                Cancel
              </button>
              <button
                className="admin-btn admin-btn-danger"
                onClick={() => handleDelete(showDeleteModal.id)}
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN FEE MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

function PaymentRequestsSection({ onRefresh }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [processing, setProcessing] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      // FIXED: Remove spaces from URL
      const r = await api.get(`/fees/payment-requests/?status=${filter}`)
      setRequests(r.data.results || r.data || [])
    } catch (err) {
      console.error('Error loading requests:', err)
      toast.error('Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  const process = async (id, action) => {
    setProcessing(id)
    try {
      // FIXED: Remove spaces from URL
      const r = await api.post(`/fees/payment-requests/${id}/process/`, { action })
      toast.success(r.data.message)
      setRequests(prev => prev.filter(req => req.id !== id))
      onRefresh()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed')
    } finally {
      setProcessing(null)
    }
  }

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

  return (
    <div className="admin-card">
      <div className="admin-card-header" style={{ background: `linear-gradient(135deg, ${T.navy}, ${T.navyMid})` }}>
        <h5 style={{ color: 'white', margin: 0 }}>
          <i className="fas fa-bell" style={{ marginRight: 8, color: T.amber }} />
          Student Payment Requests
          {filter === 'pending' && requests.length > 0 && (
            <span style={{ marginLeft: 10, background: T.rose, color: 'white', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>
              {requests.length} pending
            </span>
          )}
        </h5>
        <div style={{ display: 'flex', gap: 8 }}>
          {['pending', 'approved', 'rejected'].map(s => (
            <button
              key={s}
              className="admin-btn admin-btn-sm"
              onClick={() => setFilter(s)}
              style={{
                background: filter === s ? T.amber : 'rgba(255,255,255,0.1)',
                color: filter === s ? T.navy : 'white',
                border: 'none'
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? <AdminSpin /> : requests.length === 0 ? (
        <AdminEmpty msg={`No ${filter} payment requests`} icon="fa-bell-slash" />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Batch / Course</th>
                <th>Amount</th>
                <th>Mode</th>
                <th>Notes</th>
                <th>Screenshot</th>
                <th>Balance</th>
                <th>Requested</th>
                <th>Status</th>
                {filter === 'pending' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map((r, i) => (
                <tr key={r.id} style={{ opacity: processing === r.id ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                  <td style={{ fontSize: 12, color: T.slate }}>{i + 1}</td>
                  <td>
                    <div className="admin-person-cell">
                      <AdminAvatar name={r.student_name} size={34} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.student_name}</div>
                        <div style={{ fontSize: 11, color: T.slate }}>{r.student_id} · {r.branch}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.batch_number}</div>
                    <div style={{ fontSize: 11, color: T.slate }}>{r.course_name}</div>
                  </td>
                  <td style={{ fontWeight: 700, color: T.sage, fontSize: 13 }}>{fmt(r.amount)}</td>
                  <td><AdminBadge text={r.payment_mode?.replace('_', ' ').toUpperCase()} variant="info" /></td>
                  <td style={{ fontSize: 12, color: T.slate, maxWidth: 160 }}>
                    {r.notes && r.notes.trim() !== '' ? r.notes : (
                      <span style={{ color: T.slateLight, fontStyle: 'italic' }}>—</span>
                    )}
                  </td>
                  <td>
                    {r.screenshot
                      ? <a href={r.screenshot} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: T.teal, color: 'white', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}><i className="fas fa-image" /> View</span></a>
                      : <span style={{ color: T.slateLight, fontSize: 12 }}>No file</span>
                    }
                  </td>
                  <td style={{ color: r.balance_after === 0 ? T.sage : T.rose, fontWeight: 600, fontSize: 13 }}>
                    {fmt(r.balance_after)}
                    {r.balance_after === 0 && <span style={{ fontSize: 10, marginLeft: 4 }}>✅</span>}
                  </td>
                  <td style={{ fontSize: 12, color: T.slate }}>
                    {r.requested_at ? new Date(r.requested_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td>
                    <AdminBadge
                      text={r.status}
                      variant={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'}
                    />
                  </td>
                  {filter === 'pending' && (
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="admin-btn admin-btn-success admin-btn-sm"
                          onClick={() => process(r.id, 'approve')}
                          disabled={processing === r.id}
                        >
                          {processing === r.id
                            ? <i className="fas fa-spinner fa-spin" />
                            : <><i className="fas fa-check" /> Approve</>}
                        </button>
                        <button
                          className="admin-btn admin-btn-danger admin-btn-sm"
                          onClick={() => process(r.id, 'reject')}
                          disabled={processing === r.id}
                        >
                          <i className="fas fa-times" /> Reject
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
  )
}

export function AdminFeeManagement() {
  const [fees, setFees] = useState([])
  const [filteredFees, setFilteredFees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentModal, setPaymentModal] = useState(null)
  const [payForm, setPayForm] = useState({ amount: '', payment_mode: 'cash', notes: '' })
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('fees')

  const load = async () => {
    setLoading(true)
    try {
      // FIXED: Remove spaces from URL
      const r = await api.get('/fees/')
      const data = r.data.results || r.data || []
      setFees(data)
      applyFilters(data, search, branchFilter, statusFilter)
    } catch (err) {
      console.error('Error loading fees:', err)
      toast.error('Failed to load fee records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const applyFilters = (data, s, b, st) => {
    let f = [...data]
    if (b) f = f.filter(x => x.branch === b)
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

  useEffect(() => { applyFilters(fees, search, branchFilter, statusFilter) }, [fees, search, branchFilter, statusFilter])

  const branches = [...new Set(fees.map(f => f.branch).filter(Boolean))]
  const totalFee = fees.reduce((s, f) => s + (parseFloat(f.total_fee) || 0), 0)
  const totalPaid = fees.reduce((s, f) => s + (parseFloat(f.amount_paid) || 0), 0)
  const totalBalance = fees.reduce((s, f) => s + (parseFloat(f.balance) || 0), 0)
  const fullyPaid = fees.filter(f => f.is_fully_paid).length

  const handlePay = async () => {
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) return toast.error('Enter valid amount')
    setSaving(true)
    try {
      // FIXED: Remove spaces from URL
      await api.post(`/fees/${paymentModal.id}/pay/`, payForm)
      toast.success('Payment recorded!')
      setPaymentModal(null)
      setPayForm({ amount: '', payment_mode: 'cash', notes: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Payment failed')
    } finally {
      setSaving(false)
    }
  }

const downloadBill = async (feeId, studentName = 'Student') => {
  const toastId = toast.loading('Downloading bill...')

  try {
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

  const tabs = [
    { id: 'fees', label: 'Fee Records', icon: 'fa-rupee-sign' },
    { id: 'requests', label: 'Payment Requests', icon: 'fa-bell' },
  ]

  return (
    <div className="admin-root admin-fade">
      <AdminStyles />
      <AdminPageHeader
        title="💰 Fee Management"
        sub="Track student fee payments and generate bills"
        btn={<button className="admin-btn admin-btn-ghost" onClick={load}><i className="fas fa-sync-alt" /> Refresh</button>}
      />

      {/* Tabs */}
      <div style={{ borderBottom: `2px solid ${T.border}`, marginBottom: 20, display: 'flex', gap: 4 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            className={`admin-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            <i className={`fas ${t.icon}`} style={{ marginRight: 6 }} />{t.label}
          </button>
        ))}
      </div>

      {/* Fee Records Tab */}
      {activeTab === 'fees' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              className="admin-input"
              style={{ width: 220 }}
              placeholder="🔍 Search student, batch..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="admin-select" style={{ width: 140 }} value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
              <option value="">All Branches</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select className="admin-select" style={{ width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="paid">Fully Paid</option>
              <option value="pending">Pending</option>
            </select>
            {(search || branchFilter || statusFilter) && (
              <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => { setSearch(''); setBranchFilter(''); setStatusFilter('') }}>
                <i className="fas fa-times" /> Clear
              </button>
            )}
          </div>

          <div className="admin-card">
            <AdminSectionHeader title="Fee Records" count={filteredFees.length} />
            {loading ? <AdminSpin /> : filteredFees.length === 0 ? (
              <AdminEmpty msg="No fee records found" icon="fa-rupee-sign" />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student</th>
                      <th>Batch / Course</th>
                      <th>Total Fee</th>
                      <th>Paid</th>
                      <th>Balance</th>
                      <th>Progress</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFees.map((f, i) => {
                      const paidPct = f.total_fee > 0 ? Math.round((f.amount_paid / f.total_fee) * 100) : 0
                      return (
                        <tr key={f.id}>
                          <td style={{ fontSize: 12, color: T.slate }}>{i + 1}</td>
                          <td>
                            <div className="admin-person-cell">
                              <AdminAvatar name={f.student_name} size={34} />
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{f.student_name}</div>
                                <div style={{ fontSize: 11, color: T.slate }}>{f.student_id} · {f.branch}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{f.batch_number}</div>
                            <div style={{ fontSize: 11, color: T.slate }}>{f.course_name}</div>
                          </td>
                          <td style={{ fontWeight: 700, fontSize: 13 }}>{fmt(f.total_fee)}</td>
                          <td style={{ color: T.sage, fontWeight: 600, fontSize: 13 }}>{fmt(f.amount_paid)}</td>
                          <td style={{ color: f.balance > 0 ? T.rose : T.sage, fontWeight: 600, fontSize: 13 }}>{fmt(f.balance)}</td>
                          <td style={{ minWidth: 120 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ flex: 1, background: '#e9ecef', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%', width: `${paidPct}%`,
                                  background: paidPct === 100 ? T.sage : paidPct >= 50 ? T.amber : T.rose,
                                  borderRadius: 4
                                }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 600 }}>{paidPct}%</span>
                            </div>
                          </td>
                          <td>
                            <AdminBadge
                              text={f.is_fully_paid ? 'Fully Paid' : 'Pending'}
                              variant={f.is_fully_paid ? 'success' : 'danger'}
                            />
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button
                                className="admin-btn admin-btn-success admin-btn-sm"
                                onClick={() => downloadBill(f.id, f.student_name)}
                                title="Download Bill"
                              >
                                <i className="fas fa-file-invoice" /> Bill
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Payment Requests Tab */}
      {activeTab === 'requests' && (
        <PaymentRequestsSection onRefresh={load} />
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,45,.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setPaymentModal(null)}>
          <div className="admin-card" style={{ width: '100%', maxWidth: 480, margin: 0 }}>
            <div style={{ background: `linear-gradient(135deg, ${T.navy}, ${T.navyLight})`, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px 16px 0 0' }}>
              <h6 style={{ margin: 0, color: 'white', fontFamily: "'Playfair Display'", fontSize: 16 }}>
                <i className="fas fa-rupee-sign" style={{ marginRight: 8, color: T.amber }} />
                Record Payment
              </h6>
              <button onClick={() => setPaymentModal(null)} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: 'white', width: 28, height: 28, borderRadius: 8, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '20px 22px' }}>
              <div style={{ background: T.white, borderRadius: 12, padding: '14px 16px', marginBottom: 20, border: `1px solid ${T.border}` }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{paymentModal.student_name}</div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: T.slate, flexWrap: 'wrap' }}>
                  <span><i className="fas fa-layer-group" style={{ marginRight: 5 }} />{paymentModal.batch_number}</span>
                  <span><i className="fas fa-book" style={{ marginRight: 5 }} />{paymentModal.course_name}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                  {[
                    ['Total', fmt(paymentModal.total_fee), T.navy],
                    ['Paid', fmt(paymentModal.amount_paid), T.sage],
                    ['Balance', fmt(paymentModal.balance), T.rose],
                  ].map(([l, v, c]) => (
                    <div key={l} style={{ textAlign: 'center', flex: 1, background: 'white', borderRadius: 8, padding: '8px 12px', border: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: c }}>{v}</div>
                      <div style={{ fontSize: 11, color: T.slate }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>
                  Amount (₹) <span style={{ color: T.rose }}>*</span>
                </label>
                <input
                  className="admin-input"
                  type="number"
                  placeholder={`Max: ${paymentModal.balance}`}
                  value={payForm.amount}
                  onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                  max={paymentModal.balance}
                  min={1}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Payment Mode</label>
                <select className="admin-select" value={payForm.payment_mode} onChange={e => setPayForm(p => ({ ...p, payment_mode: e.target.value }))}>
                  <option value="cash">💵 Cash</option>
                  <option value="upi">📱 UPI</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                  <option value="cheque">📝 Cheque</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13 }}>Notes (optional)</label>
                <input
                  className="admin-input"
                  placeholder="e.g. Transaction ID, reference..."
                  value={payForm.notes}
                  onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="admin-btn admin-btn-ghost" style={{ flex: 1 }} onClick={() => setPaymentModal(null)}>Cancel</button>
                <button className="admin-btn admin-btn-primary" style={{ flex: 1 }} onClick={handlePay} disabled={saving}>
                  <i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-check'}`} />
                  {saving ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function resolveAdminMediaUrl(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  const base = api.defaults.baseURL || '/api'
  const origin = base.startsWith('http') ? base.replace(/\/api\/?$/, '') : window.location.origin
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`
}

function AdminMediaManager({ type }) {
  const config = {
    gallery: { title: 'Gallery', endpoint: '/gallery/', fileKey: 'image', accept: 'image/*', icon: 'fa-images' },
    vlogs: { title: 'Vlogs', endpoint: '/vlogs/', fileKey: 'video', accept: 'video/*', icon: 'fa-video' },
  }[type]
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', file: null })

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get(config.endpoint)
      setItems(r.data.results || r.data || [])
    } catch {
      toast.error(`Failed to load ${config.title.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [config.endpoint])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    if (!form.file) return toast.error('File is required')
    const data = new FormData()
    data.append('title', form.title.trim())
    data.append(config.fileKey, form.file)
    setSaving(true)
    try {
      await api.post(config.endpoint, data, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success(`${config.title} item uploaded`)
      setForm({ title: '', file: null })
      e.target.reset()
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return
    try {
      await api.delete(`${config.endpoint}${item.id}/`)
      toast.success('Deleted')
      load()
    } catch {
      toast.error('Delete failed')
    }
  }

  return (
    <div className="admin-root admin-fade">
      <AdminStyles />
      <AdminPageHeader title={config.title} sub={`Manage ${config.title.toLowerCase()} content`} />
      <div className="admin-card">
        <AdminSectionHeader title={`Upload ${config.title}`} />
        <form onSubmit={submit} style={{ padding: 22, display: 'grid', gap: 14 }}>
          <input className="admin-input" placeholder="Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <input className="admin-input" type="file" accept={config.accept} onChange={e => setForm(p => ({ ...p, file: e.target.files?.[0] || null }))} />
          <button className="admin-btn admin-btn-primary" style={{ width: 'fit-content', minWidth: 112, justifySelf: 'start' }} disabled={saving}>
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : config.icon}`} />
            {saving ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </div>
      <div className="admin-card">
        <AdminSectionHeader title={config.title} count={items.length} />
        {loading ? <AdminSpin /> : items.length === 0 ? (
          <AdminEmpty msg={`No ${config.title.toLowerCase()} yet`} icon={config.icon} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead><tr><th>Preview</th><th>Title</th><th>Uploaded By</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>
                      {type === 'gallery' ? (
                        <img
                          src={resolveAdminMediaUrl(item.image)}
                          alt={item.title}
                          style={{ width: 86, height: 58, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }}
                        />
                      ) : (
                        <video
                          src={resolveAdminMediaUrl(item.video)}
                          style={{ width: 110, height: 62, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb', background: '#111827' }}
                          controls
                        />
                      )}
                    </td>
                    <td style={{ fontWeight: 700 }}>{item.title}</td>
                    <td>{item.uploaded_by_name || '-'}</td>
                    <td>{item.created_at ? new Date(item.created_at).toLocaleString('en-IN') : '-'}</td>
                    <td><button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => remove(item)}><i className="fas fa-trash" /> Delete</button></td>
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

export function AdminGallery() { return <AdminMediaManager type="gallery" /> }
export function AdminVlogs() { return <AdminMediaManager type="vlogs" /> }

export function AdminNews() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', message: '', image: null })

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/news/?refresh=1')
      setItems(r.data.results || r.data || [])
    } catch {
      toast.error('Failed to load news')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const publish = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    if (!form.message.trim()) return toast.error('Message is required')
    const data = new FormData()
    data.append('title', form.title.trim())
    data.append('message', form.message.trim())
    if (form.image) data.append('image', form.image)
    setSaving(true)
    try {
      await api.post('/news/', data, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('News published')
      setForm({ title: '', message: '', image: null })
      e.target.reset()
      load()
    } catch {
      toast.error('Publish failed')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return
    try {
      await api.delete(`/news/${item.id}/`)
      toast.success('Deleted')
      load()
    } catch {
      toast.error('Delete failed')
    }
  }

  return (
    <div className="admin-root admin-fade">
      <AdminStyles />
      <AdminPageHeader title="News" sub="Live technology news fetched from Google News RSS" />
      <div className="admin-card">
        <AdminSectionHeader title="Live News Feed" />
        <div style={{ padding: 22, display: 'grid', gap: 12 }}>
          <p style={{ margin: 0, color: T.muted, fontWeight: 700 }}>Manual admin news publishing is deprecated. Mobile News now shows live Technology updates from Google News RSS.</p>
          <button className="admin-btn admin-btn-primary" style={{ width: 'fit-content', minWidth: 112, justifySelf: 'start' }} onClick={load} disabled={loading}><i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync'}`} /> {loading ? 'Refreshing...' : 'Refresh Live News'}</button>
        </div>
      </div>
      <SimpleAdminTable title="Live Technology News" items={items} loading={loading} emptyIcon="fa-newspaper" emptyMsg="No live technology news yet" columns={['Title', 'Source', 'Published']} renderRow={(item) => (
        <>
          <td style={{ fontWeight: 700 }}>{item.title}</td>
          <td>{item.source || 'Google News'}</td>
          <td>{(item.published_at || item.created_at) ? new Date(item.published_at || item.created_at).toLocaleString('en-IN') : '-'}</td>
          <td><button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => remove(item)}><i className="fas fa-trash" /> Delete</button></td>
        </>
      )} />
    </div>
  )
}

export function AdminCalendar() {
  const today = new Date().toISOString().slice(0, 10)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ event_name: '', event_date: today, event_time: '', message: '' })

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/calendar-events/')
      setItems(r.data.results || r.data || [])
    } catch {
      toast.error('Failed to load calendar events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.event_name.trim()) return toast.error('Event name is required')
    if (!form.event_date) return toast.error('Date is required')
    if (!form.event_time) return toast.error('Time is required')
    setSaving(true)
    try {
      await api.post('/calendar-events/', { ...form, message: form.message.trim() || form.event_name.trim() })
      toast.success('Event saved')
      setForm({ event_name: '', event_date: today, event_time: '', message: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (item) => {
    if (!window.confirm(`Delete "${item.event_name}"?`)) return
    try {
      await api.delete(`/calendar-events/${item.id}/`)
      toast.success('Deleted')
      load()
    } catch {
      toast.error('Delete failed')
    }
  }

  return (
    <div className="admin-root admin-fade">
      <AdminStyles />
      <AdminPageHeader title="Calendar" sub="Manage upcoming events" />
      <div className="admin-card">
        <AdminSectionHeader title="Add Event" />
        <form onSubmit={submit} style={{ padding: 22, display: 'grid', gap: 14 }}>
          <label style={{ fontWeight: 800, color: T.navy }}>Title</label>
          <input className="admin-input" placeholder="Event name" value={form.event_name} onChange={e => setForm(p => ({ ...p, event_name: e.target.value }))} />
          <div className="admin-row-grid-2">
            <input className="admin-input" type="date" value={form.event_date} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} />
            <input className="admin-input" type="time" value={form.event_time} onChange={e => setForm(p => ({ ...p, event_time: e.target.value }))} />
          </div>
          <label style={{ fontWeight: 800, color: T.navy }}>Description</label>
          <textarea className="admin-input" rows={3} placeholder="Message" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} />
          <button className="admin-btn admin-btn-primary" style={{ width: 'fit-content', minWidth: 118, justifySelf: 'start' }} disabled={saving}><i className={`fas ${saving ? 'fa-spinner fa-spin' : 'fa-calendar-plus'}`} /> {saving ? 'Saving...' : 'Save Event'}</button>
        </form>
      </div>
      <SimpleAdminTable title="Events" items={items} loading={loading} emptyIcon="fa-calendar-alt" emptyMsg="No events yet" columns={['Event', 'Date', 'Time']} renderRow={(item) => (
        <>
          <td style={{ fontWeight: 700 }}>{item.event_name}</td>
          <td>{item.event_date}</td>
          <td>{item.event_time}</td>
          <td><button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => remove(item)}><i className="fas fa-trash" /> Delete</button></td>
        </>
      )} />
    </div>
  )
}

export function AdminReferrals() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const r = await api.get('/referrals/')
      setItems(r.data.results || r.data || [])
    } catch {
      toast.error('Failed to load referrals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const remove = async (item) => {
    if (!window.confirm(`Delete referral from "${item.name}"?`)) return
    try {
      await api.delete(`/referrals/${item.id}/`)
      toast.success('Deleted')
      load()
    } catch {
      toast.error('Delete failed')
    }
  }

  return (
    <div className="admin-root admin-fade">
      <AdminStyles />
      <AdminPageHeader title="Referrals" sub="View referral contacts submitted from the mobile app" />
      <SimpleAdminTable title="Referral Submissions" items={items} loading={loading} emptyIcon="fa-user-plus" emptyMsg="No referrals submitted yet" columns={['Name', 'Mobile Number', 'Submitted At']} renderRow={(item) => (
        <>
          <td style={{ fontWeight: 700 }}>{item.name}</td>
          <td>{item.mobile}</td>
          <td>{item.created_at ? new Date(item.created_at).toLocaleString('en-IN') : '-'}</td>
          <td><button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => remove(item)}><i className="fas fa-trash" /> Delete</button></td>
        </>
      )} />
    </div>
  )
}

const publicUserTabs = [
  { key: 'users', label: 'New Users', icon: 'fa-user-plus' },
  { key: 'results', label: 'Test Results', icon: 'fa-chart-line' },
  { key: 'logins', label: 'Login Records', icon: 'fa-user-clock' },
]

export function AdminPublicUsers() {
  const [activeTab, setActiveTab] = useState('users')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async (tab = activeTab) => {
    setLoading(true)
    try {
      const res = await api.get(`/admin/public-users/?tab=${tab}`)
      setItems(res.data.results || [])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load public users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(activeTab) }, [activeTab])

  const renderUsers = () => (
    <PublicUsersTable
      columns={['Name', 'Username', 'Contact', 'Qualification', 'Location', 'Registered']}
      items={items}
      emptyMsg="No public users registered yet"
      emptyIcon="fa-user-plus"
      renderRow={(item) => (
        <>
          <td style={{ fontWeight: 700 }}>{item.name || '-'}</td>
          <td>{item.username || '-'}</td>
          <td>
            <div>{item.mobile || '-'}</div>
            <div style={{ fontSize: 11, color: T.slate }}>{item.email || ''}</div>
          </td>
          <td>{item.qualification || '-'}</td>
          <td>{[item.city, item.state].filter(Boolean).join(', ') || item.location || '-'}</td>
          <td>{formatMonitoringTime(item.created_at)}</td>
        </>
      )}
    />
  )

  const renderResults = () => (
    <PublicUsersTable
      columns={['User', 'Practice Test', 'Score', 'Result', 'Questions', 'Completed']}
      items={items}
      emptyMsg="No public practice test results yet"
      emptyIcon="fa-chart-bar"
      renderRow={(item) => (
        <>
          <td>
            <div style={{ fontWeight: 700 }}>{item.name || item.username || '-'}</div>
            <div style={{ fontSize: 11, color: T.slate }}>{item.username || ''}</div>
          </td>
          <td>{item.quiz_title || '-'}</td>
          <td>{Number(item.score || 0)} / {Number(item.total_marks || 0)} ({Number(item.percentage || 0)}%)</td>
          <td>
            <span className={`status-pill ${item.is_passed ? 'approved' : 'rejected'}`}>
              {item.is_passed ? 'Passed' : 'Failed'}
            </span>
          </td>
          <td>{item.correct_count || 0} correct / {item.attempted_count || 0} attempted / {item.total_questions || 0} total</td>
          <td>{formatMonitoringTime(item.completed_at)}</td>
        </>
      )}
    />
  )

  const renderLogins = () => (
    <PublicUsersTable
      columns={['User', 'Email', 'Login Time', 'Logout Time', 'Last Seen']}
      items={items}
      emptyMsg="No public login records found"
      emptyIcon="fa-user-clock"
      renderRow={(item) => (
        <>
          <td>
            <div style={{ fontWeight: 700 }}>{item.name || '-'}</div>
            <div style={{ fontSize: 11, color: T.slate }}>{item.username || ''}</div>
          </td>
          <td>{item.email || '-'}</td>
          <td>{formatMonitoringTime(item.login_time)}</td>
          <td>{item.logout_time ? formatMonitoringTime(item.logout_time) : 'Still active'}</td>
          <td>{formatMonitoringTime(item.last_seen)}</td>
        </>
      )}
    />
  )

  return (
    <div className="admin-root admin-fade">
      <AdminStyles />
      <AdminPageHeader
        title="Public Users"
        sub="View public registrations, practice test attempts, and login activity"
      />
      <div className="admin-card">
        <div style={{ padding: 16, borderBottom: `1px solid ${T.border}`, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {publicUserTabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              className={`admin-btn ${activeTab === tab.key ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <i className={`fas ${tab.icon}`} /> {tab.label}
            </button>
          ))}
        </div>
        {loading ? <AdminSpin /> : activeTab === 'users' ? renderUsers() : activeTab === 'results' ? renderResults() : renderLogins()}
      </div>
    </div>
  )
}

function PublicUsersTable({ columns, items, emptyMsg, emptyIcon, renderRow }) {
  if (items.length === 0) {
    return <AdminEmpty msg={emptyMsg} icon={emptyIcon} />
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="admin-table">
        <thead>
          <tr>{columns.map(col => <th key={col}>{col}</th>)}</tr>
        </thead>
        <tbody>
          {items.map(item => <tr key={item.id}>{renderRow(item)}</tr>)}
        </tbody>
      </table>
    </div>
  )
}

function SimpleAdminTable({ title, items, loading, emptyIcon, emptyMsg, columns, renderRow }) {
  return (
    <div className="admin-card">
      <AdminSectionHeader title={title} count={items.length} />
      {loading ? <AdminSpin /> : items.length === 0 ? (
        <AdminEmpty msg={emptyMsg} icon={emptyIcon} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>{columns.map(col => <th key={col}>{col}</th>)}<th>Actions</th></tr>
            </thead>
            <tbody>
              {items.map(item => <tr key={item.id}>{renderRow(item)}</tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
