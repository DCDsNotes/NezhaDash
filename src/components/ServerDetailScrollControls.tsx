function getScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
}

function scrollTo(top: number) {
  window.scrollTo({ top, left: 0, behavior: getScrollBehavior() })
}

export default function ServerDetailScrollControls() {
  return (
    <div className="server-detail-scroll-controls" role="group" aria-label="页面滚动">
      <button type="button" className="server-detail-scroll-controls__button" onClick={() => scrollTo(0)} aria-label="滚动到顶部" title="滚动到顶部">
        <i className="ri-arrow-up-line" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="server-detail-scroll-controls__button"
        onClick={() => scrollTo(document.scrollingElement?.scrollHeight ?? document.documentElement.scrollHeight)}
        aria-label="滚动到底部"
        title="滚动到底部"
      >
        <i className="ri-arrow-down-line" aria-hidden="true" />
      </button>
    </div>
  )
}
