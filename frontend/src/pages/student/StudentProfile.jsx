import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/client'
import { StudentPageHeader, StudentSpin, StudentStyles } from './StudentPages'

const T = {
  navy: '#0f1b2d',
  amber: '#f4a940',
  teal: '#2ec4b6',
  sage: '#4caf81',
  rose: '#e84855',
  slate: '#8099b3',
  border: 'rgba(15,27,45,0.08)',
  white: '#f8fafc',
  shadow: '0 4px 24px rgba(15,27,45,0.10)',
}

const emptyProfile = {
  name: '',
  gender: '',
  dob: '',
  email: '',
  mobile: '',
  course: '',
  batch: '',
  qualification: '',
  joining: '',
  ending: '',
}

export default function StudentProfile() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [profile, setProfile] = useState(emptyProfile)
  const [photoUrl, setPhotoUrl] = useState('')
  const [photoFile, setPhotoFile] = useState(null)

  const previewPhoto = useMemo(() => {
    if (photoFile) return URL.createObjectURL(photoFile)
    return photoUrl || ''
  }, [photoFile, photoUrl])

  useEffect(() => {
    return () => {
      if (photoFile && previewPhoto?.startsWith('blob:')) URL.revokeObjectURL(previewPhoto)
    }
  }, [photoFile, previewPhoto])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const response = await api.get('/students/me/')
      const data = response.data || {}
      const courseNames = Array.isArray(data.course_names) && data.course_names.length
        ? data.course_names.join(', ')
        : data.course || ''
      const batchNames = Array.isArray(data.assigned_batches) && data.assigned_batches.length
        ? data.assigned_batches
            .map(batch => batch.display_name || batch.batch_code || batch.batch_number)
            .filter(Boolean)
            .join(', ')
        : data.assigned_batch_code || data.assigned_batch_number || ''

      setProfile({
        name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        gender: data.gender || '',
        dob: data.date_of_birth || '',
        email: data.email || '',
        mobile: data.mobile_no || '',
        course: courseNames,
        batch: batchNames,
        qualification: data.qualification || '',
        joining: data.created_at ? String(data.created_at).split('T')[0] : '',
        ending: '',
      })
      setPhotoUrl(data.photo || '')
      setPhotoFile(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProfile() }, [])

  const saveProfile = async () => {
    const [firstName, ...rest] = profile.name.trim().split(' ')
    const lastName = rest.join(' ')
    const payload = {
      first_name: firstName || '',
      last_name: lastName || '',
      date_of_birth: profile.dob,
      email: profile.email.trim(),
      mobile_no: profile.mobile.trim(),
    }

    setSaving(true)
    try {
      if (photoFile) {
        const formData = new FormData()
        Object.entries(payload).forEach(([key, value]) => formData.append(key, value))
        formData.append('photo', photoFile)
        await api.put('/students/me/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      } else {
        await api.put('/students/me/', payload)
      }
      toast.success('Profile updated successfully')
      setEditMode(false)
      await loadProfile()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not update profile')
    } finally {
      setSaving(false)
    }
  }

  const update = (key, value) => setProfile(prev => ({ ...prev, [key]: value }))

  if (loading) return <div className="student-root"><StudentStyles /><StudentSpin /></div>

  return (
    <div className="student-root">
      <StudentStyles />
      <style>{`
        .student-profile-hero{background:linear-gradient(135deg,#1f1335,#5523d2);color:#fff;border-radius:22px;padding:24px;display:grid;grid-template-columns:130px minmax(0,1fr) auto;gap:22px;align-items:center;box-shadow:${T.shadow};margin-bottom:22px}
        .student-profile-avatar{position:relative;width:112px;height:112px;border-radius:999px;padding:4px;background:#fff;border:1px solid rgba(255,255,255,.46)}
        .student-profile-avatar img,.student-profile-avatar-fallback{width:100%;height:100%;border-radius:999px;object-fit:cover}
        .student-profile-avatar-fallback{display:flex;align-items:center;justify-content:center;background:#ede9fe;color:#5523d2;font-size:42px;font-weight:900}
        .student-profile-photo-btn{position:absolute;right:0;bottom:4px;width:34px;height:34px;border-radius:999px;border:2px solid #fff;background:${T.amber};color:${T.navy};display:flex;align-items:center;justify-content:center;cursor:pointer}
        .student-profile-title{margin:0;font-size:32px;color:#fff}
        .student-profile-sub{margin:6px 0 0;color:#ddd6fe;font-weight:700}
        .student-profile-action{border:0;border-radius:14px;background:${T.amber};color:${T.navy};font-weight:900;padding:12px 18px;cursor:pointer}
        .student-profile-action.secondary{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.16)}
        .student-profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
        .student-profile-card{background:#fff;border:1px solid ${T.border};border-radius:18px;box-shadow:${T.shadow};padding:20px}
        .student-profile-card h4{margin:0 0 14px;color:${T.navy};display:flex;align-items:center;gap:9px}
        .student-profile-row{display:grid;grid-template-columns:190px minmax(0,1fr);gap:14px;align-items:center;padding:12px 0;border-top:1px solid ${T.border}}
        .student-profile-row:first-of-type{border-top:0}
        .student-profile-label{display:flex;align-items:center;gap:8px;color:${T.slate};font-weight:800;font-size:13px}
        .student-profile-value{color:${T.navy};font-weight:800;text-align:right}
        .student-profile-input{width:100%;box-sizing:border-box;border:1px solid ${T.border};border-radius:12px;padding:10px 12px;color:${T.navy};font-weight:700;background:${T.white};text-align:right}
        .student-profile-input:focus{outline:none;border-color:${T.amber};box-shadow:0 0 0 3px rgba(244,169,64,.14)}
        @media(max-width:820px){.student-profile-hero{grid-template-columns:1fr;text-align:center}.student-profile-avatar{margin:auto}.student-profile-grid{grid-template-columns:1fr}.student-profile-row{grid-template-columns:1fr}.student-profile-value,.student-profile-input{text-align:left}}
      `}</style>

      <StudentPageHeader title="Student Profile" sub="View and update your personal details" />

      <div className="student-profile-hero">
        <div className="student-profile-avatar">
          {previewPhoto ? (
            <img src={previewPhoto} alt={profile.name || 'Student'} />
          ) : (
            <div className="student-profile-avatar-fallback">{(profile.name || 'S').slice(0, 1).toUpperCase()}</div>
          )}
          {editMode && (
            <label className="student-profile-photo-btn" title="Change photo">
              <i className="fas fa-camera" />
              <input type="file" accept="image/*" hidden onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
            </label>
          )}
        </div>
        <div>
          <h2 className="student-profile-title">{profile.name || 'Student'}</h2>
          <p className="student-profile-sub">{profile.course || 'Course'} · {profile.batch || 'Batch not assigned'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {editMode && <button className="student-profile-action secondary" onClick={() => { setEditMode(false); loadProfile() }} disabled={saving}>Cancel</button>}
          <button className="student-profile-action" onClick={editMode ? saveProfile : () => setEditMode(true)} disabled={saving}>
            <i className={`fas ${saving ? 'fa-spinner fa-spin' : editMode ? 'fa-check' : 'fa-pen'}`} style={{ marginRight: 8 }} />
            {saving ? 'Saving...' : editMode ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      <div className="student-profile-grid">
        <ProfileCard title="Personal Details" icon="fa-user">
          <ProfileRow icon="fa-user" label="Name" value={profile.name} editable={editMode} onChange={value => update('name', value)} />
          <ProfileRow icon="fa-calendar" label="Date of Birth" type="date" value={profile.dob} editable={editMode} onChange={value => update('dob', value)} />
          <ProfileRow icon="fa-envelope" label="Email" type="email" value={profile.email} editable={editMode} onChange={value => update('email', value)} />
          <ProfileRow icon="fa-phone" label="Mobile" value={profile.mobile} editable={editMode} onChange={value => update('mobile', value)} />
          <ProfileRow icon="fa-venus-mars" label="Gender" value={profile.gender} />
          <ProfileRow icon="fa-graduation-cap" label="Qualification" value={profile.qualification} />
        </ProfileCard>

        <ProfileCard title="Course Details" icon="fa-briefcase">
          <ProfileRow icon="fa-book" label="Course" value={profile.course} />
          <ProfileRow icon="fa-layer-group" label="Batch" value={profile.batch} />
          <ProfileRow icon="fa-right-to-bracket" label="Joining Date" value={profile.joining} />
          <ProfileRow icon="fa-right-from-bracket" label="Ending Date" value={profile.ending || '—'} />
        </ProfileCard>
      </div>
    </div>
  )
}

function ProfileCard({ title, icon, children }) {
  return (
    <div className="student-profile-card">
      <h4><i className={`fas ${icon}`} style={{ color: T.amber }} /> {title}</h4>
      {children}
    </div>
  )
}

function ProfileRow({ icon, label, value, editable = false, type = 'text', onChange }) {
  return (
    <div className="student-profile-row">
      <div className="student-profile-label"><i className={`fas ${icon}`} /> {label}</div>
      {editable ? (
        <input className="student-profile-input" type={type} value={value || ''} onChange={e => onChange(e.target.value)} />
      ) : (
        <div className="student-profile-value">{value || '—'}</div>
      )}
    </div>
  )
}
