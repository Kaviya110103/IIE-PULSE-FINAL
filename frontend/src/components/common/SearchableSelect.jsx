import { Children, isValidElement, useState } from 'react'

const optionText = node => typeof node === 'string' || typeof node === 'number'
  ? String(node)
  : isValidElement(node) ? Children.toArray(node.props.children).map(optionText).join(' ') : ''

export default function SearchableSelect({ children, style, className, integrated = false, searchLabel = 'Search options', ...props }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const searchable = searchLabel !== 'Search options' || /course|batch/i.test(optionText(Children.toArray(children)[0]))
  if (!searchable) return <select {...props} className={className} style={style}>{children}</select>
  const options = Children.toArray(children).filter(option => !isValidElement(option) ||
    option.props.value === '' || String(option.props.value) === String(props.value) ||
    optionText(option).toLowerCase().includes(query.trim().toLowerCase()))
  if (integrated) {
    const allOptions = Children.toArray(children).filter(isValidElement)
    const selected = allOptions.find(option => String(option.props.value) === String(props.value))
    const matches = allOptions.filter(option => optionText(option).toLowerCase().includes(query.trim().toLowerCase()))
    const choose = option => {
      props.onChange?.({ target: { value: String(option.props.value), name: props.name } })
      setQuery('')
      setOpen(false)
    }
    return <div style={{ position: 'relative', minWidth: 0, ...style }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
      <button type="button" className={className} disabled={props.disabled} aria-haspopup="listbox" aria-expanded={open}
        onClick={() => { setOpen(!open); setQuery('') }} style={{ width: '100%', textAlign: 'left' }}>{selected ? optionText(selected) : optionText(allOptions[0])}</button>
      <input tabIndex={-1} aria-hidden="true" required={props.required} value={props.value || ''} onChange={() => {}} style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} onInvalid={() => setOpen(true)} />
      {open && <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000, background: 'var(--surface, white)', border: '1px solid var(--border, #ccc)', borderRadius: 6, padding: 8, boxShadow: '0 6px 20px #0003' }}>
        <input autoFocus className={className} type="search" aria-label={searchLabel} placeholder="Search courses..." value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {
          if (event.key === 'Escape') setOpen(false)
          if (event.key === 'Enter') { event.preventDefault(); const first = matches.find(option => !option.props.disabled); if (first) choose(first) }
        }} style={{ width: '100%', marginBottom: 6 }} />
        <div role="listbox" style={{ maxHeight: 220, overflowY: 'auto' }}>{matches.map(option => <button key={option.props.value} type="button" role="option" aria-selected={String(option.props.value) === String(props.value)} disabled={option.props.disabled}
          onClick={() => choose(option)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 8px', border: 0, background: String(option.props.value) === String(props.value) ? 'var(--surface2, #eef2f6)' : 'transparent', color: 'inherit', opacity: option.props.disabled ? .45 : 1 }}>{optionText(option)}</button>)}{matches.length === 0 && <div style={{ padding: 10 }}>No courses found</div>}</div>
      </div>}
    </div>
  }
  return <div style={{ display: 'inline-grid', gap: 5, minWidth: 0, ...style }}>
    <input type="search" aria-label={searchLabel} placeholder={searchLabel} className={className}
      disabled={props.disabled} value={query} onChange={event => setQuery(event.target.value)} style={{ width: '100%', minWidth: 0 }} />
    <select {...props} className={className} style={{ width: '100%', minWidth: 0 }}>{options}</select>
  </div>
}
