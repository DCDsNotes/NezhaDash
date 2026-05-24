import { type NezhaServer } from "@/types/nezha-api"

export type ServerSortOption = {
  label: string
  value: string
}

export const serverSortOptions = (): ServerSortOption[] => [
  { label: "排序值", value: "DisplayIndex" },
  { label: "主机名称", value: "Name" },
  { label: "国家地区", value: "Host.CountryCode" },
  { label: "系统平台", value: "Host.Platform" },
  { label: "在线时长", value: "Host.BootTime" },
  { label: "入网速度", value: "State.NetInSpeed" },
  { label: "出网速度", value: "State.NetOutSpeed" },
  { label: "入网流量", value: "State.NetInTransfer" },
  { label: "出网流量", value: "State.NetOutTransfer" },
  { label: "合计流量", value: "$.TotalTransfer" },
  { label: "TCP连接", value: "State.TcpConnCount" },
  { label: "UDP连接", value: "State.UdpConnCount" },
  { label: "总连接数", value: "$.TotalConnCount" },
  { label: "1分钟负载", value: "State.Load1" },
  { label: "CPU占用", value: "State.CPU" },
  { label: "核心数量", value: "$.CPU" },
  { label: "内存占用", value: "State.MemUsed" },
  { label: "内存大小", value: "Host.MemTotal" },
  { label: "交换占用", value: "State.SwapUsed" },
  { label: "交换大小", value: "Host.SwapTotal" },
  { label: "硬盘占用", value: "State.DiskUsed" },
  { label: "硬盘大小", value: "Host.DiskTotal" },
]

function num(v: unknown) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function getDisplayIndex(server: NezhaServer) {
  const anyServer = server as unknown as Record<string, unknown>
  return num(anyServer.DisplayIndex ?? anyServer.displayIndex ?? anyServer.display_index ?? anyServer.displayIndex)
}

function getSortValue(server: NezhaServer, sortBy: string) {
  if (!sortBy) return null

  if (sortBy === "DisplayIndex") return getDisplayIndex(server)
  if (sortBy === "Name") return String(server.name || "")

  if (sortBy.startsWith("$.") || sortBy.startsWith("$.")) {
    const key = sortBy.split(".")[1]
    if (key === "TotalTransfer") {
      return num(server.state?.net_in_transfer) + num(server.state?.net_out_transfer)
    }
    if (key === "TotalConnCount") {
      return num(server.state?.tcp_conn_count) + num(server.state?.udp_conn_count)
    }
    if (key === "CPU") {
      return Array.isArray(server.host?.cpu) ? server.host.cpu.length : 0
    }
    return 0
  }

  const hasDot = sortBy.includes(".")
  if (!hasDot) {
    return (server as any)[sortBy]
  }

  const [group, field] = sortBy.split(".")

  if (group === "Host") {
    if (field === "CountryCode") return String(server.country_code || "")
    if (field === "Platform") return String(server.host?.platform || "")
    if (field === "BootTime") {
      const currentTime = Date.now()
      return currentTime - num(server.host?.boot_time) * 1000
    }
    if (field === "MemTotal") return num(server.host?.mem_total)
    if (field === "SwapTotal") return num(server.host?.swap_total)
    if (field === "DiskTotal") return num(server.host?.disk_total)
  }

  if (group === "State") {
    if (field === "NetInSpeed") return num(server.state?.net_in_speed)
    if (field === "NetOutSpeed") return num(server.state?.net_out_speed)
    if (field === "NetInTransfer") return num(server.state?.net_in_transfer)
    if (field === "NetOutTransfer") return num(server.state?.net_out_transfer)
    if (field === "TcpConnCount") return num(server.state?.tcp_conn_count)
    if (field === "UdpConnCount") return num(server.state?.udp_conn_count)
    if (field === "Load1") return num(server.state?.load_1)
    if (field === "CPU") return num(server.state?.cpu)
    if (field === "MemUsed") return num(server.state?.mem_used)
    if (field === "SwapUsed") return num(server.state?.swap_used)
    if (field === "DiskUsed") return num(server.state?.disk_used)
  }

  return 0
}

export function serverSortHandler(a: NezhaServer, b: NezhaServer, sortBy: string, order: "asc" | "desc") {
  if (!sortBy) return 0
  const av = getSortValue(a, sortBy)
  const bv = getSortValue(b, sortBy)

  let result = 0
  if (typeof av === "string" || typeof bv === "string") {
    result = String(av || "").localeCompare(String(bv || ""))
  } else {
    result = num(av) - num(bv)
  }
  return order === "desc" ? -result : result
}

