export function calcBinary(bytes: number) {
  const k = bytes / 1024
  const m = k / 1024
  const g = m / 1024
  const t = g / 1024
  let p: number | null = null
  if (t > 1000) p = t / 1024
  return { k, m, g, t, p }
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

