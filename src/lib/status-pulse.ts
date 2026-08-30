import type { CSSProperties } from "react"

export const STATUS_PULSE = {
  cycleMs: 1_350,
  coreInset: "12%",
  coreMinScale: 0.86,
  coreMaxScale: 1.16,
  ringStartScale: 0.72,
  ringEndScale: 1.7,
  ringStartOpacity: 0.62,
} as const

export const STATUS_PULSE_STYLE = {
  "--status-pulse-duration": `${STATUS_PULSE.cycleMs}ms`,
  "--status-pulse-core-inset": STATUS_PULSE.coreInset,
  "--status-pulse-core-min-scale": STATUS_PULSE.coreMinScale,
  "--status-pulse-core-max-scale": STATUS_PULSE.coreMaxScale,
  "--status-pulse-ring-start-scale": STATUS_PULSE.ringStartScale,
  "--status-pulse-ring-end-scale": STATUS_PULSE.ringEndScale,
  "--status-pulse-ring-start-opacity": STATUS_PULSE.ringStartOpacity,
} as CSSProperties

function cubicBezierY(progress: number, x1: number, y1: number, x2: number, y2: number) {
  let low = 0
  let high = 1

  for (let index = 0; index < 12; index += 1) {
    const time = (low + high) / 2
    const inverse = 1 - time
    const x = 3 * inverse * inverse * time * x1 + 3 * inverse * time * time * x2 + time * time * time
    if (x < progress) low = time
    else high = time
  }

  const time = (low + high) / 2
  const inverse = 1 - time
  return 3 * inverse * inverse * time * y1 + 3 * inverse * time * time * y2 + time * time * time
}

export function getStatusPulseFrame(progress: number) {
  const normalizedProgress = ((progress % 1) + 1) % 1
  const halfCycleProgress = normalizedProgress <= 0.5 ? normalizedProgress * 2 : (1 - normalizedProgress) * 2
  const coreProgress = cubicBezierY(halfCycleProgress, 0.42, 0, 0.58, 1)
  const ringProgress = cubicBezierY(normalizedProgress, 0, 0, 0.58, 1)

  return {
    coreScale: STATUS_PULSE.coreMinScale + (STATUS_PULSE.coreMaxScale - STATUS_PULSE.coreMinScale) * coreProgress,
    ringScale: STATUS_PULSE.ringStartScale + (STATUS_PULSE.ringEndScale - STATUS_PULSE.ringStartScale) * ringProgress,
    ringOpacity: STATUS_PULSE.ringStartOpacity * (1 - ringProgress),
  }
}
