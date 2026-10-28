import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CheckCircle2, ChevronLeft, ChevronRight, LogIn, MapPin, Sparkles, UserPlus } from 'lucide-react'
import api, { getApiErrorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { IIEProudCarousel, StudentPageHeader, StudentSectionHeader, StudentStyles } from '../student/StudentPages'
import logo from '../../assets/IIE.png'
import heroStudents from '../../assets/hero-students.png'

const branchOptions = [
  { value: '100ft', label: '100FT' },
  { value: 'hopes', label: 'Hopes' },
  { value: 'kuniyamuthur', label: 'Kuniyamuthur' },
]

const sourceOptions = ['Google', 'Facebook', 'Instagram', 'LinkedIn', 'Friends', 'Others']

const accessStyles = `
  .public-access { min-height: 100vh; background: #f4f7fb; color: #10213a; font-family: 'Public Sans', Arial, sans-serif; }
  .public-nav { height: 68px; display: flex; align-items: center; justify-content: space-between; padding: 0 clamp(20px, 5vw, 76px); background: #fff; border-bottom: 1px solid #dfe7f1; }
  .public-brand { display: inline-flex; align-items: center; gap: 10px; min-width: 0; }
  .public-brand img { width: 42px; height: 42px; object-fit: contain; border-radius: 8px; background: #fff; }
  .public-brand strong { display: block; font-family: Georgia, serif; font-size: 19px; color: #10213a; }
  .public-brand span { display: block; margin-top: 1px; color: #617089; font-size: 11px; }
  .public-nav-action, .public-button { border: 0; border-radius: 7px; font: inherit; font-weight: 700; cursor: pointer; transition: .18s ease; }
  .public-nav-action { min-height: 36px; padding: 0 14px; color: #fff; background: #5523d2; font-size: 13px; }
  .public-nav-action:hover { background: #4218ae; }
  .public-hero { min-height: calc(100vh - 68px); display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(350px, .95fr); gap: clamp(28px, 6vw, 94px); align-items: center; max-width: 1280px; margin: 0 auto; padding: clamp(48px, 7vw, 94px) clamp(20px, 5vw, 76px); }
  .public-kicker { display: inline-flex; align-items: center; gap: 7px; color: #9a6419; background: #fff0d7; border-radius: 999px; padding: 7px 11px; font-size: 12px; font-weight: 800; }
  .public-hero h1 { max-width: 690px; margin: 18px 0 14px; font-family: Georgia, serif; font-size: clamp(39px, 5vw, 64px); line-height: 1.04; color: #10213a; }
  .public-hero p { max-width: 600px; margin: 0; color: #5f6f87; font-size: 17px; line-height: 1.65; }
  .public-hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
  .public-button { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 18px; background: #5523d2; color: #fff; font-size: 14px; }
  .public-button:hover { background: #4218ae; transform: translateY(-1px); box-shadow: 0 8px 18px rgba(85,35,210,.24); }
  .public-button.secondary { color: #253b5b; background: #fff; border: 1px solid #cdd9e8; }
  .public-button.secondary:hover { background: #f7faff; box-shadow: none; }
  .public-hero-visual { position: relative; min-height: 500px; display: grid; align-content: end; padding: 26px; background: #10213a; border-radius: 8px; overflow: hidden; box-shadow: 0 24px 58px rgba(16,33,58,.22); }
  .public-hero-visual::before { content: ''; position: absolute; top: 0; right: 0; width: 58%; height: 100%; background: #183153; }
  .public-hero-photo { position: absolute; inset: 0 0 auto auto; width: 78%; height: 61%; object-fit: cover; object-position: center; opacity: .9; }
  .public-hero-photo-mask { position: absolute; inset: 0 0 auto auto; width: 78%; height: 61%; border-left: 5px solid #f4a940; border-bottom: 5px solid #f4a940; }
  .public-location { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 7px; width: max-content; max-width: 100%; padding: 7px 10px; background: #f4a940; color: #10213a; border-radius: 5px; font-size: 12px; font-weight: 800; }
  .public-highlight { position: relative; z-index: 1; width: min(100%, 390px); margin-top: 18px; padding: 24px; background: #fff; color: #10213a; border-radius: 7px; box-shadow: 0 12px 28px rgba(0,0,0,.16); }
  .public-highlight h2 { margin: 0 0 8px; font-family: Georgia, serif; font-size: 25px; }
  .public-highlight p { color: #60708a; font-size: 13px; line-height: 1.6; }
  .public-checks { display: grid; gap: 11px; margin-top: 18px; }
  .public-check { display: flex; align-items: center; gap: 9px; font-size: 12.5px; color: #344863; }
  .public-check svg { flex: 0 0 auto; color: #5523d2; }
  .public-steps { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 34px; color: #53657e; font-size: 12px; font-weight: 700; }
  .public-step { display: inline-flex; align-items: center; gap: 8px; }
  .public-step b { display: grid; place-items: center; width: 23px; height: 23px; border: 1px solid #b8c7d9; border-radius: 50%; color: #5523d2; font-size: 11px; }
  .public-register { min-height: 100vh; padding: 34px 20px 54px; background: #f4f7fb; }
  .public-register-shell { width: min(100%, 900px); margin: 0 auto; }
  .public-register-top { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
  .public-register-card { background: #fff; border: 1px solid #dfe7f1; border-radius: 8px; overflow: hidden; box-shadow: 0 16px 42px rgba(32,54,84,.08); }
  .public-register-heading { padding: 26px 30px; background: #10213a; color: #fff; }
  .public-register-heading h1 { margin: 0 0 7px; font-family: Georgia, serif; font-size: 29px; }
  .public-register-heading p { margin: 0; color: rgba(255,255,255,.7); font-size: 13px; }
  .public-form { padding: 28px 30px 32px; }
  .public-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
  .public-field { min-width: 0; }
  .public-field.full { grid-column: 1 / -1; }
  .public-field label { display: block; margin: 0 0 6px; color: #263d5e; font-size: 13px; font-weight: 800; }
  .public-field input, .public-field select { width: 100%; height: 43px; padding: 0 12px; border: 1px solid #cfdbe9; border-radius: 6px; outline: none; color: #152a47; background: #fff; font: inherit; font-size: 14px; }
  .public-field input:focus, .public-field select:focus { border-color: #5523d2; box-shadow: 0 0 0 3px rgba(85,35,210,.12); }
  .public-location-hint { margin: 6px 0 0; color: #617089; font-size: 12px; line-height: 1.4; }
  .public-portal { min-height: 100vh; background: #f4f7fb; color: #10213a; font-family: 'Public Sans', Arial, sans-serif; }
  .public-portal-main { width: min(100% - 40px, 1160px); margin: 0 auto; padding: 30px 0 54px; }
  .public-portal-nav { display: flex; gap: 8px; overflow-x: auto; padding: 14px 0 20px; }
  .public-portal-nav button { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 7px; min-height: 38px; padding: 0 13px; border: 1px solid #d7e1ec; border-radius: 7px; background: #fff; color: #405573; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
  .public-portal-nav button.is-active { background: #5523d2; border-color: #5523d2; color: #fff; }
  .public-portal-hero { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(260px, .8fr); gap: 22px; padding: 30px; background: #10213a; color: #fff; border-radius: 8px; }
  .public-portal-kicker { margin: 0; color: #fcd17a; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
  .public-portal-hero h1 { margin: 9px 0; font: 700 34px/1.15 Georgia, serif; }
  .public-portal-hero p { margin: 0; max-width: 580px; color: rgba(255,255,255,.72); font-size: 14px; line-height: 1.7; }
  .public-portal-status { align-self: center; padding: 18px; border: 1px solid rgba(255,255,255,.17); border-radius: 7px; background: rgba(255,255,255,.06); }
  .public-portal-status b { display: block; margin-bottom: 7px; font-size: 15px; }.public-portal-status span { color: rgba(255,255,255,.7); font-size: 13px; line-height: 1.55; }
  .public-portal-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-top: 20px; }
  .public-portal-card { min-width: 0; padding: 20px; background: #fff; border: 1px solid #dfe7f1; border-radius: 8px; }.public-portal-card h2 { margin: 0 0 8px; font: 700 20px/1.25 Georgia, serif; }.public-portal-card p { margin: 0; color: #617089; font-size: 13px; line-height: 1.6; }
  .public-portal-count { margin-top: 14px; color: #5523d2; font-size: 28px; font-weight: 800; }
  .public-portal-list { display: grid; gap: 10px; margin-top: 16px; }.public-portal-list-item { padding: 13px 14px; border: 1px solid #e1e8f1; border-radius: 7px; background: #fff; }.public-portal-list-item b { display: block; color: #1e3555; font-size: 14px; }.public-portal-list-item span { display: block; margin-top: 4px; color: #687991; font-size: 12px; }
  .public-gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; margin-top: 16px; }.public-gallery-grid img { width: 100%; aspect-ratio: 1.35; object-fit: cover; border-radius: 7px; background: #e9eff6; }
  .public-feature-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, .9fr); gap: 16px; margin-top: 20px; }.public-proud-slide { position: relative; min-height: 254px; overflow: hidden; padding: 28px; border: 1px solid #dfe7f1; border-radius: 8px; background: #fff; }.public-proud-kicker { display: inline-flex; padding: 6px 10px; border-radius: 999px; background: #eee7ff; color: #5523d2; font-size: 12px; font-weight: 800; }.public-proud-slide h2 { margin: 18px 0 8px; max-width: 360px; font: 700 32px/1.1 Georgia, serif; color: #10213a; }.public-proud-slide h2 span { color: #5523d2; }.public-proud-slide p { max-width: 350px; margin: 0; color: #617089; font-size: 14px; line-height: 1.55; }.public-proud-note { margin-top: 14px !important; font-weight: 800; color: #5523d2 !important; }.public-proud-icon { position: absolute; right: 28px; bottom: 26px; display: grid; place-items: center; width: 76px; height: 76px; border-radius: 50%; background: #5523d2; color: #fff; font-size: 29px; }.public-live-news { overflow: hidden; padding: 0; }.public-live-news-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 17px 18px; border-bottom: 1px solid #e1e8f1; }.public-live-news-head h2 { margin: 0; font: 700 20px/1.2 Georgia, serif; }.public-news-story { min-height: 195px; padding: 18px; }.public-news-story-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: #657792; font-size: 12px; }.public-news-source { color: #5523d2; font-weight: 800; }.public-news-story h3 { display: -webkit-box; margin: 13px 0 8px; overflow: hidden; color: #1e3555; font-size: 16px; line-height: 1.35; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }.public-news-story p { display: -webkit-box; margin: 0; overflow: hidden; color: #617089; font-size: 13px; line-height: 1.55; -webkit-line-clamp: 3; -webkit-box-orient: vertical; }.public-news-controls { display: flex; gap: 7px; }.public-news-controls button { display: grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 1px solid #d7e1ec; border-radius: 6px; background: #fff; color: #405573; cursor: pointer; }.public-news-read { display: inline-block; margin-top: 13px; color: #5523d2; font-size: 13px; font-weight: 800; text-decoration: none; }
  @media (max-width: 760px) { .public-portal-main { width: min(100% - 28px, 1160px); padding-top: 18px; }.public-portal-hero { grid-template-columns: 1fr; padding: 22px; }.public-portal-hero h1 { font-size: 29px; }.public-portal-grid, .public-feature-grid { grid-template-columns: 1fr; } }
  .public-form-foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 26px; padding-top: 20px; border-top: 1px solid #e4ebf3; }
  .public-form-foot p { margin: 0; color: #5f6f87; font-size: 13px; }
  .public-form-foot button { min-width: 164px; }
  @media (max-width: 760px) { .public-hero { grid-template-columns: 1fr; padding-top: 52px; } .public-hero-visual { min-height: 430px; } .public-form, .public-register-heading { padding-left: 20px; padding-right: 20px; } .public-form-grid { grid-template-columns: 1fr; } .public-field.full { grid-column: auto; } .public-form-foot { align-items: stretch; flex-direction: column; } .public-form-foot button { width: 100%; } }
  @media (max-width: 500px) { .public-brand span { display: none; } .public-nav { padding: 0 16px; } .public-nav-action { padding: 0 10px; font-size: 12px; } .public-hero h1 { font-size: 38px; } }
`

function Brand() {
  return <div className="public-brand"><img src={logo} alt="IIE Pulse" /><div><strong>IIE Pulse</strong><span>Indra Institute of Education</span></div></div>
}

export function PublicLanding() {
  const navigate = useNavigate()
  return <div className="public-access">
    <style>{accessStyles}</style>
    <header className="public-nav">
      <Brand />
      <button type="button" className="public-nav-action" onClick={() => navigate('/login')}>Existing user? Sign In</button>
    </header>
    <main className="public-hero">
      <section>
        <div className="public-kicker"><Sparkles size={15} /> Indra Institute of Education</div>
        <h1>Start your learning journey with IIE Pulse.</h1>
        <p>Register your interest, choose your nearest branch, and our counselor will connect with you about the right program.</p>
        <div className="public-hero-actions">
          <button type="button" className="public-button" onClick={() => navigate('/register')}><UserPlus size={17} /> Register Now</button>
          <button type="button" className="public-button secondary" onClick={() => navigate('/login')}><LogIn size={17} /> Sign In</button>
        </div>
        <div className="public-steps"><span className="public-step"><b>1</b> Register</span><span className="public-step"><b>2</b> Select branch</span><span className="public-step"><b>3</b> Get connected</span></div>
      </section>
      <aside className="public-hero-visual">
        <img className="public-hero-photo" src={heroStudents} alt="IIE Pulse students learning together" />
        <div className="public-hero-photo-mask" />
        <div className="public-location"><MapPin size={15} /> Choose your nearest IIE branch</div>
        <div className="public-highlight">
          <h2>One registration. Clear next steps.</h2>
          <p>Your submitted details reach the counselor for your selected branch, so follow-up stays relevant and simple.</p>
          <div className="public-checks">
            <div className="public-check"><CheckCircle2 size={16} /> Select 100FT, Hopes, or Kuniyamuthur</div>
            <div className="public-check"><CheckCircle2 size={16} /> Tell us your area of interest</div>
            <div className="public-check"><CheckCircle2 size={16} /> Create your IIE Pulse login</div>
          </div>
        </div>
      </aside>
    </main>
  </div>
}

const readableDate = value => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const publicProudSlides = [
  { kicker: 'IIE Pulse', title: 'Welcome', highlight: 'IIE', subtitle: 'Your success starts here.', icon: 'fa-graduation-cap', color: '#5523d2', softColor: '#eee7ff' },
  { kicker: 'IIE Prouds', title: 'ISO Certified', subtitle: 'Quality You Can Trust', note: 'ISO 9001:2015 Certified', icon: 'fa-certificate', color: '#0ea5e9', softColor: '#e0f2fe' },
  { kicker: 'IIE Prouds', title: 'Career Help', subtitle: 'Skills to Jobs', note: 'Train • Guide • Place', icon: 'fa-briefcase', color: '#16a34a', softColor: '#dcfce7' },
  { kicker: 'IIE Prouds', title: '60K+', subtitle: 'Learners', note: 'Learn • Grow • Win', icon: 'fa-users', color: '#f59e0b', softColor: '#fef3c7' },
  { kicker: 'IIE Prouds', title: 'Our Vision', subtitle: 'Building Skills for a Better Future', note: 'Learn. Grow. Succeed.', icon: 'fa-rocket', color: '#ec4899', softColor: '#fce7f3' },
]

export function PublicUserPortal() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [quizzes, setQuizzes] = useState([])
  const [news, setNews] = useState([])
  const [gallery, setGallery] = useState([])
  const [proudIndex, setProudIndex] = useState(0)
  const [newsIndex, setNewsIndex] = useState(0)

  useEffect(() => {
    let active = true
    const loadPublicContent = async () => {
      const [quizResult, newsResult, galleryResult] = await Promise.allSettled([
        api.get('/quiz/practice/'),
        api.get('/news/'),
        api.get('/gallery/'),
      ])
      if (!active) return
      if (quizResult.status === 'fulfilled') setQuizzes(quizResult.value.data?.results || quizResult.value.data || [])
      if (newsResult.status === 'fulfilled') setNews(newsResult.value.data?.results || newsResult.value.data || [])
      if (galleryResult.status === 'fulfilled') setGallery(galleryResult.value.data?.results || galleryResult.value.data || [])
      setLoading(false)
    }
    loadPublicContent()
    return () => { active = false }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setProudIndex(index => (index + 1) % publicProudSlides.length), 5000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (news.length <= 1) return undefined
    const timer = window.setInterval(() => setNewsIndex(index => (index + 1) % news.length), 5500)
    return () => window.clearInterval(timer)
  }, [news.length])

  const name = user?.name || user?.username || 'Learner'
  const activeView = location.pathname.split('/').filter(Boolean).pop() || 'overview'
  const renderContent = () => {
    if (activeView === 'skillset') {
      return <section className="public-portal-card public-portal-wide"><h2>Skillset quizzes</h2><p>Practice quizzes published for public learners appear here.</p>
        <div className="public-portal-list">{quizzes.length ? quizzes.map(quiz => <div className="public-portal-list-item" key={quiz.id}><b title={quiz.title}>{quiz.title || 'Skillset Quiz'}</b><span>{quiz.total_questions || 0} questions{quiz.duration_minutes ? ` · ${quiz.duration_minutes} minutes` : ''}</span></div>) : <div className="public-portal-list-item"><b>No skillset quizzes yet</b><span>Please check again after a quiz is published.</span></div>}</div>
      </section>
    }
    if (activeView === 'news') {
      return <section className="public-portal-card public-portal-wide"><h2>Latest news</h2><p>Current learning and technology updates from IIE Pulse.</p>
        <div className="public-portal-list">{news.length ? news.slice(0, 12).map(item => <div className="public-portal-list-item" key={item.id || item.title}><b title={item.title}>{item.title || 'IIE Pulse update'}</b><span>{item.category || 'Technology'}{readableDate(item.published_at || item.created_at) ? ` · ${readableDate(item.published_at || item.created_at)}` : ''}</span></div>) : <div className="public-portal-list-item"><b>No news updates yet</b><span>New updates will appear here when available.</span></div>}</div>
      </section>
    }
    if (activeView === 'gallery') {
      return <section className="public-portal-card public-portal-wide"><h2>IIE Pulse gallery</h2><p>A look at the learning environment and institute activities.</p>
        <div className="public-gallery-grid">{gallery.length ? gallery.slice(0, 18).map(item => <img key={item.id || item.image} src={item.image} alt={item.title || 'IIE Pulse gallery'} />) : <div className="public-portal-list-item"><b>No gallery items yet</b><span>New gallery images will appear here.</span></div>}</div>
      </section>
    }
    if (activeView === 'contact') {
      return <section className="public-portal-card public-portal-wide"><h2>Contact IIE Pulse</h2><p>Our team will help you with course details, admission guidance, and your public registration.</p>
        <div className="public-portal-grid"><div className="public-portal-card"><h2>Call us</h2><p>+91 91597 79111</p></div><div className="public-portal-card"><h2>Visit a branch</h2><p>100FT, Hopes, or Kuniyamuthur</p></div><div className="public-portal-card"><h2>Your registration</h2><p>Your selected branch counselor will follow up with you.</p></div></div>
      </section>
    }
    const activeNews = news[newsIndex] || news[0]
    const stats = [
      { label: 'Skillset Quizzes', value: loading ? '...' : quizzes.length, icon: 'fa-question-circle', color: '#2ec4b6', bgColor: 'rgba(46,196,182,0.1)', to: '/public/skillset' },
      { label: 'News', value: loading ? '...' : news.length, icon: 'fa-newspaper', color: '#5523d2', bgColor: 'rgba(85,35,210,0.1)', to: '/public/news' },
      { label: 'Gallery', value: loading ? '...' : gallery.length, icon: 'fa-images', color: '#f4a940', bgColor: 'rgba(244,169,64,0.1)', to: '/public/gallery' },
      { label: 'Student Desk', value: '—', icon: 'fa-lock', color: '#8099b3', bgColor: 'rgba(128,153,179,0.12)', to: '/public/restricted?module=Student%20Desk' },
    ]
    return <><StudentPageHeader title={`👋 Welcome, ${name}!`} sub="Public learner account · Complete enrollment to unlock academic modules" /><IIEProudCarousel activeIndex={proudIndex} />
      <div className="student-card student-live-news-card"><StudentSectionHeader title="📰 Live Technology News" count={news.length} actions={<button className="student-news-refresh" type="button" onClick={() => window.location.reload()}><i className="fas fa-sync-alt" /> Refresh</button>} /><div className="student-live-news-body">{activeNews ? <div><div className="student-news-carousel"><button type="button" className="student-news-control" aria-label="Previous news" onClick={() => setNewsIndex(index => (index - 1 + news.length) % news.length)} disabled={news.length <= 1}><ChevronLeft size={16} /></button><div className="student-news-slide-window"><article className="student-news-slide"><div className="student-news-icon"><i className="fas fa-bolt" /></div><div className="student-news-content"><div className="student-news-meta"><div className="student-news-source"><span>{activeNews.source || 'Google News'}</span><span className="student-news-badge">Latest</span></div><span>{readableDate(activeNews.published_at || activeNews.publishedDate || activeNews.created_at) || 'Live'}</span></div><h6 title={activeNews.title}>{activeNews.title || 'Latest technology update'}</h6><p>{activeNews.message || 'Latest technology update from IIE Pulse.'}</p>{(activeNews.original_url || activeNews.originalUrl) && <a href={activeNews.original_url || activeNews.originalUrl} target="_blank" rel="noreferrer" className="student-news-link">Read more <i className="fas fa-arrow-up-right-from-square" /></a>}</div></article></div><button type="button" className="student-news-control" aria-label="Next news" onClick={() => setNewsIndex(index => (index + 1) % news.length)} disabled={news.length <= 1}><ChevronRight size={16} /></button></div><div className="student-news-dots">{news.slice(0, 4).map((item, index) => <button key={item.id || index} type="button" className={`student-news-dot ${newsIndex === index ? 'active' : ''}`} onClick={() => setNewsIndex(index)} />)}</div></div> : <div className="student-empty"><i className="fas fa-newspaper" /><p>{loading ? 'Loading live news...' : 'No live news available right now.'}</p></div>}</div></div>
      <div className="student-stat-grid">{stats.map(stat => <div key={stat.label} className="student-stat-card" onClick={() => navigate(stat.to)} style={{ cursor: 'pointer' }}><div className="student-stat-icon" style={{ background: stat.bgColor, color: stat.color }}><i className={`fas ${stat.icon}`} /></div><div style={{ flex: 1 }}><div className="student-stat-value">{stat.value}</div><div className="student-stat-label">{stat.label}</div></div><i className="fas fa-arrow-right" style={{ color: stat.color, opacity: .55 }} /></div>)}</div>
      <div className="student-card"><StudentSectionHeader title="📢 Public Updates" count={news.length} /><div className="public-portal-list">{news.slice(0, 4).map(item => <div className="public-portal-list-item" key={item.id || item.title}><b title={item.title}>{item.title || 'IIE Pulse update'}</b><span>{item.message || 'Latest update from IIE Pulse.'}</span></div>)}</div></div>
    </>
  }

  return <div className="public-portal student-root"><StudentStyles /><style>{accessStyles}</style><main className="public-portal-main">{renderContent()}</main></div>
}

export function PublicRestrictedPage() {
  const navigate = useNavigate()
  const moduleName = new URLSearchParams(useLocation().search).get('module') || 'This page'

  useEffect(() => {
    toast.error(`${moduleName} is available after enrollment is completed.`)
  }, [moduleName])

  return <div className="public-portal"><style>{accessStyles}</style><main className="public-portal-main"><section className="public-portal-hero"><div><p className="public-portal-kicker">Access restricted</p><h1>{moduleName} is available after enrollment.</h1><p>Your registration has reached the counselor for your selected branch. Student-only pages unlock when your admission is completed.</p></div><div className="public-portal-status"><b>Public learner account</b><span>You can continue using Skillset, News, Gallery, and Contact Us while your enrollment is in progress.</span><button type="button" className="public-button" style={{ marginTop: 16 }} onClick={() => navigate('/public')}>Back to Public Home</button></div></section></main></div>
}

const initialForm = { name: '', email: '', mobile: '', qualification: '', area_of_interest: '', branch: '', source: '', pincode: '', location: '', city: '', state: '' }

export function PublicRegistration() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [locationHint, setLocationHint] = useState('')
  const [findingLocation, setFindingLocation] = useState(false)
  const update = (field, value) => setForm(current => ({ ...current, [field]: value }))

  useEffect(() => {
    const pincode = form.pincode.replace(/\D/g, '').slice(0, 6)
    if (!/^\d{6}$/.test(pincode)) {
      setFindingLocation(false)
      setLocationHint(pincode ? 'Enter a 6 digit pincode to find your area.' : '')
      return
    }

    let active = true
    const findLocation = async () => {
      setFindingLocation(true)
      setLocationHint('Finding area, city and state...')
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
        const data = await response.json()
        const office = data?.[0]?.PostOffice?.[0]
        if (!active) return
        if (office) {
          setForm(current => ({
            ...current,
            location: office.Name || current.location,
            city: office.District || '',
            state: office.State || '',
          }))
          setLocationHint(`${office.Name || 'Area'}, ${office.District || 'City'}, ${office.State || 'State'}`)
        } else {
          setLocationHint('Pincode was not found. Please enter your area manually.')
        }
      } catch {
        if (active) setLocationHint('Could not find this pincode. Please enter your area manually.')
      } finally {
        if (active) setFindingLocation(false)
      }
    }

    findLocation()
    return () => { active = false }
  }, [form.pincode])

  const submit = async event => {
    event.preventDefault()
    const required = ['name', 'email', 'mobile', 'qualification', 'area_of_interest', 'branch', 'source', 'pincode', 'location']
    if (required.some(field => !String(form[field]).trim())) return toast.error('Please complete all registration fields')

    setSubmitting(true)
    try {
      await api.post('/public-users/register/', {
        ...form,
        email: form.email.trim().toLowerCase(),
        mobile: form.mobile.replace(/\D/g, ''),
        username: form.email.trim().toLowerCase(),
        password: form.mobile.replace(/\D/g, ''),
        source: form.source.toLowerCase(),
      })
      toast.success('Registration completed successfully.')
      setForm(initialForm)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Registration failed. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="public-register">
    <style>{accessStyles}</style>
    <div className="public-register-shell">
      <div className="public-register-top"><Brand /><button type="button" className="public-nav-action" onClick={() => navigate('/login')}>Existing user? Sign In</button></div>
      <main className="public-register-card">
        <div className="public-register-heading"><h1>Register to Join</h1><p>Create your public IIE Pulse account and send your details to the right branch counselor.</p></div>
        <form className="public-form" onSubmit={submit}>
          <div className="public-form-grid">
            <Field label="Full Name" value={form.name} onChange={value => update('name', value)} autoComplete="name" />
            <Field label="Email Address" type="email" value={form.email} onChange={value => update('email', value)} autoComplete="email" />
            <Field label="Mobile Number" type="tel" value={form.mobile} onChange={value => update('mobile', value)} autoComplete="tel" />
            <Field label="Qualification" value={form.qualification} onChange={value => update('qualification', value)} />
            <Field label="Area of Interest" placeholder="Example: Python, Java" value={form.area_of_interest} onChange={value => update('area_of_interest', value)} />
            <SelectField label="Branch" value={form.branch} onChange={value => update('branch', value)} options={branchOptions} placeholder="Choose Branch" />
            <SelectField label="How did you hear about us?" value={form.source} onChange={value => update('source', value)} options={sourceOptions.map(option => ({ value: option.toLowerCase(), label: option }))} placeholder="Choose Source" />
            <Field label="Pincode" value={form.pincode} onChange={value => update('pincode', value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" />
            <div className="public-field">
              <label>Area</label>
              <input value={form.location} onChange={event => update('location', event.target.value)} required />
              {locationHint && <p className="public-location-hint">{findingLocation ? 'Finding area...' : locationHint}</p>}
            </div>
          </div>
          <div className="public-form-foot"><p><strong>Login details:</strong> Email ID is your username and mobile number is your password.</p><button className="public-button" type="submit" disabled={submitting}>{submitting ? 'Submitting...' : <><UserPlus size={17} /> Register Now</>}</button></div>
        </form>
      </main>
    </div>
  </div>
}

function Field({ label, value, onChange, type = 'text', ...props }) {
  return <div className="public-field"><label>{label}</label><input type={type} value={value} onChange={event => onChange(event.target.value)} required {...props} /></div>
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return <div className="public-field"><label>{label}</label><select value={value} onChange={event => onChange(event.target.value)} required><option value="">{placeholder}</option>{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
}
