export function calcBinary(bytes: number) {
  const k = bytes / 1024
  const m = k / 1024
  const g = m / 1024
  const t = g / 1024
  let p: number | null = null
  if (t > 1000) p = t / 1024
  return { k, m, g, t, p }
}

function formatNumber1(n: number) {
  const v = Math.round((Number(n) || 0) * 10) / 10
  if (!Number.isFinite(v)) return "0"
  return String(v).replace(/\.0$/, "")
}

export function formatBinaryAsGT(bytes: number, unit: "G" | "T") {
  const safeBytes = Math.max(Number(bytes) || 0, 0)
  const { g, t } = calcBinary(safeBytes)
  const raw = unit === "T" ? t : g
  return `${formatNumber1(raw)}${unit}`
}

export function formatBinaryUsageGT(usedBytes: number, totalBytes: number) {
  const safeUsed = Math.max(Number(usedBytes) || 0, 0)
  const safeTotal = Math.max(Number(totalBytes) || 0, 0)
  const ref = safeTotal > 0 ? safeTotal : safeUsed
  const unit: "G" | "T" = calcBinary(ref).t >= 1 ? "T" : "G"
  const usedText = formatBinaryAsGT(safeUsed, unit)
  if (!safeTotal) return `${usedText}/-`
  const totalText = formatBinaryAsGT(safeTotal, unit)
  return `${usedText}/${totalText}`
}

export function getCpuCoresFromCpuText(text: string) {
  const m = String(text || "").match(/(\d+)\s+(Virtual|Physics|Physical)\s+Core/i)
  if (!m) return ""
  return m[1] || ""
}

export function formatCpuMemDiskText(cpuText: string, memTotalBytes: number, diskTotalBytes: number) {
  const textParts: string[] = []

  const cores = getCpuCoresFromCpuText(cpuText)
  if (cores) textParts.push(`${cores}C`)

  if (Number.isFinite(memTotalBytes) && memTotalBytes > 0) {
    const mem = calcBinary(memTotalBytes)
    if (mem.m > 900) {
      textParts.push(`${Math.round(mem.g)}G`)
    } else {
      const v = Math.round(mem.g * 10) / 10
      textParts.push(`${v}G`)
    }
  }

  if (Number.isFinite(diskTotalBytes) && diskTotalBytes > 0) {
    const disk = calcBinary(diskTotalBytes)
    if (disk.g > 900) {
      textParts.push(`${Math.round(disk.t)}T`)
    } else {
      textParts.push(`${Math.ceil(disk.g)}G`)
    }
  }

  return textParts.join("")
}
