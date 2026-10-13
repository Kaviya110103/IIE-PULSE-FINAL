import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/client'

const T = {
  navy: '#0f1b2d',
  amber: '#f4a940',
  sage: '#4caf81',
  rose: '#e84855',
  slate: '#8099b3',
  border: 'rgba(15,27,45,0.08)',
  shadow: '0 4px 24px rgba(15,27,45,0.10)',
}

export default function StaffDailyActivityResults() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.get('/staff/daily-activity-results/')
      .then(r => setRows(r.data?.results || []))
      .catch(() => {
        toast.error('Failed to load daily activity results')
        setRows([])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ color: T.navy }}>
      <style>{`
        .daily-card{background:#fff;border:1px solid ${T.border};border-radius:16px;box-shadow:${T.shadow};overflow:hidden;margin-bottom:22px}
        .daily-head{padding:18px 22px;border-bottom:1px solid ${T.border};display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
        .daily-table{width:100%;border-collapse:collapse}
        .daily-table th{background:#0f1b2d;color:#fff;text-align:left;padding:13px;font-size:12px;letter-spacing:.06em;text-transform:uppercase}
        .daily-table td{padding:13px;border-bottom:1px solid ${T.border};vertical-align:middle}
        .daily-btn{border:0;border-radius:10px;padding:9px 13px;background:${T.amber};color:${T.navy};font-weight:800;cursor:pointer}
        .daily-stat{background:#f8fafc;border:1px solid ${T.border};border-radius:14px;padding:14px}
        .daily-stat strong{display:block;font-size:24px}
      `}</style>

      <div style={{ marginBottom: 24, paddingBottom: 18, borderBottom: `2px solid ${T.border}` }}>
        <h1 style={{ margin: 0, fontFamily: 'Playfair Display, serif' }}>Daily Activity Result</h1>
        <p style={{ margin: '8px 0 0', color: T.slate }}>Student streaks, scores and day-wise progress from Daily Activity.</p>
      </div>

      <div className="daily-card">
        <div className="daily-head">
          <h3 style={{ margin: 0 }}>Students ({rows.length})</h3>
        </div>
        {loading ? (
          <div style={{ padding: 24 }}>Loading...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 24, color: T.slate }}>No daily activity results available yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="daily-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Batch</th>
                  <th>Completed</th>
                  <th>Streak</th>
                  <th>Score</th>
                  <th>Progress</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const summary = row.summary || {}
                  return (
                    <tr key={`${row.student_id}-${summary.course}-${summary.batch}`}>
                      <td><strong>{row.student_name}</strong><br /><small>{row.student_code}</small></td>
                      <td>{row.course_name}</td>
                      <td>{row.batch_code || row.batch_number}</td>
                      <td>{summary.completed_days || 0}/15</td>
                      <td>{summary.current_streak || 0}</td>
                      <td>{summary.total_score || 0}/{summary.total_questions || 0}</td>
                      <td>{Math.round(Number(summary.progress_percentage || 0))}%</td>
                      <td><button className="daily-btn" onClick={() => setSelected(row)}>View Progress</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,27,45,.48)', zIndex: 3000, display: 'grid', placeItems: 'center', padding: 20 }} onClick={() => setSelected(null)}>
          <div className="daily-card" style={{ width: 'min(780px, 96vw)', maxHeight: '86vh', overflow: 'auto', margin: 0 }} onClick={e => e.stopPropagation()}>
            <div className="daily-head">
              <h3 style={{ margin: 0 }}>{selected.student_name} - Progress</h3>
              <button className="daily-btn" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px,1fr))', gap: 12, marginBottom: 18 }}>
                <div className="daily-stat"><strong>{selected.summary?.completed_days || 0}/15</strong><span>Completed</span></div>
                <div className="daily-stat"><strong>{selected.summary?.current_streak || 0}</strong><span>Current Streak</span></div>
                <div className="daily-stat"><strong>{selected.summary?.longest_streak || 0}</strong><span>Longest Streak</span></div>
                <div className="daily-stat"><strong>{Math.round(Number(selected.summary?.final_score_percentage || 0))}%</strong><span>Final Score</span></div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="daily-table">
                  <thead><tr><th>Day</th><th>Date</th><th>Status</th><th>Score</th></tr></thead>
                  <tbody>
                    {(selected.days || []).map(day => (
                      <tr key={day.id}>
                        <td>Day {day.day_number}</td>
                        <td>{day.challenge_date}</td>
                        <td>{day.status}</td>
                        <td>{day.score || 0}/{day.total_questions || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
