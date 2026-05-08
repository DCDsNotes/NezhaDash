import dayjs from "dayjs"

import { NezhaServer } from "@/types/nezha-api"

export interface BillingData {
  startDate: string
  endDate: string
  autoRenewal: string
  cycle: string
  amount: string
}

export interface PlanData {
  bandwidth: string
  trafficVol: string
  trafficType: string
  IPv4: string
  IPv6: string
  networkRoute: string
  extra: string
}

export interface PublicNoteData {
  billingDataMod?: BillingData
  planDataMod?: PlanData
}

function calcPercent(used: unknown, total: unknown) {
  const u = Number(used)
  const t = Number(total)
  if (!Number.isFinite(u) || !Number.isFinite(t) || t <= 0) return 0
  const value = (u / t) * 100
  if (!Number.isFinite(value) || value < 0) return 0
  if (value > 100) return 100
  return value
}

function normalizeCountryCode(raw: unknown) {
  const code = String(raw || "").trim().toLowerCase()
  if (!code) return "cn"
  if (!/^[a-z]{2}$/.test(code)) return "cn"
  return code
}

export function parseISOTimestamp(isoString: string): number {
  return new Date(isoString).getTime()
}

export function resolvePublicNote(serverId: number, publicNote: string): string {
  if (typeof sessionStorage === "undefined") return publicNote

  const storageKey = `server_${serverId}_public_note`
  const storedNote = sessionStorage.getItem(storageKey)

  if (!publicNote && storedNote) return storedNote

  if (publicNote) {
    sessionStorage.setItem(storageKey, publicNote)
    return publicNote
  }

  return ""
}

export function normalizeServer(now: number, serverInfo: NezhaServer) {
  const lastActiveTime = serverInfo.last_active.startsWith("000") ? 0 : parseISOTimestamp(serverInfo.last_active)

  return {
    ...serverInfo,
    cpu: serverInfo.state.cpu || 0,
    gpu: serverInfo.state.gpu || [],
    process: serverInfo.state.process_count || 0,
    up: serverInfo.state.net_out_speed / 1024 / 1024 || 0,
    down: serverInfo.state.net_in_speed / 1024 / 1024 || 0,
    last_active_time_string: lastActiveTime ? dayjs(lastActiveTime).format("YYYY-MM-DD HH:mm:ss") : "",
    online: now - lastActiveTime <= 30000,
    uptime: serverInfo.state.uptime || 0,
    version: serverInfo.host.version || null,
    tcp: serverInfo.state.tcp_conn_count || 0,
    udp: serverInfo.state.udp_conn_count || 0,
    mem: calcPercent(serverInfo.state.mem_used, serverInfo.host.mem_total),
    swap: calcPercent(serverInfo.state.swap_used, serverInfo.host.swap_total),
    disk: calcPercent(serverInfo.state.disk_used, serverInfo.host.disk_total),
    stg: calcPercent(serverInfo.state.disk_used, serverInfo.host.disk_total),
    country_code: normalizeCountryCode(serverInfo.country_code),
    platform: serverInfo.host.platform || "",
    net_out_transfer: serverInfo.state.net_out_transfer || 0,
    net_in_transfer: serverInfo.state.net_in_transfer || 0,
    arch: serverInfo.host.arch || "",
    mem_total: serverInfo.host.mem_total || 0,
    swap_total: serverInfo.host.swap_total || 0,
    disk_total: serverInfo.host.disk_total || 0,
    boot_time: serverInfo.host.boot_time || 0,
    boot_time_string: serverInfo.host.boot_time ? dayjs(serverInfo.host.boot_time * 1000).format("YYYY-MM-DD HH:mm:ss") : "",
    platform_version: serverInfo.host.platform_version || "",
    cpu_info: serverInfo.host.cpu || [],
    gpu_info: serverInfo.host.gpu || [],
    load_1: serverInfo.state.load_1?.toFixed(2) || 0.0,
    load_5: serverInfo.state.load_5?.toFixed(2) || 0.0,
    load_15: serverInfo.state.load_15?.toFixed(2) || 0.0,
    public_note: resolvePublicNote(serverInfo.id, serverInfo.public_note || ""),
  }
}

export type NormalizedServer = ReturnType<typeof normalizeServer>

export function getNextCycleTime(startDate: number, months: number, specifiedDate: number): number {
  const start = dayjs(startDate)
  const checkDate = dayjs(specifiedDate)

  if (!start.isValid() || months <= 0) {
    throw new Error("参数无效：请检查起始日期、周期月份数和指定日期。")
  }

  let nextDate = start
  let shouldContinue = true
  while (shouldContinue) {
    nextDate = nextDate.add(months, "month")
    shouldContinue = nextDate.valueOf() <= checkDate.valueOf()
  }

  return nextDate.valueOf()
}

export function formatBillingEndDate(endDate: unknown): string {
  const raw = String(endDate || "").trim()
  if (!raw) return ""
  if (raw.startsWith("0000-00-00")) return "长期有效"

  const datePart = raw.match(/^(\d{4}-\d{2}-\d{2})/)?.[1]
  if (datePart) return datePart

  const parsed = dayjs(raw)
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : ""
}

export function parsePublicNote(publicNote: string): PublicNoteData | null {
  try {
    if (!publicNote) return null

    const data = JSON.parse(publicNote)
    if (!data.billingDataMod && !data.planDataMod) return null

    return {
      ...(data.billingDataMod
        ? {
            billingDataMod: {
              startDate: data.billingDataMod.startDate || "",
              endDate: data.billingDataMod.endDate,
              autoRenewal: data.billingDataMod.autoRenewal || "",
              cycle: data.billingDataMod.cycle || "",
              amount: data.billingDataMod.amount || "",
            },
          }
        : {}),
      ...(data.planDataMod
        ? {
            planDataMod: {
              bandwidth: data.planDataMod.bandwidth || "",
              trafficVol: data.planDataMod.trafficVol || "",
              trafficType: data.planDataMod.trafficType || "",
              IPv4: data.planDataMod.IPv4 || "",
              IPv6: data.planDataMod.IPv6 || "",
              networkRoute: data.planDataMod.networkRoute || "",
              extra: data.planDataMod.extra || "",
            },
          }
        : {}),
    }
  } catch (error) {
    console.error("Error parsing public note:", error)
    return null
  }
}
