import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { showAdminQuizManagement } from '../../features'

const colors = {
  border: '#e5e7eb',
  text: '#172033',
  muted: '#64748b',
  blue: '#1572e8',
  blueSoft: '#eef6ff',
}

export default function UserNotifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const role = location.pathname.split('/')[1] || 'student'

  const getTargetPath = (item) => {
    if (role === 'admin' && !showAdminQuizManagement && (item.type === 'quiz_result' || item.action_url?.startsWith('/admin/quiz'))) return ''
    if (item.type === 'batch_duration_exceeded') return ''
    if (item.action_url) return item.action_url
    const type = item.type
    const paths = {
      admin: {
        announcement: '/admin/announcements',
        leave_alert: '/admin/attendance',
        quiz_result: '/admin/quiz-results',
        support: '/admin/student-support',
        leave_application: '/admin/staff-leave',
        assignment: '/admin/assigned',
        batch_ending_soon: '/admin',
        batch_duration_exceeded: '/admin',
        doubt_raised: '/admin',
        doubt_resolved: '/admin',
      },
      employee: {
        announcement: '/employee/announcements',
        leave_alert: '/employee/attendance-history',
        quiz_result: '/employee/quiz-results',
        support: '/employee/support',
        leave_application: '/employee/student-leave/pending',
        assignment: '/employee/batches',
        batch_ending_soon: '/employee/batches',
        batch_duration_exceeded: '/employee/batches',
        doubt_raised: '/employee/doubts',
        doubt_resolved: '/employee/doubts',
      },
      counselor: {
        announcement: '/counselor/announcements',
        leave_alert: '/counselor/students',
        quiz_result: '/counselor/students',
        support: '/counselor/support',
        leave_application: '/counselor/students',
        assignment: '/counselor/assigned-students',
        batch_ending_soon: '/counselor',
        batch_duration_exceeded: '/counselor',
        doubt_raised: '/counselor/students',
        doubt_resolved: '/counselor/students',
      },
    }
    return paths[role]?.[type] || `/${role}`
  }

  useEffect(() => {
    setLoading(true)
    api.get('/notifications/')
      .then(async res => {
        const data = res.data || []
        setNotifications(data.map(item => ({ ...item, is_read: true })))
        if (data.some(item => !item.is_read)) {
          api.post('/notifications/read-all/')
          window.dispatchEvent(new Event('iie:notifications-read'))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read/`)
    setNotifications(prev => prev.map(item => item.id === id ? { ...item, is_read: true } : item))
  }

  const unread = notifications.filter(item => !item.is_read).length

  return (
    <div style={{ fontFamily: "'Public Sans', sans-serif" }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, color: colors.text }}>Notifications</h1>
          <p style={{ margin: '6px 0 0', color: colors.muted, fontSize: 13 }}>Important updates and alerts</p>
        </div>
        {unread > 0 && (
          <span style={{
            background: '#fee2e2',
            color: '#b91c1c',
            borderRadius: 999,
            padding: '7px 12px',
            fontWeight: 800,
            fontSize: 12,
          }}>{unread} new</span>
        )}
      </div>

      <div style={{
        background: '#fff',
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(15, 23, 42, .06)',
      }}>
        {loading ? (
          <div style={{ padding: 28, textAlign: 'center', color: colors.muted }}>Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', color: colors.muted }}>
            <i className="fas fa-bell-slash" style={{ fontSize: 24, marginBottom: 10, display: 'block' }} />
            No notifications yet
          </div>
        ) : (
          <div style={{ padding: 18 }}>
            {notifications.map(item => {
              const targetPath = getTargetPath(item)
              const canNavigate = Boolean(targetPath)
              return (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  if (canNavigate) navigate(targetPath)
                }}
                style={{
                  width: '100%',
                  border: `1px solid ${item.is_read ? colors.border : colors.blue}`,
                  background: item.is_read ? '#fff' : colors.blueSoft,
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 12,
                  textAlign: 'left',
                  cursor: canNavigate ? 'pointer' : 'default',
                }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: 'rgba(21,114,232,.12)',
                    color: colors.blue,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: '0 0 auto',
                  }}>
                    <i className="fas fa-bell" />
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 5 }}>
                      <strong style={{ color: colors.text }}>{item.title || 'Notification'}</strong>
                      <small style={{ color: colors.muted, whiteSpace: 'nowrap' }}>{item.created_at}</small>
                    </span>
                    <span style={{ color: colors.text, fontSize: 13, lineHeight: 1.6 }}>{item.message}</span>
                    {canNavigate && <small style={{ color: colors.blue, marginTop: 8, display: 'block', fontWeight: 700 }}>Click to open</small>}
                  </span>
                </div>
              </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
