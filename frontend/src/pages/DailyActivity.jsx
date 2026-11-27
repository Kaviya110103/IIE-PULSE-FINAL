import { useEffect, useRef, useState } from 'react'
import api from '../api/client'
import './daily-activity.css'

const categories = ['Aptitude', 'Grammar', 'Behaviour']
const csvHeader = 'Questions,Option A,Option B,Option C,Option D,Correct Answer,Explaination'
const date = value => new Date(value).toLocaleDateString('en-IN')
const errorText = err => {
  const body = err.response?.data
  return (Array.isArray(body) ? body.join(' ') : body?.detail) || 'Unable to complete this request. Please try again.'
}

export default function DailyActivity({ staff = false }) {
  const [data, setData] = useState(null)
  const [tab, setTab] = useState(categories[0])
  const [unread, setUnread] = useState([])
  const [active, setActive] = useState(null)
  const [answers, setAnswers] = useState([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const locked = useRef(false)
  const refresh = async () => {
    const list = await api.get('/daily-activity/')
    setData(list.data)
    if (!staff) setUnread((await api.get('/daily-activity/inbox/')).data.unread)
  }
  useEffect(() => { refresh().catch(err => setMessage(errorText(err))) }, [staff])
  const run = async fn => {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    setMessage('')
    try { await fn() } catch (err) { setMessage(errorText(err)) }
    finally { locked.current = false; setBusy(false) }
  }
  const open = async row => {
    const detail = (await api.get('/daily-activity/' + row.id + '/')).data
    setActive({ ...detail, id: row.id, category: row.category })
    setAnswers(Array(detail.questions.length).fill(null))
  }
  const upload = event => {
    event.preventDefault()
    const form = event.currentTarget
    run(async () => {
      await api.post('/daily-activity/', new FormData(form))
      form.reset()
      await refresh()
      setMessage('Challenge published.')
    })
  }
  const submit = () => run(async () => {
    await api.post('/daily-activity/' + active.id + '/', { answers })
    setActive(null)
    setTab('Results')
    await refresh()
    setMessage('Challenge submitted.')
  })
  const visibleChallenges = (data?.challenges || []).filter(c => staff || (c.category === tab && !c.completed))
  const seenIds = !staff && !active ? visibleChallenges.filter(c => unread.includes(c.id)).map(c => c.id).join(',') : ''
  useEffect(() => {
    if (!seenIds || document.hidden) return
    const ids = seenIds.split(',').map(Number)
    api.post('/daily-activity/inbox/', { ids }).then(() => {
      setUnread(prev => prev.filter(id => !ids.includes(id)))
      window.dispatchEvent(new Event('daily-activity-viewed'))
    }).catch(() => {})
  }, [seenIds])
  useEffect(() => {
    if (staff) return
    const reload = () => { if (!document.hidden) refresh().catch(() => {}) }
    const timer = setInterval(reload, 30000)
    window.addEventListener('focus', reload)
    return () => { clearInterval(timer); window.removeEventListener('focus', reload) }
  }, [staff])
  return <main className={staff ? 'daily-activity' : 'daily-activity student-activity'}><h1>Daily Activity</h1>
    {message && <p role="status">{message}</p>}
    {staff && <form className="activity-publisher" onSubmit={upload}>
      <h2>New challenge</h2>
      <label>Challenge title<input name="title" placeholder="e.g. Number patterns" required maxLength={200} /></label>
      <label>Challenge type<select name="category" required defaultValue=""><option value="" disabled>Select challenge type</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
      <label className="activity-upload">Question CSV<input name="file" type="file" accept=".csv,text/csv" aria-describedby="activity-csv-format" required /></label>
      <div className="activity-format" id="activity-csv-format">
        <strong>CSV format</strong>
        <code>{csvHeader}</code>
      </div>
      <button type="submit" className="employee-btn employee-btn-primary" disabled={busy}><i className="fas fa-upload" /> Publish challenge</button>
    </form>}
    {!data ? <p>{message ? <button onClick={() => run(refresh)}>Retry</button> : 'Loading challenges...'}</p> : <>
      {!staff && <section className="activity-streak">
        <strong><i className="fas fa-fire" /> Daily streak <b>{data.streak}/30</b></strong>
        <progress max="30" value={data.streak} aria-label="Completed challenges toward the 30-challenge goal" />
        <span>{data.completed} challenges completed</span>
        {!!data.history.length && <details><summary>Previous cycles</summary>{data.history.map(h => <p key={h.start}>{h.start}: {h.days}/30 {h.days === 30 && '(Achieved)'}</p>)}</details>}
      </section>}
      {!staff && <nav aria-label="Daily activity categories">{[...categories, 'Results'].map(c => <button key={c} disabled={busy} aria-pressed={tab === c} onClick={() => { setTab(c); setActive(null); setMessage('') }}>{c}{data.challenges.some(item => item.category === c && unread.includes(item.id)) && <span className="activity-unread" aria-label="New challenges" />}</button>)}</nav>}
      {staff ? <section><h2>Published challenges</h2>
        <div className="activity-table-wrap"><table className="activity-published"><thead><tr>
          {['Challenge type', 'Title', 'Trainer', 'File', 'Uploaded date', 'No. of questions', 'Action'].map(h => <th scope="col" key={h}>{h}</th>)}
        </tr></thead><tbody>
          {visibleChallenges.map(c => <tr key={c.id}><td>{c.category}</td><td>{c.title}</td><td>{c.uploader}</td>
            <td><button type="button" disabled={busy} aria-label={'View CSV: ' + c.title} onClick={() => run(() => open(c))}><i className="fas fa-eye" /> View</button></td>
            <td>{date(c.uploaded_at)}</td><td>{c.total}</td><td>{c.can_delete && <button type="button" title="Delete challenge" aria-label={'Delete ' + c.title} disabled={busy} onClick={() => {
              if (window.confirm('Delete "' + c.title + '"? Existing student results will be kept.')) run(async () => {
                await api.delete('/daily-activity/' + c.id + '/')
                setData(prev => ({ ...prev, challenges: prev.challenges.filter(item => item.id !== c.id) }))
                setMessage('Challenge deleted.')
              })
            }}><i className="fas fa-trash" /></button>}</td></tr>)}
          {!visibleChallenges.length && <tr><td colSpan={7}>No challenges published yet.</td></tr>}
        </tbody></table></div>
        {active && <dialog ref={el => { if (el && !el.open) el.showModal() }} onClose={() => setActive(null)} aria-labelledby="challenge-preview-title" className="activity-preview">
          <header><h2 id="challenge-preview-title">{active.title}</h2><button autoFocus type="button" onClick={e => e.currentTarget.closest('dialog').close()} aria-label="Close preview">&times;</button></header>
          <div className="activity-table-wrap"><table className="activity-published"><thead><tr>{csvHeader.split(',').map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead>
            <tbody>{active.questions.map((q,i) => <tr key={i}><td>{q.question}</td>{q.options.map((o,j) => <td key={j}>{o}</td>)}<td>{'ABCD'[q.correct]}</td><td>{q.explanation}</td></tr>)}</tbody>
          </table></div>
        </dialog>}
      </section> : active ? <section>
        <button disabled={busy} onClick={() => setActive(null)}><i className="fas fa-arrow-left" /> Back</button>
        <h2>{active.title}</h2><p>{active.category}</p>
        {active.questions.map((q, i) => <fieldset key={i}><legend>{i + 1}. {q.question}</legend>
          {active.completed ? <>
            <strong className={q.selected === q.correct ? 'activity-correct' : 'activity-incorrect'}>{q.selected === q.correct ? 'Correct' : 'Incorrect'}</strong>
            <p>Your answer: {q.options[q.selected]}</p><p>Correct answer: {q.options[q.correct]}</p><p>{q.explanation}</p>
          </> : q.options.map((option, j) => <label key={j}><input type="radio" name={'q' + i} checked={answers[i] === j} disabled={busy} onChange={() => setAnswers(prev => prev.map((v, k) => k === i ? j : v))} /> {option}</label>)}
        </fieldset>)}
        {!active.completed && <button disabled={busy || answers.includes(null)} onClick={submit}>Submit challenge</button>}
      </section> : !staff && tab === 'Results' ? <section><h2>Results</h2>
        {!data.results.length && <p>No challenges attempted yet.</p>}
        <div className="activity-card-grid">{data.results.map(r => <article key={r.id}>
          <strong>{r.title}</strong>
          <span>{r.category} · {date(r.date)}</span>
          <span>Marks: <b>{r.score}/{r.total}</b> · {r.total} questions</span>
          <span><b className="activity-correct">{r.score} correct</b> · <b className="activity-incorrect">{r.total - r.score} incorrect</b></span>
          <button disabled={busy} onClick={() => run(() => open(r))}>View result</button>
        </article>)}</div>
      </section> : <section><h2>{staff ? 'Published challenges' : tab}</h2>
        {!visibleChallenges.length && <p>{staff ? 'No challenges published yet.' : 'No pending challenges.'}</p>}
        <div className="activity-card-grid">{visibleChallenges.map(c => <article key={c.id}><strong>{c.title}</strong>
          <span><i className="fas fa-user" /> {c.uploader}</span><span>{date(c.uploaded_at)} · {c.total} questions</span>
          {!staff && <><span className="activity-status">Pending</span><button disabled={busy} onClick={() => run(() => open(c))}>Start Challenge</button></>}
        </article>)}</div></section>}
    </>}
  </main>
}
