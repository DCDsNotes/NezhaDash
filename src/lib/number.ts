export function clampNumber(value: number, min: number, max: number) {
  const normalized = Number(value)
  if (!Number.isFinite(normalized)) return min
  if (normalized < min) return min
  if (normalized > max) return max
  return normalized
}

export function clampInteger(value: number, min: number, max: number) {
  return clampNumber(Math.floor(Number(value)), min, max)
}

export function clampPercent(value: number) {
  return clampNumber(value, 0, 100)
}
