import { memo, useEffect, useRef, useState } from "react"

let activeScrollFrame: number | null = null

function cancelScrollAnimation() {
  if (activeScrollFrame === null) return
  window.cancelAnimationFrame(activeScrollFrame)
  activeScrollFrame = null
}

function scrollTo(top: number) {
  const scrollElement = document.scrollingElement ?? document.documentElement
  const start = scrollElement.scrollTop
  const distance = top - start
  if (Math.abs(distance) < 1) return

  cancelScrollAnimation()
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    scrollElement.scrollTop = top
    return
  }

  const startedAt = performance.now()
  const duration = Math.min(760, Math.max(360, Math.abs(distance) * 0.28))
  const easeOut = (progress: number) => 1 - (1 - progress) ** 3
  const frame = (now: number) => {
    const progress = Math.min(1, (now - startedAt) / duration)
    scrollElement.scrollTop = start + distance * easeOut(progress)
    if (progress < 1) {
      activeScrollFrame = window.requestAnimationFrame(frame)
    } else {
      activeScrollFrame = null
    }
  }
  activeScrollFrame = window.requestAnimationFrame(frame)
}

function getPageBottom() {
  const scrollElement = document.scrollingElement ?? document.documentElement
  return Math.max(0, scrollElement.scrollHeight - window.innerHeight)
}

function PageScrollControls() {
  const topSentinelRef = useRef<HTMLSpanElement>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const sentinel = topSentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(([entry]) => setShowScrollTop(!entry.isIntersecting))
    observer.observe(sentinel)
    return () => {
      observer.disconnect()
      cancelScrollAnimation()
    }
  }, [])

  return (
    <>
      <span ref={topSentinelRef} className="probe-page-scroll-sentinel" aria-hidden="true" />
      <div className="probe-page-scroll-controls" role="group" aria-label="页面滚动">
        {showScrollTop ? (
          <button
            type="button"
            className="probe-page-scroll-controls__button"
            onClick={() => scrollTo(0)}
            aria-label="滚动到顶部"
            title="滚动到顶部"
          >
            <i className="ri-arrow-up-line" aria-hidden="true" />
          </button>
        ) : null}
        <button
          type="button"
          className="probe-page-scroll-controls__button"
          onClick={() => scrollTo(getPageBottom())}
          aria-label="滚动到底部"
          title="滚动到底部"
        >
          <i className="ri-arrow-down-line" aria-hidden="true" />
        </button>
      </div>
    </>
  )
}

export default memo(PageScrollControls)
