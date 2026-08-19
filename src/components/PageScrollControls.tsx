import { useEffect, useRef, useState } from "react"

function getScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
}

function scrollTo(top: number) {
  window.scrollTo({ top, left: 0, behavior: getScrollBehavior() })
}

export default function PageScrollControls() {
  const topSentinelRef = useRef<HTMLSpanElement>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const sentinel = topSentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(([entry]) => setShowScrollTop(!entry.isIntersecting))
    observer.observe(sentinel)
    return () => observer.disconnect()
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
          onClick={() => scrollTo(document.scrollingElement?.scrollHeight ?? document.documentElement.scrollHeight)}
          aria-label="滚动到底部"
          title="滚动到底部"
        >
          <i className="ri-arrow-down-line" aria-hidden="true" />
        </button>
      </div>
    </>
  )
}
