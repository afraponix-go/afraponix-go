import { useCallback, useEffect, useState } from 'react'

// Attach to a horizontally-scrollable container's ref. Sets
// data-scroll-start/data-scroll-end ("false" = there's still more content
// that way) so CSS (see .empty's neighbours in dashboard.css) can show an
// edge shadow only while it's genuinely true — not a permanent decorative
// fade a table that already fits would also get.
//
// A callback ref, not a plain ref object + effect: the wrapped element is
// often conditionally rendered (only once its data has loaded), so a
// mount-only effect can fire before the node exists and never re-attach.
// A callback ref re-fires exactly when the node actually appears.
export function useScrollShadow<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null)
  const ref = useCallback((el: T | null) => setNode(el), [])

  useEffect(() => {
    if (!node) return
    const update = () => {
      node.dataset.scrollStart = String(node.scrollLeft <= 1)
      node.dataset.scrollEnd = String(node.scrollLeft + node.clientWidth >= node.scrollWidth - 1)
    }
    update()
    node.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(node)
    return () => {
      node.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [node])

  return ref
}
