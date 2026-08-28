import { STATUS_PULSE, getStatusPulseFrame } from "@/lib/status-pulse"

const FAVICON_SIZE = 64
const FAVICON_FRAME_COUNT = 60
const FAVICON_OUTER_RADIUS = (88 / 192) * FAVICON_SIZE
const FAVICON_CORE_RADIUS = (52 / 192) * FAVICON_SIZE
const FAVICON_RING_WIDTH = (6 / 192) * FAVICON_SIZE

type FaviconStatus = "online" | "offline"

const palettes: Record<FaviconStatus, { outer: string; inner: string }> = {
  online: { outer: "#c8efdd", inner: "#16a66a" },
  offline: { outer: "#fff0eb", inner: "#cf6844" },
}

const frameCache = new Map<FaviconStatus, string[]>()

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
    const pulse = getStatusPulseFrame(progress)
    context.clearRect(0, 0, FAVICON_SIZE, FAVICON_SIZE)

    context.fillStyle = palette.outer
    context.beginPath()
    context.arc(FAVICON_SIZE / 2, FAVICON_SIZE / 2, FAVICON_OUTER_RADIUS, 0, Math.PI * 2)
    context.fill()

    context.save()
    context.globalAlpha = pulse.ringOpacity
    context.strokeStyle = palette.inner
    context.lineWidth = FAVICON_RING_WIDTH
    context.beginPath()
    context.arc(FAVICON_SIZE / 2, FAVICON_SIZE / 2, FAVICON_CORE_RADIUS * pulse.ringScale, 0, Math.PI * 2)
    context.stroke()
    context.restore()

    context.fillStyle = palette.inner
    context.beginPath()
    context.arc(FAVICON_SIZE / 2, FAVICON_SIZE / 2, FAVICON_CORE_RADIUS * pulse.coreScale, 0, Math.PI * 2)
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
  favicon.dataset.pulseCycle = String(STATUS_PULSE.cycleMs)

  let animationFrame = 0
  let renderedFrame = -1
  const startedAt = performance.now()

  const render = (now: number) => {
    const elapsed = (now - startedAt) % STATUS_PULSE.cycleMs
    const frame = Math.floor((elapsed / STATUS_PULSE.cycleMs) * frames.length)
    if (frame !== renderedFrame) {
      favicon.href = frames[frame]
      renderedFrame = frame
    }
    animationFrame = window.requestAnimationFrame(render)
  }

  render(startedAt)
  return () => window.cancelAnimationFrame(animationFrame)
}
