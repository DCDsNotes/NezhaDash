const FAVICON_SIZE = 64
const FAVICON_FRAME_COUNT = 36
const FAVICON_CYCLE_MS = 1_150

type FaviconStatus = "online" | "offline"

const palettes: Record<FaviconStatus, { outer: string; inner: string }> = {
  online: { outer: "#c8efdd", inner: "#16a66a" },
  offline: { outer: "#fff0eb", inner: "#cf6844" },
}

const frameCache = new Map<FaviconStatus, string[]>()

function easeInOut(progress: number) {
  let low = 0
  let high = 1

  for (let index = 0; index < 12; index += 1) {
    const time = (low + high) / 2
    const inverse = 1 - time
    const x = 3 * inverse * inverse * time * 0.42 + 3 * inverse * time * time * 0.58 + time * time * time
    if (x < progress) low = time
    else high = time
  }

  const time = (low + high) / 2
  const inverse = 1 - time
  return 3 * inverse * time * time + time * time * time
}

function pulseScale(progress: number) {
  const halfCycleProgress = progress <= 0.5 ? progress * 2 : (1 - progress) * 2
  return 0.82 + (1.18 - 0.82) * easeInOut(halfCycleProgress)
}

function createFrames(status: FaviconStatus) {
  const cached = frameCache.get(status)
  if (cached) return cached

  const canvas = document.createElement("canvas")
  canvas.width = FAVICON_SIZE
  canvas.height = FAVICON_SIZE
  const context = canvas.getContext("2d")
  if (!context) return []

  const palette = palettes[status]
  const frames = Array.from({ length: FAVICON_FRAME_COUNT }, (_, index) => {
    const progress = index / FAVICON_FRAME_COUNT
    context.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE)

    context.fillStyle = palette.outer
    context.beginPath()
    context.arc(FAVICON_SIZE / 2, FAVICON_SIZE / 2, (88 / 192) * FAVICON_SIZE, 0, Math.PI * 2)
    context.fill()

    context.fillStyle = palette.inner
    context.beginPath()
    context.arc(FAVICON_SIZE / 2, FAVICON_SIZE / 2, (48 / 192) * FAVICON_SIZE * pulseScale(progress), 0, Math.PI * 2)
    context.fill()

    return canvas.toDataURL("image/png")
  })

  frameCache.set(status, frames)
  return frames
}

export function startFaviconPulse(status: FaviconStatus) {
  const favicon = document.querySelector<HTMLLinkElement>("#app-favicon")
  if (!favicon) return undefined

  const frames = createFrames(status)
  if (frames.length === 0) return undefined

  favicon.type = "image/png"
  favicon.sizes.value = `${FAVICON_SIZE}x${FAVICON_SIZE}`
  favicon.dataset.status = status

  let animationFrame = 0
  let renderedFrame = -1
  const startedAt = performance.now()

  const render = (now: number) => {
    const elapsed = (now - startedAt) % FAVICON_CYCLE_MS
    const frame = Math.floor((elapsed / FAVICON_CYCLE_MS) * frames.length)
    if (frame !== renderedFrame) {
      favicon.href = frames[frame]
      renderedFrame = frame
    }
    animationFrame = window.requestAnimationFrame(render)
  }

  render(startedAt)
  return () => window.cancelAnimationFrame(animationFrame)
}
