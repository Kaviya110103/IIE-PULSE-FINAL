import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/client'

const T = {
  navy: '#0f1b2d',
  amber: '#f4a940',
  teal: '#2ec4b6',
  sage: '#4caf81',
  rose: '#e84855',
  slate: '#8099b3',
  border: 'rgba(15,27,45,0.08)',
  shadow: '0 4px 24px rgba(15,27,45,0.10)',
}

const fmt = value => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

const LEAVE_TYPES = [
  ['casual', 'Casual Leave'],
  ['sick', 'Sick Leave'],
  ['emergency', 'Emergency Leave'],
  ['personal', 'Personal Leave'],
  ['other', 'Other'],
]

export default function StudentDesk() {
  const [tab, setTab] = useState('course')
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [sessions, setSessions] = useState([])
  const [feeData, setFeeData] = useState({})
  const [leave, setLeave] = useState({ leave_type: 'casual', start_date: '', end_date: '', reason: '' })
  const [savingLeave, setSavingLeave] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/dashboard/student/'),
      api.get('/attendance/?student=me'),
      api.get('/sessions/student/'),
      api.get('/student/fee/'),
    ]).then(([dash, att, sess, fee]) => {
      setDashboard(dash.data || {})
      setAttendance(att.data?.results || att.data || [])
      setSessions(sess.data?.results || sess.data || [])
      setFeeData(fee.data || {})
    }).catch(() => toast.error('Failed to load student desk')).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const present = attendance.filter(item => item.status === 'Present').length
  const attendancePercent = attendance.length ? Math.round((present / attendance.length) * 100) : 0
  const completedSessions = sessions.filter(item => item.student_status === 'completed').length
  const logsheetPercent = sessions.length ? Math.round((completedSessions / sessions.length) * 100) : 0
  const fee = feeData?.fee
  const feePercent = fee?.total_fee ? Math.round((Number(fee.amount_paid || 0) / Number(fee.total_fee || 1)) * 100) : 0
  const courseName = dashboard?.student?.course || fee?.course_name || 'Assigned Course'
  const leaveDays = useMemo(() => {
    if (!leave.start_date || !leave.end_date) return 0
    const start = new Date(leave.start_date)
    const end = new Date(leave.end_date)
    const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1
    return Number.isFinite(diff) && diff > 0 ? diff : 0
  }, [leave.start_date, leave.end_date])

  const graph = useMemo(() => [
    ['Attendance', attendancePercent, T.sage],
    ['Logsheet', logsheetPercent, T.teal],
    ['Fee Paid', feePercent, T.amber],
  ], [attendancePercent, logsheetPercent, feePercent])

  const viewBillPdf = async () => {
    if (!fee?.id) return
    const toastId = toast.loading('Opening bill PDF...')
    try {
      const response = await api.get(`/fees/${fee.id}/bill-link/`)
      window.open(response.data.url, '_blank', 'noopener,noreferrer')
      toast.success('Bill PDF opened!', { id: toastId })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bill PDF is available only after admin approval', { id: toastId })
    }
  }

  const submitLeave = async e => {
    e.preventDefault()
    if (!leave.start_date || !leave.end_date || !leave.reason.trim()) return toast.error('Please fill all leave fields')
    if (!leaveDays) return toast.error('End date should be after start date')
    setSavingLeave(true)
    try {
      await api.post('/student-leave/', leave)
      toast.success('Leave application submitted')
      setLeave({ leave_type: 'casual', start_date: '', end_date: '', reason: '' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit leave')
    } finally {
      setSavingLeave(false)
    }
  }

  const tabs = [
    ['course', 'Course Details', 'fa-chart-line'],
    ['attendance', 'Attendance', 'fa-calendar-check'],
    ['logsheet', 'Logsheet', 'fa-list-check'],
    ['leave', 'Leave', 'fa-calendar-plus'],
    ['fee', 'Fee', 'fa-rupee-sign'],
  ]

  if (loading) return <div style={{ padding: 24 }}>Loading student desk...</div>

  return (
    <div>
      <style>{`
        .desk-hero{background:linear-gradient(135deg,#0f1b2d,#5523d2);color:#fff;border-radius:22px;padding:24px;margin-bottom:20px;box-shadow:${T.shadow}}
        .desk-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}
        .desk-tab{border:1px solid ${T.border};background:#fff;border-radius:999px;padding:10px 14px;font-weight:800;color:${T.slate};cursor:pointer}
        .desk-tab.active{background:${T.amber};color:${T.navy};border-color:${T.amber}}
        .desk-card{background:#fff;border:1px solid ${T.border};border-radius:18px;box-shadow:${T.shadow};padding:20px;margin-bottom:18px}
        .desk-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}
        .desk-stat{background:#f8fafc;border-radius:14px;padding:15px;border:1px solid ${T.border}}
        .desk-stat strong{display:block;font-size:24px;color:${T.navy}}
        .desk-row{display:flex;justify-content:space-between;gap:14px;border-top:1px solid ${T.border};padding:12px 0;align-items:center}
        .desk-input{width:100%;border:1px solid ${T.border};border-radius:12px;padding:11px 12px;background:#fff;color:${T.navy};box-sizing:border-box}
        .desk-input:focus{outline:none;border-color:${T.amber};box-shadow:0 0 0 3px rgba(244,169,64,.16)}
        .desk-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
        .desk-form-field{margin-bottom:14px}
        .desk-form-field.full{grid-column:1/-1}
        .desk-label{display:block;font-size:12px;font-weight:900;color:${T.navy};margin-bottom:7px}
        .desk-leave-banner{display:flex;align-items:center;justify-content:space-between;gap:14px;background:#f8fafc;border:1px solid ${T.border};border-radius:16px;padding:14px 16px;margin-bottom:16px}
        .desk-leave-days{min-width:88px;text-align:center;border-radius:14px;background:rgba(244,169,64,.14);color:${T.navy};font-weight:900;padding:10px}
        .desk-submit{border:0;border-radius:14px;background:${T.amber};color:${T.navy};font-weight:900;padding:12px 18px;cursor:pointer}
        .desk-submit:disabled{opacity:.65;cursor:not-allowed}
        .desk-bill-box{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:14px;padding:14px 16px;border-radius:16px;background:#eefaf6;border:1px solid rgba(76,175,129,.2)}
        .desk-bill-button{border:0;border-radius:12px;background:${T.sage};color:#fff;font-weight:900;padding:11px 14px;cursor:pointer;white-space:nowrap}
        @media(max-width:720px){.desk-form-grid{grid-template-columns:1fr}.desk-leave-banner{align-items:flex-start;flex-direction:column}.desk-leave-days{text-align:left}}
      `}</style>

      <div className="desk-hero">
        <div style={{ fontSize: 13, fontWeight: 900, opacity: .8 }}>STUDENT DESK</div>
        <h1 style={{ margin: '4px 0 8px' }}>{courseName}</h1>
        <p style={{ margin: 0, opacity: .86 }}>Course progress, attendance, logsheet, leave and fee in one place.</p>
      </div>

      <div className="desk-tabs">
        {tabs.map(([key, label, icon]) => (
          <button key={key} className={`desk-tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            <i className={`fas ${icon}`} style={{ marginRight: 7 }} />{label}
          </button>
        ))}
      </div>

      {tab === 'course' && (
        <div className="desk-card">
          <h3>Course Details</h3>
          <div style={{ display: 'flex', alignItems: 'end', gap: 28, minHeight: 220, paddingTop: 20 }}>
            {graph.map(([label, value, color]) => (
              <div key={label} style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ height: 150, display: 'flex', alignItems: 'end', justifyContent: 'center' }}>
                  <div style={{ width: 38, height: `${Math.max(value, 8)}%`, background: color, borderRadius: 18 }} />
                </div>
                <strong>{value}%</strong>
                <div style={{ color: T.slate, fontWeight: 700 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="desk-card">
          <h3>Attendance</h3>
          <Stats items={[['Total', attendance.length], ['Present', present], ['Absent', attendance.length - present], ['Rate', `${attendancePercent}%`]]} />
          {attendance.slice(0, 30).map(item => <Row key={item.id} left={item.date} mid={item.batch_code || item.batch_number || 'Batch'} right={item.status} good={item.status === 'Present'} />)}
        </div>
      )}

      {tab === 'logsheet' && (
        <div className="desk-card">
          <h3>Logsheet</h3>
          <Stats items={[['Completed', completedSessions], ['Pending', sessions.length - completedSessions], ['Progress', `${logsheetPercent}%`]]} />
          {sessions.map(item => <Row key={item.id} left={`Session ${item.session_number}`} mid={item.title || 'Session'} right={item.student_status || 'pending'} good={item.student_status === 'completed'} />)}
        </div>
      )}

      {tab === 'leave' && (
        <div className="desk-card">
          <div className="desk-leave-banner">
            <div>
              <h3 style={{ margin: '0 0 4px' }}>Apply Leave</h3>
              <p style={{ margin: 0, color: T.slate, fontWeight: 700 }}>Choose leave type, dates and reason to send your request.</p>
            </div>
            <div className="desk-leave-days">
              {leaveDays || 0}
              <div style={{ fontSize: 11, color: T.slate }}>Days</div>
            </div>
          </div>
          <form onSubmit={submitLeave}>
            <div className="desk-form-grid">
              <div className="desk-form-field">
                <label className="desk-label">Leave Type *</label>
                <select className="desk-input" value={leave.leave_type} onChange={e => setLeave(p => ({ ...p, leave_type: e.target.value }))}>
                  {LEAVE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="desk-form-field">
                <label className="desk-label">Start Date *</label>
                <input className="desk-input" type="date" value={leave.start_date} onChange={e => setLeave(p => ({ ...p, start_date: e.target.value, end_date: p.end_date && p.end_date < e.target.value ? e.target.value : p.end_date }))} />
              </div>
              <div className="desk-form-field">
                <label className="desk-label">End Date *</label>
                <input className="desk-input" type="date" min={leave.start_date || undefined} value={leave.end_date} onChange={e => setLeave(p => ({ ...p, end_date: e.target.value }))} />
              </div>
              <div className="desk-form-field">
                <label className="desk-label">Status</label>
                <div className="desk-input" style={{ background: '#f8fafc', fontWeight: 800 }}>{leaveDays ? `${leaveDays} day${leaveDays === 1 ? '' : 's'} selected` : 'Select dates'}</div>
              </div>
              <div className="desk-form-field full">
                <label className="desk-label">Reason *</label>
                <textarea className="desk-input" rows="4" value={leave.reason} onChange={e => setLeave(p => ({ ...p, reason: e.target.value }))} placeholder="Type your leave reason here..." />
              </div>
            </div>
            <button className="desk-submit" disabled={savingLeave}>
              <i className={`fas ${savingLeave ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`} style={{ marginRight: 8 }} />
              {savingLeave ? 'Submitting...' : 'Submit Leave'}
            </button>
          </form>
        </div>
      )}

      {tab === 'fee' && (
        <div className="desk-card">
          <h3>Fee Details</h3>
          {!fee ? <p>No fee details found.</p> : <>
            <Stats items={[['Total', fmt(fee.total_fee)], ['Paid', fmt(fee.amount_paid)], ['Balance', fmt(fee.balance)]]} />
            <Row left="Course" mid={fee.course_name || 'Course'} right={fee.is_fully_paid ? 'Paid' : 'Pending'} good={fee.is_fully_paid} />
            <Row left="Trainer" mid={fee.trainer_name || 'Trainer'} right={fee.branch || 'Branch'} />
            {fee.bill_available ? (
              <div className="desk-bill-box">
                <div>
                  <strong style={{ color: T.navy }}>Approved bill ready</strong>
                  <div style={{ color: T.slate, fontSize: 13, marginTop: 3 }}>View your fee bill PDF from Student Desk.</div>
                </div>
                <button className="desk-bill-button" type="button" onClick={viewBillPdf}>
                  <i className="fas fa-file-pdf" style={{ marginRight: 7 }} /> View PDF
                </button>
              </div>
            ) : (
              <div style={{ color: T.slate, fontWeight: 700, marginTop: 12 }}>Bill PDF will appear after admin approval.</div>
            )}
          </>}
        </div>
      )}
    </div>
  )
}

function Stats({ items }) {
  return <div className="desk-stats">{items.map(([label, value]) => <div key={label} className="desk-stat"><strong>{value}</strong><span>{label}</span></div>)}</div>
}

function Row({ left, mid, right, good }) {
  return <div className="desk-row"><div><strong>{left}</strong><div style={{ color: T.slate }}>{mid}</div></div><strong style={{ color: good == null ? T.navy : good ? T.sage : T.rose }}>{right}</strong></div>
}
