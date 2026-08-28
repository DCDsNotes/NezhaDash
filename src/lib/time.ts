export function normalizeTimestampMs(value: number) {
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp)) return 0
  return timestamp > 1e11 ? timestamp : timestamp * 1000
}
