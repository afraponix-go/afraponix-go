// Scroll a horizontal strip so its active child is centred, WITHOUT using
// Element.scrollIntoView — that bubbles up and scrolls every scrollable
// ancestor (including the page), shifting the whole layout sideways on mobile.
// This touches only the strip's own scrollLeft.
export function centerActiveChild(strip: HTMLElement | null, activeSelector: string) {
  if (!strip) return
  const active = strip.querySelector<HTMLElement>(activeSelector)
  if (!active) return
  const sRect = strip.getBoundingClientRect()
  const aRect = active.getBoundingClientRect()
  const delta = aRect.left - sRect.left - (sRect.width - aRect.width) / 2
  if (Math.abs(delta) < 2) return
  strip.scrollBy({ left: delta, behavior: 'smooth' })
}
