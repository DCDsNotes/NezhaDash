import type { NezhaServer } from "@/types/nezha-api"

type ColorMode = "linear" | "default"
type ColorValue = string | [string, string]

function calcBinary(bytes: number) {
  const k = bytes / 1024
  const m = k / 1024
  const g = m / 1024
  const t = g / 1024
  return { k, m, g, t }
}

function parseCpuCores(cpuText?: string): number | null {
  if (!cpuText) return null
  const virtualCoreMatch = cpuText.match(/(\d+)\s+(?:Virtual|Physics|Physical)\s+Core/i)
  if (virtualCoreMatch?.[1]) return Number(virtualCoreMatch[1])
  const dashCoreMatch = cpuText.match(/(\d+)[-\s]?Core/i)
  if (dashCoreMatch?.[1]) return Number(dashCoreMatch[1])
  return null
}

function getColor(type: "cpu" | "mem" | "swap" | "disk", mode: ColorMode): ColorValue {
  const colors: Record<"cpu" | "mem" | "swap" | "disk", { linear: [string, string]; default: string }> = {
    cpu: { linear: ["#0088FF", "#72B7FF"], default: "#0088FF" },
    mem: { linear: ["#2B6939", "#0AA344"], default: "#0AA344" },
    swap: { linear: ["#FF8C00", "#F38100"], default: "#FF8C00" },
    disk: { linear: ["#00848F", "#70F3FF"], default: "#70F3FF" },
  }
  return colors[type][mode]
}

export type NazhuaStatusItem = {
  type: "cpu" | "mem" | "swap" | "disk"
  used: number
  colors: { used: ColorValue; total: string }
  valText: string
  valPercent: string
  label: string
  content?: { default: string; mobile: string }
}

export function getNazhuaStatusList(params: {
  server: NezhaServer
  tpl: Array<"cpu" | "mem" | "swap" | "disk">
  withContent: boolean
  mode?: ColorMode
}): NazhuaStatusItem[] {
  const { server, tpl, withContent, mode = "linear" } = params

  const totalColor = "rgba(255, 255, 255, 0.25)"

  const cpuText = server.host.cpu?.[0] || ""
  const cores = parseCpuCores(cpuText)
  const coresVal = cores ? `${cores}C` : "-"

  const memTotal = server.host.mem_total || 1
  const memUsed = server.state.mem_used || 0
  const memUsedBinary = calcBinary(memUsed)
  const memTotalBinary = calcBinary(memTotal)
  const memPercent = ((memUsed / memTotal) * 100)

  const swapTotal = server.host.swap_total || 0
  const swapUsed = server.state.swap_used || 0
  const swapTotalBinary = calcBinary(swapTotal || 1)
  const swapUsedBinary = calcBinary(swapUsed)
  const swapPercent = swapTotal ? ((swapUsed / swapTotal) * 100) : 0

  const diskTotal = server.host.disk_total || 1
  const diskUsed = server.state.disk_used || 0
  const diskUsedBinary = calcBinary(diskUsed)
  const diskTotalBinary = calcBinary(diskTotal)
  const diskPercent = ((diskUsed / diskTotal) * 100)

  const list: Array<NazhuaStatusItem | null> = tpl.map((i) => {
      switch (i) {
        case "cpu": {
          const used = Number((server.state.cpu || 0).toFixed(1))
          const valPercent = `${used}%`
          const item: NazhuaStatusItem = {
            type: "cpu",
            used,
            colors: { used: getColor("cpu", mode), total: totalColor },
            valText: valPercent,
            valPercent,
            label: "CPU",
            content: withContent
              ? {
                  default: cores ? cpuText : coresVal,
                  mobile: coresVal,
                }
              : undefined,
          }
          return item
        }
        case "mem": {
          const used = (Number.isFinite(memPercent) ? memPercent : 0) || 0
          const valText =
            memUsedBinary.g >= 10 && memTotalBinary.g >= 10 ? `${Number(memUsedBinary.g.toFixed(1))}G` : `${Math.ceil(memUsedBinary.m)}M`
          const contentVal = memTotalBinary.g > 4 ? `${Number(memTotalBinary.g.toFixed(1))}G` : `${Math.ceil(memTotalBinary.m)}M`
          const item: NazhuaStatusItem = {
            type: "mem",
            used,
            colors: { used: getColor("mem", mode), total: totalColor },
            valText,
            valPercent: `${Number(used.toFixed(1))}%`,
            label: "内存",
            content: withContent
              ? {
                  default: `运行内存${contentVal}`,
                  mobile: `内存${contentVal}`,
                }
              : undefined,
          }
          return item
        }
        case "swap": {
          if (!swapTotal) return null
          const used = (Number.isFinite(swapPercent) ? swapPercent : 0) || 0
          const valText =
            swapUsedBinary.g >= 10 && swapTotalBinary.g >= 10 ? `${Number(swapUsedBinary.g.toFixed(1))}G` : `${Math.ceil(swapUsedBinary.m)}M`
          const contentVal = swapTotalBinary.g > 4 ? `${Number(swapTotalBinary.g.toFixed(1))}G` : `${Math.ceil(swapTotalBinary.m)}M`
          const item: NazhuaStatusItem = {
            type: "swap",
            used,
            colors: { used: getColor("swap", mode), total: totalColor },
            valText,
            valPercent: `${Number(used.toFixed(1))}%`,
            label: "交换",
            content: withContent
              ? {
                  default: `交换内存${contentVal}`,
                  mobile: `交换${contentVal}`,
                }
              : undefined,
          }
          return item
        }
        case "disk": {
          const used = (Number.isFinite(diskPercent) ? diskPercent : 0) || 0
          const valText =
            diskUsedBinary.t >= 1 && diskTotalBinary.t >= 1 ? `${Number(diskUsedBinary.t.toFixed(1))}T` : `${Math.ceil(diskUsedBinary.g)}G`
          const contentValue =
            diskTotalBinary.t >= 1 ? `${Number(diskTotalBinary.t.toFixed(1))}T` : `${Math.ceil(diskTotalBinary.g)}G`
          const item: NazhuaStatusItem = {
            type: "disk",
            used,
            colors: { used: getColor("disk", mode), total: totalColor },
            valText,
            valPercent: `${Number(used.toFixed(1))}%`,
            label: "磁盘",
            content: withContent
              ? {
                  default: `磁盘容量${contentValue}`,
                  mobile: `磁盘${contentValue}`,
                }
              : undefined,
          }
          return item
        }
        default:
          return null
      }
    })

  return list.filter((v): v is NazhuaStatusItem => v !== null)
}

export function formatNazhuaCpuMemDiskSummary(server: NezhaServer): string {
  const parts: string[] = []
  const cpuText = server.host.cpu?.[0]
  if (cpuText) {
    const cores = parseCpuCores(cpuText)
    if (cores) parts.push(`${cores}C`)
  }
  if (server.host.mem_total) {
    const mem = calcBinary(server.host.mem_total)
    if (mem.m > 900) parts.push(`${Math.round(mem.g)}G`)
    else parts.push(`${(Math.round(mem.g * 10) / 10).toFixed(1).replace(/\.0$/, "")}G`)
  }
  if (server.host.disk_total) {
    const disk = calcBinary(server.host.disk_total)
    if (disk.g > 900) parts.push(`${Math.round(disk.t)}T`)
    else parts.push(`${Math.ceil(disk.g)}G`)
  }
  return parts.join("")
}
