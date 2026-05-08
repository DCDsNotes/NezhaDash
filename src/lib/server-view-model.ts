import dayjs from "dayjs"

import { GetOsName } from "@/lib/logo-class"
import {
  formatBillingEndDate,
  getNextCycleTime,
  normalizeServer,
  parsePublicNote,
  resolvePublicNote,
  type PublicNoteData,
} from "@/lib/server-normalizer"
import { calcBinary, formatBinaryUsageGT, getCpuCoresFromCpuText } from "@/lib/server-spec"
import { NezhaServer } from "@/types/nezha-api"

export type RingType = "cpu" | "mem" | "swap" | "disk"

export type NumberUnit = {
  value: number
  unit: string
}

export type RemainingTimeViewModel = {
  label: string
  value: string
  type: "infinity" | "days" | "expired"
}

export type ServerStatusRingViewModel = {
  type: RingType
  used: number
  label: string
  valPercent: string
  valText: string
}

export type TransferInfoItem = {
  key: string
  label: string
  value: string
  title?: string
  variant?: "in" | "out" | "total" | "used" | "remaining"
}

export type ServerDailyTransferViewModel = {
  id: number
  name: string
  online: boolean
  transferIn: string
  transferOut: string
  transferTotal: string
  transferInTitle: string
  transferOutTitle: string
  transferTotalTitle: string
  totalBytes: number
}

type TransferCounter = {
  in: number
  out: number
}

function roundPercent(value: number) {
  return Number(value.toFixed(1))
}

function calcPercent(used: unknown, total: unknown) {
  const u = Number(used)
  const t = Number(total)
  if (!Number.isFinite(u) || !Number.isFinite(t) || t <= 0) return 0
  const v = (u / t) * 100
  if (!Number.isFinite(v) || v < 0) return 0
  if (v > 100) return 100
  return v
}

function parseBillingCycle(cycle: string) {
  const c = String(cycle || "").toLowerCase()
  if (["天", "日", "d", "day", "daily"].includes(c)) return { amount: 1, unit: "day" as const }
  if (["周", "星期", "w", "week", "weekly"].includes(c)) return { amount: 1, unit: "week" as const }
  if (["月", "m", "mo", "month", "monthly"].includes(c)) return { amount: 1, unit: "month" as const }
  if (["年", "y", "yr", "year", "annual", "annually"].includes(c)) return { amount: 1, unit: "year" as const }
  if (["季度", "季", "q", "qr", "quarter", "quarterly"].includes(c)) return { amount: 3, unit: "month" as const }
  if (["半年", "半", "h", "half", "semiannual", "semi-annually", "semiannually"].includes(c)) {
    return { amount: 6, unit: "month" as const }
  }
  return { amount: 1, unit: "month" as const }
}

function isAutoRenewalEnabled(value: unknown) {
  return String(value || "") === "1"
}

function getTransferCounter(server: NezhaServer): TransferCounter {
  return {
    in: Number(server.state?.net_in_transfer || 0),
    out: Number(server.state?.net_out_transfer || 0),
  }
}

function getTrafficRuleBytes(counter: TransferCounter, trafficType: string | undefined) {
  const inTransfer = counter.in
  const outTransfer = counter.out
  if (trafficType === "1") return inTransfer
  if (trafficType === "3") return outTransfer >= inTransfer ? outTransfer : inTransfer
  return inTransfer + outTransfer
}

function parseTrafficQuotaBytes(trafficVol: string | undefined) {
  const raw = String(trafficVol || "").trim()
  const match = raw.match(/(\d+(?:\.\d+)?)\s*(P|PB|T|TB|G|GB|M|MB|K|KB|B)\b/i)
  if (!match) return null

  const value = Number(match[1])
  if (!Number.isFinite(value) || value <= 0) return null

  const unit = match[2].toUpperCase().replace(/B$/, "")
  const power = { "": 0, K: 1, M: 2, G: 3, T: 4, P: 5 }[unit] ?? 0
  return value * 1000 ** power
}

function hasTrafficPlan(parsedData: PublicNoteData | null) {
  const plan = parsedData?.planDataMod
  return !!plan?.trafficType && parseTrafficQuotaBytes(plan.trafficVol) != null
}

function getServerTransferStatsCounter(server: NezhaServer, period: "today" | "billing"): TransferCounter {
  const transfer = server.transfer_stats?.[period]
  return {
    in: Number(transfer?.in || 0),
    out: Number(transfer?.out || 0),
  }
}

function formatHeaderBinary(bytes: number, decimals = 1) {
  const stats = calcBinary(bytes)
  if (stats.t > 1) return { value: Number(stats.t.toFixed(decimals)), unit: "T" }
  if (stats.g > 1) return { value: Number(stats.g.toFixed(decimals)), unit: "G" }
  if (stats.m > 1) return { value: Number(stats.m.toFixed(decimals)), unit: "M" }
  return { value: Number(stats.k.toFixed(decimals)), unit: "K" }
}

function formatHeaderDecimal(bytes: number, decimals = 1) {
  const value = Math.max(Number(bytes) || 0, 0)
  const k = value / 1000
  const m = k / 1000
  const g = m / 1000
  const t = g / 1000
  if (t > 1) return { value: Number(t.toFixed(decimals)), unit: "T" }
  if (g > 1) return { value: Number(g.toFixed(decimals)), unit: "G" }
  if (m > 1) return { value: Number(m.toFixed(decimals)), unit: "M" }
  return { value: Number(k.toFixed(decimals)), unit: "K" }
}

function formatLoad(server: NezhaServer) {
  const l1 = Number(server.state?.load_1 || 0).toFixed(2)
  const l5 = Number(server.state?.load_5 || 0).toFixed(2)
  const l15 = Number(server.state?.load_15 || 0).toFixed(2)
  return `${l1},${l5},${l15}`
}

function formatTransferShort(bytes: number) {
  const value = Math.max(Number(bytes) || 0, 0)
  const k = value / 1000
  const m = k / 1000
  const g = m / 1000
  const t = g / 1000
  const p = t / 1000
  if (p > 1) return `${Number(p.toFixed(1))}P`
  if (t > 1) return `${Number(t.toFixed(2))}T`
  if (g > 1) return `${Number(g.toFixed(2))}G`
  if (m > 1) return `${Number(m.toFixed(1))}M`
  return `${Number(k.toFixed(1))}K`
}

function formatTrafficBytes(bytes: number, decimals = 2) {
  const value = Math.max(Number(bytes) || 0, 0)
  if (!value) return "0 B"

  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"]
  const i = Math.min(Math.floor(Math.log(value) / Math.log(1000)), sizes.length - 1)
  return `${Number((value / 1000 ** i).toFixed(decimals))} ${sizes[i]}`
}

function getTrafficTypeLabel(trafficType: string | undefined) {
  if (trafficType === "1") return "单向"
  if (trafficType === "3") return "单向取最大"
  return "双向"
}

function formatCpuModelText(text: string) {
  return String(text || "")
    .replace(/\b\d+\s+(?:Virtual|Physics|Physical)\s+Cores?\b/gi, "")
    .replace(/\b\d+\s+vCPUs?\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,;|/()_-]+|[\s,;|/()_-]+$/g, "")
}

function getTemperatureIconClass(label: string) {
  const name = String(label || "").toLowerCase()
  if (name.includes("cpu")) return "ri-cpu-line"
  if (name.includes("gpu")) return "ri-gamepad-line"
  if (name.includes("nvme")) return "ri-hard-drive-3-line"
  if (name.includes("motherboard")) return "ri-instance-line"
  return "ri-temp-hot-line"
}

function parseCpuInfo(text: string) {
  const value = String(text || "")
  if (!value) return null

  const companyMatch = value.match(/Intel|AMD|ARM|Qualcomm|Apple|Samsung|IBM|NVIDIA/i)
  const modelMatch = value.match(/Xeon|Threadripper|Athlon|Pentium|Celeron|Opteron|Phenom|Turion|Sempron|FX|A-Series|R-Series|EPYC|Ryzen/i)

  let modelNum = ""
  const ryzen = value.match(/Ryzen.*?(\d{3,4}(?:[A-Z]{0,2})?)/i)
  if (ryzen?.[1]) modelNum = ryzen[1]
  const epyc = value.match(/EPYC\s+(\d[A-Z0-9]{2,4})/i)
  if (!modelNum && epyc?.[1]) modelNum = epyc[1]
  const xeon = value.match(/\b(E\d-\d{4}(?:\s?v\d)?)\b/i)
  if (!modelNum && xeon?.[1]) modelNum = xeon[1]
  const core = value.match(/\b(i[3579]-\d{4,5}\w*)\b/i)
  if (!modelNum && core?.[1]) modelNum = core[1]

  return {
    company: companyMatch ? companyMatch[0] : "",
    model: modelMatch ? modelMatch[0] : "",
    modelNum,
  }
}

export function formatBinaryValue(
  bytes: number,
  decimals: { t: number; g: number; m: number; k: number } = { t: 2, g: 2, m: 1, k: 1 },
): NumberUnit {
  const stats = calcBinary(bytes)
  if (stats.p && stats.p > 1) return { value: Number(stats.p.toFixed(1)), unit: "P" }
  if (stats.t > 1) return { value: Number(stats.t.toFixed(decimals.t)), unit: "T" }
  if (stats.g > 1) return { value: Number(stats.g.toFixed(decimals.g)), unit: "G" }
  if (stats.m > 1) return { value: Number(stats.m.toFixed(decimals.m)), unit: "M" }
  return { value: Number(stats.k.toFixed(decimals.k)), unit: "K" }
}

export function formatTrafficValue(
  bytes: number,
  decimals: { t: number; g: number; m: number; k: number } = { t: 2, g: 2, m: 1, k: 1 },
): NumberUnit {
  const value = Math.max(Number(bytes) || 0, 0)
  const k = value / 1000
  const m = k / 1000
  const g = m / 1000
  const t = g / 1000
  const p = t / 1000
  if (p > 1) return { value: Number(p.toFixed(1)), unit: "P" }
  if (t > 1) return { value: Number(t.toFixed(decimals.t)), unit: "T" }
  if (g > 1) return { value: Number(g.toFixed(decimals.g)), unit: "G" }
  if (m > 1) return { value: Number(m.toFixed(decimals.m)), unit: "M" }
  return { value: Number(k.toFixed(decimals.k)), unit: "K" }
}

export function formatDurationValue(uptimeSeconds: number): NumberUnit {
  const total = Math.max(Number(uptimeSeconds) || 0, 0)
  const days = Math.floor(total / 86400)
  if (days > 0) return { value: days, unit: "天" }
  const hours = Math.floor((total % 86400) / 3600)
  if (hours > 0) return { value: hours, unit: "小时" }
  const minutes = Math.floor((total % 3600) / 60)
  if (minutes > 0) return { value: minutes, unit: "分钟" }
  return { value: Math.floor(total % 60), unit: "秒" }
}

function getEffectiveBillingEndTime(billingDataMod: PublicNoteData["billingDataMod"], nowTime = Date.now()) {
  if (!billingDataMod) return null

  const { amount, unit } = parseBillingCycle(billingDataMod.cycle || "")
  const endDate = String(billingDataMod.endDate || "")
  if (!endDate || endDate.startsWith("0000-00-00")) return null

  const endTime = dayjs(endDate).valueOf()
  if (!Number.isFinite(endTime)) return null
  if (!isAutoRenewalEnabled(billingDataMod.autoRenewal) || endTime > nowTime) return endTime

  return getNextCycleTime(endTime, amount, nowTime, unit)
}

function formatEffectiveBillingEndDate(parsedData: PublicNoteData | null, nowTime = Date.now()) {
  const billingDataMod = parsedData?.billingDataMod
  const endDate = String(billingDataMod?.endDate || "")
  if (endDate.startsWith("0000-00-00")) return "长期有效"

  const effectiveEndTime = getEffectiveBillingEndTime(billingDataMod, nowTime)
  if (effectiveEndTime == null) return formatBillingEndDate(endDate)

  return dayjs(effectiveEndTime).format("YYYY-MM-DD")
}

export function computeRemainingTime(parsedData: PublicNoteData | null, nowTime = Date.now()): RemainingTimeViewModel | null {
  const billingDataMod = parsedData?.billingDataMod
  if (!billingDataMod) return null

  const { amount, unit } = parseBillingCycle(billingDataMod.cycle || "")
  const endDate = String(billingDataMod.endDate || "")
  if (!endDate) return null

  if (endDate.startsWith("0000-00-00")) {
    return { label: "剩余", value: "长期有效", type: "infinity" }
  }

  const endTime = dayjs(endDate).valueOf()
  if (isAutoRenewalEnabled(billingDataMod.autoRenewal)) {
    if (endTime > nowTime) {
      const diff = dayjs(endTime).diff(dayjs(nowTime), "day") + 1
      return { label: "剩余", value: `${diff}天`, type: "days" }
    }
    const nextTime = getNextCycleTime(endTime, amount, nowTime, unit)
    const diff = dayjs(nextTime).diff(dayjs(nowTime), "day") + 1
    return { label: "剩余", value: `${diff}天`, type: "days" }
  }

  if (endTime > nowTime) {
    const diff = dayjs(endTime).diff(dayjs(nowTime), "day") + 1
    return { label: "剩余", value: `${diff}天`, type: "days" }
  }
  return { label: "剩余", value: "已过期", type: "expired" }
}

export function splitDaysText(value: string) {
  const m = String(value || "").match(/^(\d+)(天)$/)
  if (!m) return null
  return { num: m[1], unit: m[2] }
}

export function getRingTrackColor() {
  return "rgba(255, 255, 255, 0.25)"
}

export function getRingUsedColor(type: RingType) {
  if (type === "cpu") return "#0088FF"
  if (type === "mem") return "#0AA344"
  if (type === "swap") return "#FF8C00"
  return "#70F3FF"
}

export function getCpuCoreLabel(server: NezhaServer) {
  const cores = getCpuCoresFromCpuText(server.host?.cpu?.[0] || "")
  return cores ? `${cores}C` : ""
}

export function getServerRealtimeViewModel(server: NezhaServer, trafficType?: string, transferCounter = getTransferCounter(server)) {
  return {
    duration: formatDurationValue(server.state?.uptime || 0),
    transferStat: formatTrafficValue(getTrafficRuleBytes(transferCounter, trafficType)),
    inSpeed: formatBinaryValue(server.state?.net_in_speed || 0),
    outSpeed: formatBinaryValue(server.state?.net_out_speed || 0),
  }
}

export function getServerBillingViewModel(publicNote: string, now = Date.now()) {
  const parsedData = parsePublicNote(publicNote)
  const remainingTime = computeRemainingTime(parsedData, now)
  return {
    parsedData,
    remainingTime,
    remainingDays: remainingTime?.type === "days" ? splitDaysText(remainingTime.value) : null,
    endDateText: formatEffectiveBillingEndDate(parsedData, now),
  }
}

export function getServerCardViewModel(now: number, server: NezhaServer) {
  const info = normalizeServer(now, server)
  const billing = getServerBillingViewModel(info.public_note, now)
  const billingTransfer = getServerTransferStatsCounter(server, "billing")
  return {
    info,
    billing,
    realtime: getServerRealtimeViewModel(server, billing.parsedData?.planDataMod?.trafficType, billingTransfer),
    rings: getCardStatusRings(now, server),
  }
}

export function getServerDetailStatusViewModel(now: number, server: NezhaServer) {
  const info = normalizeServer(now, server)
  const billing = getServerBillingViewModel(info.public_note, now)
  const billingTransfer = getServerTransferStatsCounter(server, "billing")
  return {
    info,
    billing,
    realtime: getServerRealtimeViewModel(server, billing.parsedData?.planDataMod?.trafficType, billingTransfer),
    rings: getDetailStatusRings(server),
  }
}

export function getServerStatus(now: number, server: NezhaServer) {
  return normalizeServer(now, server).online ? "online" : "offline"
}

export function getServerStatusCounts(now: number, servers: NezhaServer[]) {
  const total = servers.length
  const online = servers.reduce((acc, server) => (getServerStatus(now, server) === "online" ? acc + 1 : acc), 0)
  return { total, online, offline: Math.max(total - online, 0) }
}

export function getServerHeaderStats(now: number, servers: NezhaServer[]) {
  let transferIn = 0
  let transferOut = 0
  let speedIn = 0
  let speedOut = 0

  servers.forEach((server) => {
    if (getServerStatus(now, server) !== "online") return
    const dailyTransfer = getServerTransferStatsCounter(server, "today")
    transferIn += dailyTransfer.in
    transferOut += dailyTransfer.out
    speedIn += Number(server.state?.net_in_speed || 0)
    speedOut += Number(server.state?.net_out_speed || 0)
  })

  return {
    transfer: {
      inData: formatHeaderDecimal(transferIn),
      outData: formatHeaderDecimal(transferOut),
    },
    netSpeed: {
      inData: formatHeaderBinary(speedIn),
      outData: formatHeaderBinary(speedOut),
    },
  }
}

export function getServerDailyTransferList(now: number, servers: NezhaServer[]): ServerDailyTransferViewModel[] {
  return servers.map((server) => {
    const transfer = getServerTransferStatsCounter(server, "today")
    const total = transfer.in + transfer.out
    return {
      id: server.id,
      name: server.name,
      online: getServerStatus(now, server) === "online",
      transferIn: formatTransferShort(transfer.in),
      transferOut: formatTransferShort(transfer.out),
      transferTotal: formatTransferShort(total),
      transferInTitle: formatTrafficBytes(transfer.in),
      transferOutTitle: formatTrafficBytes(transfer.out),
      transferTotalTitle: formatTrafficBytes(total),
      totalBytes: total,
    }
  })
}

export function getServerMapLocationViewModel(now: number, server: NezhaServer) {
  const info = normalizeServer(now, server)
  return {
    id: server.id,
    name: server.name,
    country_code: info.country_code,
    online: info.online,
  }
}

export function getPublicNoteTags(parsedData: PublicNoteData | null, options: { includeIp?: boolean; limit?: number } = {}) {
  const list: string[] = []
  const plan = parsedData?.planDataMod
  if (plan?.networkRoute) list.push(...String(plan.networkRoute).split(",").filter(Boolean))
  if (plan?.extra) list.push(...String(plan.extra).split(",").filter(Boolean))
  if (options.includeIp) {
    if (plan?.IPv4 === "1" && plan?.IPv6 === "1") list.push("双栈IP")
    else if (plan?.IPv4 === "1") list.push("仅IPv4")
    else if (plan?.IPv6 === "1") list.push("仅IPv6")
  }
  return typeof options.limit === "number" ? list.slice(0, options.limit) : list
}

export function getServerSearchViewModel(server: NezhaServer) {
  const parsedData = parsePublicNote(server.public_note || "")
  return {
    tagList: getPublicNoteTags(parsedData, { limit: 3 }),
    matchText: [
      server.name,
      parsedData?.planDataMod?.networkRoute,
      parsedData?.planDataMod?.extra,
      server.host?.platform,
      server.country_code,
    ]
      .map((item) => String(item || "").toLowerCase())
      .join(" "),
  }
}

export function matchServerSearchWord(server: NezhaServer, word: string) {
  const value = String(word || "").toLowerCase()
  if (!value) return true
  return getServerSearchViewModel(server).matchText.includes(value)
}

export function getServerDetailNameViewModel(server: NezhaServer) {
  const publicNote = resolvePublicNote(server.id, server.public_note || "")
  let slogan = ""
  try {
    const raw = publicNote ? JSON.parse(publicNote) : null
    slogan = raw?.customData?.slogan ? String(raw.customData.slogan) : ""
  } catch {
    slogan = ""
  }

  return {
    cpuInfo: parseCpuInfo(server.host?.cpu?.[0] || ""),
    slogan,
  }
}

function getDefaultDetailTransferItems(server: NezhaServer): TransferInfoItem[] {
  const transfer = getTransferCounter(server)
  const transferTotal = transfer.in + transfer.out

  return [
    {
      key: "in",
      label: "入",
      value: formatTransferShort(transfer.in),
      title: formatTrafficBytes(transfer.in),
      variant: "in",
    },
    {
      key: "out",
      label: "出",
      value: formatTransferShort(transfer.out),
      title: formatTrafficBytes(transfer.out),
      variant: "out",
    },
    {
      key: "total",
      label: "双向",
      value: formatTransferShort(transferTotal),
      title: formatTrafficBytes(transferTotal),
      variant: "total",
    },
  ]
}

function getDetailTransferItems(server: NezhaServer, parsedData: PublicNoteData | null): TransferInfoItem[] {
  if (!hasTrafficPlan(parsedData)) {
    return getDefaultDetailTransferItems(server)
  }

  const plan = parsedData?.planDataMod
  const quotaBytes = parseTrafficQuotaBytes(plan?.trafficVol)
  if (quotaBytes == null) {
    return getDefaultDetailTransferItems(server)
  }

  const billingTransfer = getServerTransferStatsCounter(server, "billing")
  const usedBytes = getTrafficRuleBytes(billingTransfer, plan?.trafficType)
  const remainingBytes = Math.max(quotaBytes - usedBytes, 0)

  return [
    {
      key: "used",
      label: "已用",
      value: formatTransferShort(usedBytes),
      title: `${formatTrafficBytes(usedBytes)} / ${formatTrafficBytes(quotaBytes)} (${getTrafficTypeLabel(plan?.trafficType)})`,
      variant: "used",
    },
    {
      key: "remaining",
      label: "剩余",
      value: formatTransferShort(remainingBytes),
      title: formatTrafficBytes(remainingBytes),
      variant: "remaining",
    },
  ]
}

export function getServerDetailInfoViewModel(now: number, server: NezhaServer) {
  const info = normalizeServer(now, server)
  const parsedData = parsePublicNote(info.public_note)

  return {
    info,
    cpuList: (server.host?.cpu || []).map(formatCpuModelText).filter(Boolean),
    gpuList: server.host?.gpu || [],
    temperatureItems: (server.state?.temperatures || []).map((item) => ({
      iconClass: getTemperatureIconClass(item.Name),
      label: item.Name,
      title: `${item.Name}: ${item.Temperature.toFixed(2)}°C`,
      value: `${item.Temperature.toFixed(1)}°C`,
    })),
    systemLabel: GetOsName(server.host?.platform || ""),
    platformVersion: server.host?.platform_version || "",
    processCount: server.state?.process_count ?? 0,
    loadText: formatLoad(server),
    tcpText: server.state?.tcp_conn_count ?? "-",
    udpText: server.state?.udp_conn_count ?? "-",
    bootTime: server.host?.boot_time ? dayjs(server.host.boot_time * 1000).format("YYYY.MM.DD HH:mm:ss") : "-",
    lastActive: info.last_active_time_string ? dayjs(info.last_active_time_string).format("YYYY.MM.DD HH:mm:ss") : "-",
    transferItems: getDetailTransferItems(server, parsedData),
    tagList: getPublicNoteTags(parsedData, { includeIp: true }),
  }
}

export function getCardStatusRings(now: number, server: NezhaServer): ServerStatusRingViewModel[] {
  const info = normalizeServer(now, server)
  const cpuUsed = roundPercent(info.cpu)
  const memUsed = roundPercent(info.mem)
  const diskUsed = roundPercent(info.disk)

  return [
    {
      type: "cpu",
      used: cpuUsed,
      label: "CPU",
      valPercent: `${cpuUsed}%`,
      valText: getCpuCoreLabel(server),
    },
    {
      type: "mem",
      used: memUsed,
      label: "内存",
      valPercent: `${memUsed}%`,
      valText: formatBinaryUsageGT(server.state?.mem_used || 0, server.host?.mem_total || 0),
    },
    {
      type: "disk",
      used: diskUsed,
      label: "磁盘",
      valPercent: `${diskUsed}%`,
      valText: formatBinaryUsageGT(server.state?.disk_used || 0, server.host?.disk_total || 0),
    },
  ]
}

export function getDetailStatusRings(server: NezhaServer): ServerStatusRingViewModel[] {
  const memTotal = server.host?.mem_total || 0
  const swapTotal = server.host?.swap_total || 0
  const diskTotal = server.host?.disk_total || 0

  const memPercent = calcPercent(server.state?.mem_used, memTotal)
  const swapPercent = calcPercent(server.state?.swap_used, swapTotal)
  const diskPercent = calcPercent(server.state?.disk_used, diskTotal)

  const list: ServerStatusRingViewModel[] = [
    {
      type: "cpu",
      used: roundPercent(server.state?.cpu || 0),
      label: "CPU",
      valPercent: `${roundPercent(server.state?.cpu || 0)}%`,
      valText: getCpuCoreLabel(server),
    },
    {
      type: "mem",
      used: roundPercent(memPercent),
      label: "内存",
      valPercent: `${roundPercent(memPercent)}%`,
      valText: formatBinaryUsageGT(server.state?.mem_used || 0, memTotal),
    },
  ]

  if (swapTotal > 0) {
    list.push({
      type: "swap",
      used: roundPercent(swapPercent),
      label: "交换",
      valPercent: `${roundPercent(swapPercent)}%`,
      valText: formatBinaryUsageGT(server.state?.swap_used || 0, swapTotal),
    })
  }

  list.push({
    type: "disk",
    used: roundPercent(diskPercent),
    label: "磁盘",
    valPercent: `${roundPercent(diskPercent)}%`,
    valText: formatBinaryUsageGT(server.state?.disk_used || 0, diskTotal),
  })

  return list
}
