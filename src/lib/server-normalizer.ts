import { NezhaServer } from "@/types/nezha-api"
import dayjs from "dayjs"

const lastActiveTimeCache = new WeakMap<NezhaServer, { source: string; value: number }>()
const publicNoteCache = new Map<string, PublicNoteData | null>()
const resolvedPublicNotes = new Map<number, string>()
const hydratedPublicNoteIds = new Set<number>()
const persistedPublicNotes = new Map<number, { note: string; updatedAt: number }>()
const PUBLIC_NOTE_CACHE_LIMIT = 256
const PUBLIC_NOTE_LENGTH_LIMIT = 256 * 1024
const PUBLIC_NOTE_STORAGE_KEY = "nezha_public_notes_v1"
const PUBLIC_NOTE_STORAGE_LIMIT = 128
const PUBLIC_NOTE_STORAGE_LENGTH_LIMIT = 16 * 1024
const PUBLIC_NOTE_STORAGE_TOTAL_LIMIT = 512 * 1024
const PUBLIC_NOTE_STORAGE_REFRESH_INTERVAL = 24 * 60 * 60 * 1000
const PUBLIC_NOTE_STORAGE_TTL = 30 * PUBLIC_NOTE_STORAGE_REFRESH_INTERVAL
let persistedPublicNotesHydrated = false

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
  if (typeof serverInfo.online === "boolean") return serverInfo.online
  return now - getServerLastActiveTime(serverInfo) <= 30_000
}

function hydratePersistedPublicNotes() {
  if (persistedPublicNotesHydrated) return
  persistedPublicNotesHydrated = true

  try {
    const raw = localStorage.getItem(PUBLIC_NOTE_STORAGE_KEY)
    if (!raw) return
    if (raw.length > PUBLIC_NOTE_STORAGE_TOTAL_LIMIT) {
      localStorage.removeItem(PUBLIC_NOTE_STORAGE_KEY)
      return
    }

    const entries = JSON.parse(raw)
    if (!Array.isArray(entries)) return

    const now = Date.now()
    entries.slice(-PUBLIC_NOTE_STORAGE_LIMIT).forEach((entry) => {
      if (!Array.isArray(entry) || entry.length !== 3) return
      const [serverId, note, updatedAt] = entry
      if (!Number.isInteger(serverId) || typeof note !== "string" || !note || note.length > PUBLIC_NOTE_STORAGE_LENGTH_LIMIT) return
      if (!Number.isFinite(updatedAt) || updatedAt > now || now - updatedAt > PUBLIC_NOTE_STORAGE_TTL) return
      persistedPublicNotes.set(serverId, { note, updatedAt })
    })
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function savePersistedPublicNotes() {
  try {
    let payload = JSON.stringify(Array.from(persistedPublicNotes, ([id, item]) => [id, item.note, item.updatedAt]))
    while (payload.length > PUBLIC_NOTE_STORAGE_TOTAL_LIMIT && persistedPublicNotes.size > 0) {
      const oldestId = persistedPublicNotes.keys().next().value
      if (oldestId === undefined) break
      persistedPublicNotes.delete(oldestId)
      payload = JSON.stringify(Array.from(persistedPublicNotes, ([id, item]) => [id, item.note, item.updatedAt]))
    }
    localStorage.setItem(PUBLIC_NOTE_STORAGE_KEY, payload)
  } catch {
    // The in-memory and session caches remain available when persistence fails.
  }
}

function persistPublicNote(serverId: number, note: string) {
  hydratePersistedPublicNotes()
  persistedPublicNotes.delete(serverId)

  if (note.length <= PUBLIC_NOTE_STORAGE_LENGTH_LIMIT) {
    persistedPublicNotes.set(serverId, { note, updatedAt: Date.now() })
    while (persistedPublicNotes.size > PUBLIC_NOTE_STORAGE_LIMIT) {
      const oldestId = persistedPublicNotes.keys().next().value
      if (oldestId === undefined) break
      persistedPublicNotes.delete(oldestId)
    }
  }

  savePersistedPublicNotes()
}

export function resolvePublicNote(serverId: number, publicNote: string): string {
  const storageKey = `server_${serverId}_public_note`
  let storedNote = resolvedPublicNotes.get(serverId) || ""

  if (!hydratedPublicNoteIds.has(serverId)) {
    hydratedPublicNoteIds.add(serverId)
    hydratePersistedPublicNotes()
    try {
      storedNote = persistedPublicNotes.get(serverId)?.note || sessionStorage.getItem(storageKey) || storedNote
    } catch {
      storedNote = persistedPublicNotes.get(serverId)?.note || storedNote
    }
    if (storedNote) resolvedPublicNotes.set(serverId, storedNote)
  }

  if (publicNote) {
    resolvedPublicNotes.set(serverId, publicNote)
    if (storedNote !== publicNote) {
      try {
        sessionStorage.setItem(storageKey, publicNote)
      } catch {
        // In-memory fallback is sufficient when session storage is unavailable.
      }
    }
    const persistedNote = persistedPublicNotes.get(serverId)
    if (persistedNote?.note !== publicNote || Date.now() - persistedNote.updatedAt >= PUBLIC_NOTE_STORAGE_REFRESH_INTERVAL) {
      persistPublicNote(serverId, publicNote)
    }
    return publicNote
  }

  return storedNote
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
