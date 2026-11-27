import { useEffect } from 'react'

export default function TableTopScrollbars() {
  useEffect(() => {
    const entries = new Map()
    let frame = null
    let activeWrapper = null
    const horizontalScroller = wrapper => {
      for (let node = wrapper; node; node = node.parentElement) {
        if (node.scrollWidth <= node.clientWidth) continue
        if (node === document.scrollingElement || /^(auto|scroll|overlay)$/.test(getComputedStyle(node).overflowX)) return node
      }
      return null
    }
    const onKeyDown = event => {
      if (event.defaultPrevented || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const vertical = event.key === 'ArrowUp' || event.key === 'ArrowDown'
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="combobox"], [role="listbox"], [role="slider"], [role="tablist"]')) return
      const candidates = [...entries.keys()].filter(wrapper => {
        const rect = wrapper.getBoundingClientRect()
        return wrapper.isConnected && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth
      })
      const focused = candidates.find(wrapper => wrapper.contains(event.target) || entries.get(wrapper).bar.contains(event.target))
      const preferred = focused || (candidates.includes(activeWrapper) ? activeWrapper : null)
      const wrapper = vertical
        ? preferred || candidates.find(item => item.scrollHeight > item.clientHeight)
        : (preferred && horizontalScroller(preferred)) || candidates.map(horizontalScroller).find(Boolean)
      if (!wrapper) return
      const position = vertical ? 'scrollTop' : 'scrollLeft'
      const before = wrapper[position]
      const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
      wrapper[position] += direction * (vertical ? 48 : 100)
      if (wrapper[position] !== before) event.preventDefault()
    }
    document.addEventListener('keydown', onKeyDown)
    const scan = () => {
      frame = null
      for (const [wrapper, entry] of entries) {
        if (!wrapper.isConnected || !wrapper.contains(entry.table)) {
          entry.dispose()
          entries.delete(wrapper)
        }
      }
      document.querySelectorAll('table').forEach(table => {
        const wrapper = table.parentElement
        if (!wrapper || entries.has(wrapper)) return
        const bar = document.createElement('div')
        bar.className = 'table-top-scrollbar'
        bar.tabIndex = 0
        bar.setAttribute('role', 'region')
        bar.setAttribute('aria-label', 'Scroll table columns horizontally')
        const track = document.createElement('div')
        track.style.height = '1px'
        bar.appendChild(track)
        wrapper.before(bar)
        const update = () => {
          track.style.width = `${table.scrollWidth}px`
          bar.style.display = table.scrollWidth > wrapper.clientWidth ? 'block' : 'none'
          bar.scrollLeft = wrapper.scrollLeft
        }
        const fromTop = () => { if (wrapper.scrollLeft !== bar.scrollLeft) wrapper.scrollLeft = bar.scrollLeft }
        const fromTable = () => { if (bar.scrollLeft !== wrapper.scrollLeft) bar.scrollLeft = wrapper.scrollLeft }
        const activate = () => { activeWrapper = wrapper }
        const originalTabIndex = wrapper.getAttribute('tabindex')
        if (originalTabIndex === null) wrapper.tabIndex = 0
        wrapper.addEventListener('pointerenter', activate)
        wrapper.addEventListener('pointerdown', activate)
        bar.addEventListener('focus', activate)
        bar.addEventListener('scroll', fromTop)
        wrapper.addEventListener('scroll', fromTable)
        const resize = new ResizeObserver(update)
        resize.observe(wrapper)
        resize.observe(table)
        entries.set(wrapper, { table, bar, dispose: () => {
          resize.disconnect()
          bar.removeEventListener('scroll', fromTop)
          wrapper.removeEventListener('scroll', fromTable)
          wrapper.removeEventListener('pointerenter', activate)
          wrapper.removeEventListener('pointerdown', activate)
          bar.removeEventListener('focus', activate)
          if (originalTabIndex === null) wrapper.removeAttribute('tabindex')
          bar.remove()
        } })
        update()
      })
    }
    const observer = new MutationObserver(() => { if (frame === null) frame = requestAnimationFrame(scan) })
    observer.observe(document.body, { childList: true, subtree: true })
    scan()
    return () => {
      observer.disconnect()
      document.removeEventListener('keydown', onKeyDown)
      if (frame !== null) cancelAnimationFrame(frame)
      entries.forEach(entry => entry.dispose())
    }
  }, [])
  return null
}
