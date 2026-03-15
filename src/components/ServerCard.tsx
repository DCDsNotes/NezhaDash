import dayjs from "dayjs"
import { useMemo } from "react"
import { useNavigate } from "react-router-dom"

import ServerFlag from "@/components/ServerFlag"
import { ServerStatusRing } from "@/components/ServerStatusRing"
import { serverIdToServerKey } from "@/lib/server-key"
import { getPlatformLogoIconClassName } from "@/lib/logo-class"
import { formatCpuMemDiskText, calcBinary } from "@/lib/server-spec"
import { cn, formatNezhaInfo, getNextCycleTime, parsePublicNote } from "@/lib/utils"
import { NezhaServer } from "@/types/nezha-api"

function formatBinaryValue(bytes: number, decimals: { t: number; g: number; m: number; k: number } = { t: 2, g: 2, m: 1, k: 1 }) {
  const stats = calcBinary(bytes)
  if (stats.p && stats.p > 1) return { value: Number(stats.p.toFixed(1)), unit: "P" }
  if (stats.t > 1) return { value: Number(stats.t.toFixed(decimals.t)), unit: "T" }
  if (stats.g > 1) return { value: Number(stats.g.toFixed(decimals.g)), unit: "G" }
  if (stats.m > 1) return { value: Number(stats.m.toFixed(decimals.m)), unit: "M" }
  return { value: Number(stats.k.toFixed(decimals.k)), unit: "K" }
}

function formatDurationValue(uptimeSeconds: number) {
  const total = Math.max(Number(uptimeSeconds) || 0, 0)
  const days = Math.floor(total / 86400)
  if (days > 0) return { value: days, unit: "天" }
  const hours = Math.floor((total % 86400) / 3600)
  if (hours > 0) return { value: hours, unit: "小时" }
  const minutes = Math.floor((total % 3600) / 60)
  if (minutes > 0) return { value: minutes, unit: "分钟" }
  return { value: Math.floor(total % 60), unit: "秒" }
}

function parseBillingCycle(cycle: string) {
  const c = String(cycle || "").toLowerCase()
  if (["月", "m", "mo", "month", "monthly"].includes(c)) return { months: 1, cycleLabel: "月" }
  if (["年", "y", "yr", "year", "annual"].includes(c)) return { months: 12, cycleLabel: "年" }
  if (["季", "q", "qr", "quarterly"].includes(c)) return { months: 3, cycleLabel: "季" }
  if (["半", "半年", "h", "half", "semi-annually"].includes(c)) return { months: 6, cycleLabel: "半年" }
  return { months: 1, cycleLabel: cycle }
}

function computeBillAndRemaining(parsedData: ReturnType<typeof parsePublicNote>) {
  const billingDataMod = parsedData?.billingDataMod
  if (!billingDataMod) return { billing: null, remainingTime: null }

  const { months, cycleLabel } = parseBillingCycle(billingDataMod.cycle || "")

  let billing: null | { value: string; cycleLabel?: string; isFree: boolean } = null
  if (billingDataMod.amount !== undefined && billingDataMod.amount !== null && billingDataMod.amount !== "") {
    const amount = String(billingDataMod.amount)
    if (amount === "-1") billing = { value: "按量", cycleLabel, isFree: false }
    else if (amount === "0") billing = { value: "免费", isFree: true }
    else billing = { value: amount, cycleLabel, isFree: false }
  }

  let remainingTime: null | { label: string; value: string; type: "infinity" | "days" | "expired" } = null
  const endDate = String(billingDataMod.endDate || "")
  if (endDate) {
    if (endDate.startsWith("0000-00-00")) {
      remainingTime = { label: "剩余", value: "长期有效", type: "infinity" }
    } else {
      const nowTime = Date.now()
      const endTime = dayjs(endDate).valueOf()
      if (billingDataMod.autoRenewal === "1") {
        if (endTime > nowTime) {
          const diff = dayjs(endTime).diff(dayjs(), "day") + 1
          remainingTime = { label: "剩余", value: `${diff}天`, type: "days" }
        } else {
          const nextTime = getNextCycleTime(endTime, months, nowTime)
          const diff = dayjs(nextTime).diff(dayjs(), "day") + 1
          remainingTime = { label: "剩余", value: `${diff}天`, type: "days" }
        }
      } else if (endTime > nowTime) {
        const diff = dayjs(endTime).diff(dayjs(), "day") + 1
        remainingTime = { label: "剩余", value: `${diff}天`, type: "days" }
      } else {
        remainingTime = { label: "剩余", value: "已过期", type: "expired" }
      }
    }
  }

  return { billing, remainingTime }
}

function getRingTrackColor() {
  return "rgba(255, 255, 255, 0.25)"
}

function getRingUsedColor(type: "cpu" | "mem" | "disk") {
  if (type === "cpu") return "#0088FF"
  if (type === "mem") return "#0AA344"
  return "#70F3FF"
}

function splitDaysText(value: string) {
  const m = String(value || "").match(/^(\d+)(天)$/)
  if (!m) return null
  return { num: m[1], unit: m[2] }
}

export default function ServerCard({ now, serverInfo }: { now: number; serverInfo: NezhaServer }) {
  const navigate = useNavigate()

  const info = formatNezhaInfo(now, serverInfo)
  const parsedData = useMemo(() => parsePublicNote(info.public_note), [info.public_note])
  const { billing, remainingTime } = useMemo(() => computeBillAndRemaining(parsedData), [parsedData])
  const platformIconClassName = useMemo(() => getPlatformLogoIconClassName(info.platform || ""), [info.platform])

  const cpuText = serverInfo.host?.cpu?.[0] || ""
  const cpuMemDiskText = useMemo(
    () => formatCpuMemDiskText(cpuText, serverInfo.host?.mem_total || 0, serverInfo.host?.disk_total || 0),
    [cpuText, serverInfo.host?.mem_total, serverInfo.host?.disk_total],
  )

  const memUsedBytes = serverInfo.state?.mem_used || 0
  const memTotalBytes = serverInfo.host?.mem_total || 0
  const memUsedStats = useMemo(() => calcBinary(memUsedBytes), [memUsedBytes])
  const memTotalStats = useMemo(() => calcBinary(memTotalBytes || 1), [memTotalBytes])
  const memValText = useMemo(() => {
    if (memUsedStats.g >= 10 && memTotalStats.g >= 10) return `${Number(memUsedStats.g.toFixed(1))}G`
    return `${Math.ceil(memUsedStats.m)}M`
  }, [memUsedStats.g, memUsedStats.m, memTotalStats.g])

  const diskUsedBytes = serverInfo.state?.disk_used || 0
  const diskTotalBytes = serverInfo.host?.disk_total || 0
  const diskUsedStats = useMemo(() => calcBinary(diskUsedBytes), [diskUsedBytes])
  const diskTotalStats = useMemo(() => calcBinary(diskTotalBytes || 1), [diskTotalBytes])
  const diskValText = useMemo(() => {
    if (diskUsedStats.t >= 1 && diskTotalStats.t >= 1) return `${Number(diskUsedStats.t.toFixed(1))}T`
    return `${Math.ceil(diskUsedStats.g)}G`
  }, [diskUsedStats.g, diskUsedStats.t, diskTotalStats.t])

  const transferStat = useMemo(() => {
    const inTransfer = serverInfo.state?.net_in_transfer || 0
    const outTransfer = serverInfo.state?.net_out_transfer || 0
    const total = inTransfer + outTransfer
    let ruleStat = total
    const trafficType = parsedData?.planDataMod?.trafficType
    if (trafficType === "1") {
      ruleStat = outTransfer
    } else if (trafficType === "3") {
      ruleStat = outTransfer >= inTransfer ? outTransfer : inTransfer
    }
    return formatBinaryValue(ruleStat)
  }, [parsedData?.planDataMod?.trafficType, serverInfo.state?.net_in_transfer, serverInfo.state?.net_out_transfer])

  const inSpeed = useMemo(() => formatBinaryValue(serverInfo.state?.net_in_speed || 0, { t: 2, g: 2, m: 1, k: 1 }), [serverInfo.state?.net_in_speed])
  const outSpeed = useMemo(() => formatBinaryValue(serverInfo.state?.net_out_speed || 0, { t: 2, g: 2, m: 1, k: 1 }), [serverInfo.state?.net_out_speed])
  const duration = useMemo(() => formatDurationValue(serverInfo.state?.uptime || 0), [serverInfo.state?.uptime])
  const remainingDays = useMemo(() => (remainingTime?.type === "days" ? splitDaysText(remainingTime.value) : null), [remainingTime?.type, remainingTime?.value])

  const cardClick = () => {
    sessionStorage.setItem("fromMainPage", "true")
    navigate(`/server/${serverIdToServerKey(serverInfo.id)}`)
  }

  return (
    <div className={cn("server-list-item nazha-box", { "server-list-item--offline": info.online === false })}>
      <div className="server-info-group server-list-item-head" onClick={cardClick}>
        <div className="server-name-group left-box">
          <ServerFlag country_code={info.country_code} />
          <span className="server-name">{info.name}</span>
        </div>
      </div>

      <div className="server-list-item-main" onClick={cardClick}>
        <div className="server-list-item-status type--ring len--3">
          <ServerStatusRing
            type="cpu"
            used={Number(info.cpu.toFixed(1))}
            colors={{ used: getRingUsedColor("cpu"), total: getRingTrackColor() }}
            valPercent={`${Number(info.cpu.toFixed(1))}%`}
            valText={`${Number(info.cpu.toFixed(1))}%`}
            label="CPU"
          />
          <ServerStatusRing
            type="mem"
            used={Number(info.mem.toFixed(1))}
            colors={{ used: getRingUsedColor("mem"), total: getRingTrackColor() }}
            valPercent={`${Number(info.mem.toFixed(1))}%`}
            valText={memValText}
            label="内存"
          />
          <ServerStatusRing
            type="disk"
            used={Number(info.disk.toFixed(1))}
            colors={{ used: getRingUsedColor("disk"), total: getRingTrackColor() }}
            valPercent={`${Number(info.disk.toFixed(1))}%`}
            valText={diskValText}
            label="磁盘"
          />
        </div>

        <div className="server-real-time-group">
          <div className="server-real-time-item server-real-time--duration">
            <div className="item-content">
              <span className="item-value">{duration.value}</span>
              <span className="item-unit item-text">{duration.unit}</span>
            </div>
            <span className="item-label">在线</span>
          </div>
          <div className="server-real-time-item server-real-time--transfer">
            <div className="item-content">
              <span className="item-value">{transferStat.value}</span>
              <span className="item-unit item-text">{transferStat.unit}</span>
            </div>
            <span className="item-label">流量</span>
          </div>
          <div className="server-real-time-item server-real-time--inSpeed">
            <div className="item-content">
              <span className="item-value">{inSpeed.value}</span>
              <span className="item-unit item-text">{inSpeed.unit}</span>
            </div>
            <span className="item-label">入网</span>
          </div>
          <div className="server-real-time-item server-real-time--outSpeed">
            <div className="item-content">
              <span className="item-value">{outSpeed.value}</span>
              <span className="item-unit item-text">{outSpeed.unit}</span>
            </div>
            <span className="item-label">出网</span>
          </div>
        </div>
      </div>

      <div className="server-list-item-bill">
        <div className="left-box">
          {remainingTime ? (
            <div className="remaining-time-info">
              <span className="icon" aria-hidden="true">
                <span className="ri-hourglass-fill" />
              </span>
              <span className="text">
                {remainingTime.type !== "infinity" ? (
                  <>
                    <span className="text-item label-text">{remainingTime.label}</span>
                    {remainingDays ? (
                      <>
                        <span className="text-item value-text">{remainingDays.num}</span>
                        <span className="text-item label-text">{remainingDays.unit}</span>
                      </>
                    ) : (
                      <span className="text-item value-text">{remainingTime.value}</span>
                    )}
                  </>
                ) : (
                  <span className="text-item value-text">{remainingTime.value}</span>
                )}
              </span>
            </div>
          ) : (
            <div />
          )}

          {cpuMemDiskText ? (
            <div className="server-spec">
              <span className={cn("server-spec-icon", platformIconClassName)} />
              <span className="server-spec-text">{cpuMemDiskText}</span>
            </div>
          ) : null}
        </div>

        <div className="billing-and-order-link">
          {billing ? (
            <div className="billing-info">
              <span className="text">
                <span className="text-item value-text">{billing.value}</span>
                {!billing.isFree && billing.cycleLabel ? (
                  <>
                    <span className="text-item">/</span>
                    <span className="text-item label-text">{billing.cycleLabel}</span>
                  </>
                ) : null}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
