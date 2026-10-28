import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn, Mail, ArrowLeft, KeyRound, ShieldCheck, Users, GraduationCap } from 'lucide-react'
import api, { getApiErrorMessage } from '../../api/client'
import logo from '../../assets/IIE.png'

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '', user_type: 'admin' })
  const [showPwd, setShowPwd] = useState(false)
  const [view, setView] = useState('login')
  const [fpEmail, setFpEmail] = useState('')
  const [fpCode, setFpCode] = useState('')
  const [fpNewPwd, setFpNewPwd] = useState('')
  const [fpConfirmPwd, setFpConfirmPwd] = useState('')
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [fpLoading, setFpLoading] = useState(false)
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.username || !form.password) return toast.error('Please fill all fields')
    const result = await login(form.username, form.password, form.user_type)
    if (result.success) {
      const d = result.data
      toast.success(`Welcome, ${d.name || d.username}!`)
      if (d.user_type === 'student') navigate('/dashboard')
      else if (d.user_type === 'public') navigate('/public')
      else if (d.user_type === 'admin') navigate('/admin')
      else if (d.designation === 'counselor') navigate('/counselor')
      else navigate('/employee')
    } else {
      toast.error(result.error)
    }
  }

  const handleSendOtp = async e => {
    e?.preventDefault()
    if (!fpEmail.trim()) return toast.error('Please enter your email')
    setFpLoading(true)
    try {
      await api.post('/auth/forgot-password/', { email: fpEmail.trim().toLowerCase() })
      toast.success('OTP sent to your email!')
      setView('verify')
    } catch (err) {
      console.error('Forgot password OTP request failed:', err.response?.status, err.response?.data || err.message)
      toast.error(getApiErrorMessage(err, 'Unable to send OTP'))
    } finally {
      setFpLoading(false)
    }
  }

  const handleResetPassword = async e => {
    e.preventDefault()
    if (!fpCode.trim()) return toast.error('Please enter the OTP')
    if (!fpNewPwd.trim()) return toast.error('Please enter a new password')
    if (fpNewPwd !== fpConfirmPwd) return toast.error('Passwords do not match')
    if (fpNewPwd.length < 6) return toast.error('Password must be at least 6 characters')
    setFpLoading(true)
    try {
      await api.post('/auth/reset-password/', {
        email: fpEmail.trim().toLowerCase(),
        otp: fpCode.trim(),
        new_password: fpNewPwd,
      })
      toast.success('Password reset successfully! Please login.')
      setView('login')
      setFpEmail(''); setFpCode(''); setFpNewPwd(''); setFpConfirmPwd('')
    } catch (err) {
      console.error('Password reset failed:', err.response?.status, err.response?.data || err.message)
      toast.error(getApiErrorMessage(err, 'Invalid OTP or reset failed'))
    } finally {
      setFpLoading(false)
    }
  }

  const types = [
    { value: 'admin', label: 'Admin' },
    { value: 'employee', label: 'Employee' },
    { value: 'student', label: 'Student' },
  ]

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body, #root {
      height: 100%;
      overflow: hidden;
    }

    .iie-page {
      height: 100vh;
      width: 100vw;
      display: flex;
      font-family: 'DM Sans', sans-serif;
      background: #0f1b2d;
      position: relative;
      overflow: hidden;
    }

    /* ── LEFT PANEL ── */
    .iie-left {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 48px;
      position: relative;
      z-index: 1;
      overflow: hidden;
    }
    .iie-left-logo {
      background: white;
      border-radius: 20px;
      padding: 16px 24px;
      margin-bottom: 28px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .iie-left-logo img {
      width: 130px;
      height: auto;
      display: block;
    }
    .iie-left h1 {
      font-family: 'Playfair Display', serif;
      font-size: 36px;
      color: white;
      margin-bottom: 12px;
      text-align: center;
      line-height: 1.2;
    }
    .iie-left > p {
      color: rgba(255,255,255,0.55);
      font-size: 13.5px;
      text-align: center;
      max-width: 340px;
      line-height: 1.7;
      margin-bottom: 32px;
    }
    .iie-features {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      max-width: 340px;
    }
    .iie-feature {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 12px 16px;
      backdrop-filter: blur(10px);
    }
    .iie-feature-icon {
      width: 36px; height: 36px;
      border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      color: #fff;
    }
    .iie-feature-text strong {
      display: block;
      color: white;
      font-size: 12.5px;
      font-weight: 600;
    }
    .iie-feature-text span {
      color: rgba(255,255,255,0.45);
      font-size: 11px;
    }

    /* ── RIGHT PANEL ── */
    .iie-right {
      width: 600px;
      flex-shrink: 0;
      background: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 36px 44px;
      position: relative;
      z-index: 1;
      box-shadow: -20px 0 60px rgba(0,0,0,0.3);
      overflow-y: auto;
    }
    .iie-right-inner {
      width: 100%;
      max-width: 340px;
    }
    .iie-right-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
    }
    .iie-right-logo img {
      width: 42px; height: 42px;
      object-fit: contain;
    }
    .iie-right-logo-text strong {
      display: block;
      font-family: 'Playfair Display', serif;
      font-size: 17px;
      color: #0f1b2d;
    }
    .iie-right-logo-text span {
      font-size: 10.5px;
      color: #8099b3;
    }
    .iie-right h2 {
      font-family: 'Playfair Display', serif;
      font-size: 24px;
      color: #0f1b2d;
      margin-bottom: 4px;
    }
    .iie-right-sub {
      color: #8099b3;
      font-size: 12.5px;
      margin-bottom: 20px;
    }

    /* Role tabs */
    .iie-tabs {
      display: flex;
      background: #f0f3f7;
      border-radius: 10px;
      padding: 3px;
      margin-bottom: 20px;
      gap: 2px;
    }
    .iie-tab {
      flex: 1;
      padding: 7px 4px;
      border: none;
      border-radius: 8px;
      background: transparent;
      font-family: 'DM Sans';
      font-size: 11.5px;
      font-weight: 500;
      color: #8099b3;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .iie-tab.active {
      background: #0f1b2d;
      color: white;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(15,27,45,0.25);
    }

    /* Form fields */
    .iie-fg { margin-bottom: 14px; }
    .iie-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #0f1b2d;
      margin-bottom: 5px;
    }
    .iie-input {
      width: 100%;
      padding: 10px 13px;
      border: 1.5px solid #e2e8f0;
      border-radius: 9px;
      font-family: 'DM Sans';
      font-size: 13px;
      color: #0f1b2d;
      background: #f8fafc;
      outline: none;
      transition: all 0.2s;
      box-sizing: border-box;
    }
    .iie-input:focus {
      border-color: #f4a940;
      background: white;
      box-shadow: 0 0 0 3px rgba(244,169,64,0.12);
    }
    .iie-input-wrap { position: relative; }
    .iie-eye {
      position: absolute;
      right: 11px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #8099b3;
      cursor: pointer;
      padding: 0;
      display: flex;
    }

    /* Buttons */
    .iie-btn {
      width: 100%;
      padding: 11px;
      border: none;
      border-radius: 10px;
      background: linear-gradient(135deg, #0f1b2d, #1a2e4a);
      color: white;
      font-family: 'DM Sans';
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
      margin-top: 4px;
    }
    .iie-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #1a2e4a, #243b55);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(15,27,45,0.3);
    }
    .iie-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .iie-btn-amber {
      background: linear-gradient(135deg, #f4a940, #e8843a);
      color: #0f1b2d;
    }
    .iie-btn-amber:hover:not(:disabled) {
      background: linear-gradient(135deg, #fcd17a, #f4a940);
      box-shadow: 0 6px 20px rgba(244,169,64,0.35);
    }

    .iie-forgot {
      background: none; border: none;
      color: #f4a940; font-size: 11.5px;
      font-weight: 600; cursor: pointer;
      font-family: 'DM Sans';
    }
    .iie-forgot:hover { text-decoration: underline; }

    .iie-back {
      background: none; border: none;
      color: #8099b3; font-size: 12px;
      cursor: pointer; font-family: 'DM Sans';
      display: flex; align-items: center; gap: 5px;
      margin: 0 auto;
    }
    .iie-back:hover { color: #0f1b2d; }

    .iie-divider {
      border: none;
      border-top: 1px solid #e9ecef;
      margin: 16px 0;
    }

    .iie-otp-input {
      letter-spacing: 8px;
      font-weight: 700;
      font-size: 20px;
      text-align: center;
    }

    .iie-footer {
      margin-top: 20px;
      text-align: center;
      font-size: 10.5px;
      color: #b8ccdf;
    }

    .iie-icon-circle {
      width: 56px; height: 56px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 14px;
    }

    @media (max-width: 860px) {
      .iie-left { display: none; }
      .iie-right { width: 100%; box-shadow: none; }
    }
  `

  // ── FORGOT PASSWORD ────────────────────────────────────────────────────────
  if (view === 'forgot') {
    return (
      <>
        <style>{styles}</style>
        <div className="iie-page">
          <div className="iie-left">
            <div className="iie-left-logo"><img src={logo} alt="IIE Logo" /></div>
            <h1>Forgot Your<br />Password?</h1>
            <p>No worries! Enter your registered email and we'll send you a one-time OTP to reset your credentials.</p>
          </div>
          <div className="iie-right">
            <div className="iie-right-inner">
              <div className="iie-right-logo">
                <img src={logo} alt="IIE" />
                <div className="iie-right-logo-text">
                  <strong>IIE Pulse</strong>
                  <span>Indra Institute of Education</span>
                </div>
              </div>
              <h2>Reset Password</h2>
              <p className="iie-right-sub">Enter your registered email to receive an OTP</p>
              <div className="iie-icon-circle" style={{ background: 'rgba(244,169,64,0.1)' }}>
                <Mail size={26} color="#f4a940" />
              </div>
              <form onSubmit={handleSendOtp}>
                <div className="iie-fg">
                  <label className="iie-label">Email Address</label>
                  <input className="iie-input" type="email" placeholder="your@email.com"
                    value={fpEmail} onChange={e => setFpEmail(e.target.value)} autoFocus required />
                </div>
                <button className="iie-btn iie-btn-amber" type="submit" disabled={fpLoading}>
                  <Mail size={15} />
                  {fpLoading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </form>
              <hr className="iie-divider" />
              <button className="iie-back" onClick={() => setView('login')}>
                <ArrowLeft size={13} /> Back to Login
              </button>
              <div className="iie-footer">IIE Pulse © 2025 — All rights reserved</div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── VERIFY OTP ─────────────────────────────────────────────────────────────
  if (view === 'verify') {
    return (
      <>
        <style>{styles}</style>
        <div className="iie-page">
          <div className="iie-left">
            <div className="iie-left-logo"><img src={logo} alt="IIE Logo" /></div>
            <h1>Check Your<br />Email</h1>
            <p>We've sent a 6-digit OTP to <strong style={{ color: '#f4a940' }}>{fpEmail}</strong>. Enter it below with your new password.</p>
          </div>
          <div className="iie-right">
            <div className="iie-right-inner">
              <div className="iie-right-logo">
                <img src={logo} alt="IIE" />
                <div className="iie-right-logo-text">
                  <strong>IIE Pulse</strong>
                  <span>Indra Institute of Education</span>
                </div>
              </div>
              <h2>Enter OTP</h2>
              <p className="iie-right-sub">OTP sent to <strong>{fpEmail}</strong></p>
              <div className="iie-icon-circle" style={{ background: 'rgba(76,175,129,0.1)' }}>
                <KeyRound size={26} color="#4caf81" />
              </div>
              <form onSubmit={handleResetPassword}>
                <div className="iie-fg">
                  <label className="iie-label">OTP Code</label>
                  <input className="iie-input iie-otp-input" placeholder="000000"
                    value={fpCode} onChange={e => setFpCode(e.target.value)}
                    maxLength={6} autoFocus required />
                </div>
                <div className="iie-fg">
                  <label className="iie-label">New Password</label>
                  <div className="iie-input-wrap">
                    <input className="iie-input" type={showNewPwd ? 'text' : 'password'}
                      placeholder="Min 6 characters" value={fpNewPwd}
                      onChange={e => setFpNewPwd(e.target.value)}
                      style={{ paddingRight: 38 }} required />
                    <button type="button" className="iie-eye" onClick={() => setShowNewPwd(v => !v)}>
                      {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div className="iie-fg">
                  <label className="iie-label">Confirm Password</label>
                  <input className="iie-input" type="password" placeholder="Repeat new password"
                    value={fpConfirmPwd} onChange={e => setFpConfirmPwd(e.target.value)} required />
                  {fpConfirmPwd && fpNewPwd !== fpConfirmPwd && (
                    <small style={{ color: '#e84855', fontSize: 11, marginTop: 3, display: 'block' }}>✕ Passwords do not match</small>
                  )}
                  {fpConfirmPwd && fpNewPwd === fpConfirmPwd && (
                    <small style={{ color: '#4caf81', fontSize: 11, marginTop: 3, display: 'block' }}>✓ Passwords match</small>
                  )}
                </div>
                <button className="iie-btn" type="submit"
                  disabled={fpLoading || (fpConfirmPwd && fpNewPwd !== fpConfirmPwd)}>
                  <KeyRound size={15} />
                  {fpLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
              <hr className="iie-divider" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button className="iie-back" onClick={() => setView('forgot')}>
                  <ArrowLeft size={13} /> Change Email
                </button>
                <button onClick={handleSendOtp} disabled={fpLoading}
                  style={{ background: 'none', border: 'none', color: '#f4a940', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans' }}>
                  Resend OTP
                </button>
              </div>
              <div className="iie-footer">IIE Pulse © 2025 — All rights reserved</div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="iie-page">
        {/* Left Panel */}
        <div className="iie-left">
          <div className="iie-left-logo">
            <img src={logo} alt="IIE Logo" />
          </div>
          <h1>Welcome to<br />IIE Pulse</h1>
          <p>Your all-in-one platform for managing students, staff, batches, and academic progress at Indra Institute of Education.</p>
          <div className="iie-features">
            <div className="iie-feature">
              <div className="iie-feature-icon" style={{ background: 'rgba(244,169,64,0.18)' }}><GraduationCap size={18} /></div>
              <div className="iie-feature-text">
                <strong>Student Management</strong>
                <span>Track attendance, sessions & progress</span>
              </div>
            </div>
            <div className="iie-feature">
              <div className="iie-feature-icon" style={{ background: 'rgba(46,196,182,0.18)' }}><ShieldCheck size={18} /></div>
              <div className="iie-feature-text">
                <strong>Tests & Quizzes</strong>
                <span>Assign and evaluate with ease</span>
              </div>
            </div>
            <div className="iie-feature">
              <div className="iie-feature-icon" style={{ background: 'rgba(76,175,129,0.18)' }}><Users size={18} /></div>
              <div className="iie-feature-text">
                <strong>Announcements</strong>
                <span>Reach students & staff instantly</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="iie-right">
          <div className="iie-right-inner">
            <div className="iie-right-logo">
              <img src={logo} alt="IIE" />
              <div className="iie-right-logo-text">
                <strong>IIE Pulse</strong>
                <span>Indra Institute of Education</span>
              </div>
            </div>
            <h2>Sign In</h2>
            <p className="iie-right-sub">Select your role and enter your credentials</p>

            <div className="iie-tabs">
              {types.map(t => (
                <button key={t.value} className={`iie-tab${form.user_type === t.value ? ' active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, user_type: t.value }))} type="button">
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="iie-fg">
                <label className="iie-label">Username / Email</label>
                <input className="iie-input" placeholder="Enter your username or email"
                  value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} autoFocus />
              </div>
              <div className="iie-fg">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <label className="iie-label" style={{ margin: 0 }}>Password</label>
                  <button type="button" className="iie-forgot" onClick={() => setView('forgot')}>
                    Forgot Password?
                  </button>
                </div>
                <div className="iie-input-wrap">
                  <input className="iie-input" type={showPwd ? 'text' : 'password'}
                    placeholder="Enter your password" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    style={{ paddingRight: 38 }} />
                  <button type="button" className="iie-eye" onClick={() => setShowPwd(v => !v)}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button className="iie-btn" type="submit" disabled={loading}>
                <LogIn size={15} />
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: '#8099b3' }}>
              New to IIE Pulse?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                style={{ border: 0, background: 'none', padding: 0, color: '#f4a940', font: '600 12px DM Sans', cursor: 'pointer' }}
              >
                Register to Join
              </button>
            </div>

            <div className="iie-footer">IIE Pulse © 2025 — All rights reserved</div>
          </div>
        </div>
      </div>
    </>
  )
}
