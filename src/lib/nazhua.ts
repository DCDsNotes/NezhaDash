export function calcBinary(bytes: number) {
  const k = bytes / 1024
  const m = k / 1024
  const g = m / 1024
  const t = g / 1024
  return { k, m, g, t }
}

export function parseCpuCores(cpuText: string): number | null {
  if (!cpuText) return null

  const virtualCoreMatch = cpuText.match(/(\d+)\s+(?:Virtual|Physics|Physical)\s+Core/i)
  if (virtualCoreMatch?.[1]) return Number(virtualCoreMatch[1])

  const dashCoreMatch = cpuText.match(/(\d+)[-\s]?Core/i)
  if (dashCoreMatch?.[1]) return Number(dashCoreMatch[1])

  return null
}

export function formatNazhuaCpuMemDiskSummary(params: { cpuText?: string; memTotal?: number; diskTotal?: number }): string {
  const { cpuText, memTotal, diskTotal } = params

  const parts: string[] = []

  if (cpuText) {
    const cores = parseCpuCores(cpuText)
    if (cores) parts.push(`${cores}C`)
  }

  if (typeof memTotal === "number" && memTotal > 0) {
    const mem = calcBinary(memTotal)
    if (mem.m > 900) parts.push(`${Math.round(mem.g)}G`)
    else parts.push(`${(Math.round(mem.g * 10) / 10).toFixed(1).replace(/\.0$/, "")}G`)
  }

  if (typeof diskTotal === "number" && diskTotal > 0) {
    const disk = calcBinary(diskTotal)
    if (disk.g > 900) parts.push(`${Math.round(disk.t)}T`)
    else parts.push(`${Math.ceil(disk.g)}G`)
  }

  return parts.join("")
}

