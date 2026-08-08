import { NezhaServer } from "@/types/nezha-api"
import dayjs from "dayjs"

const lastActiveTimeCache = new WeakMap<NezhaServer, { source: string; value: number }>()
const publicNoteCache = new Map<string, PublicNoteData | null>()
const resolvedPublicNotes = new Map<number, string>()
const hydratedPublicNoteIds = new Set<number>()
const PUBLIC_NOTE_CACHE_LIMIT = 256
const PUBLIC_NOTE_LENGTH_LIMIT = 256 * 1024

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
  customData?: {
    slogan?: string
  }
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
  const code = String(raw || "")
    .trim()
    .toLowerCase()
  if (!code) return "cn"
  if (!/^[a-z]{2}$/.test(code)) return "cn"
  return code
}

export function parseISOTimestamp(isoString: string): number {
  return new Date(isoString).getTime()
}

export function getServerLastActiveTime(serverInfo: NezhaServer) {
  const source = String(serverInfo.last_active || "")
  const cached = lastActiveTimeCache.get(serverInfo)
  if (cached?.source === source) return cached.value

  const value = source.startsWith("000") ? 0 : parseISOTimestamp(source)
  lastActiveTimeCache.set(serverInfo, { source, value })
  return value
}

export function isServerOnline(now: number, serverInfo: NezhaServer) {
  return now - getServerLastActiveTime(serverInfo) <= 30_000
}

export function resolvePublicNote(serverId: number, publicNote: string): string {
  const storageKey = `server_${serverId}_public_note`
  let storedNote = resolvedPublicNotes.get(serverId) || ""

  if (!hydratedPublicNoteIds.has(serverId)) {
    hydratedPublicNoteIds.add(serverId)
    try {
      storedNote = sessionStorage.getItem(storageKey) || ""
    } catch {
      storedNote = ""
    }
    if (storedNote) resolvedPublicNotes.set(serverId, storedNote)
  }

  if (publicNote && storedNote !== publicNote) {
    resolvedPublicNotes.set(serverId, publicNote)
    try {
      sessionStorage.setItem(storageKey, publicNote)
    } catch {
      // In-memory fallback is sufficient when storage is unavailable.
    }
    return publicNote
  }

  return publicNote || storedNote
}

export function normalizeServer(now: number, serverInfo: NezhaServer) {
  const lastActiveTime = getServerLastActiveTime(serverInfo)

  return {
    ...serverInfo,
    cpu: serverInfo.state.cpu || 0,
    gpu: serverInfo.state.gpu || [],
    process: serverInfo.state.process_count || 0,
    up: serverInfo.state.net_out_speed / 1024 / 1024 || 0,
    down: serverInfo.state.net_in_speed / 1024 / 1024 || 0,
    last_active_time_string: lastActiveTime ? dayjs(lastActiveTime).format("YYYY-MM-DD HH:mm:ss") : "",
    online: isServerOnline(now, serverInfo),
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
  for (let cycle = 0; cycle < 1_200; cycle += 1) {
    nextDate = nextDate.add(months, "month")
    if (nextDate.valueOf() > checkDate.valueOf()) return nextDate.valueOf()
  }

  // Guard pathological dates without spending unbounded time in the browser.
  const elapsedMonths = Math.max(0, checkDate.diff(start, "month"))
  const cycleCount = Math.floor(elapsedMonths / months) + 1
  nextDate = start.add(cycleCount * months, "month")
  while (nextDate.valueOf() <= checkDate.valueOf()) nextDate = nextDate.add(months, "month")
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
  if (!publicNote || publicNote.length > PUBLIC_NOTE_LENGTH_LIMIT) return null
  if (publicNoteCache.has(publicNote)) return publicNoteCache.get(publicNote) ?? null

  let parsed: PublicNoteData | null = null
  try {
    const data = JSON.parse(publicNote)
    if (data.billingDataMod || data.planDataMod || data.customData) {
      parsed = {
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
        ...(data.customData
          ? {
              customData: {
                slogan: data.customData.slogan ? String(data.customData.slogan) : "",
              },
            }
          : {}),
      }
    }
  } catch {
    // Invalid public notes are treated as plain text by the rest of the UI.
  }

  if (publicNoteCache.size >= PUBLIC_NOTE_CACHE_LIMIT) {
    const oldestKey = publicNoteCache.keys().next().value
    if (oldestKey) publicNoteCache.delete(oldestKey)
  }
  publicNoteCache.set(publicNote, parsed)
  return parsed
}
