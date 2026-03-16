import { useMemo } from "react"

import { ServerStatusRing } from "@/components/ServerStatusRing"
import { calcBinary, formatBinaryUsageGT } from "@/lib/server-spec"
import { formatNezhaInfo, parsePublicNote } from "@/lib/utils"
import { NezhaServer } from "@/types/nezha-api"

function calcPercent(used: unknown, total: unknown) {
  const u = Number(used)
  const t = Number(total)
  if (!Number.isFinite(u) || !Number.isFinite(t) || t <= 0) return 0
  const v = (u / t) * 100
  if (!Number.isFinite(v) || v < 0) return 0
  if (v > 100) return 100
  return v
}

function getRingTrackColor() {
  return "rgba(255, 255, 255, 0.25)"
}

function getRingUsedColor(type: "cpu" | "mem" | "swap" | "disk") {
  if (type === "cpu") return "#0088FF"
  if (type === "mem") return "#0AA344"
  if (type === "swap") return "#FF8C00"
  return "#70F3FF"
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

function formatTransferValue(bytes: number) {
  const stats = calcBinary(bytes)
  if (stats.p && stats.p > 1) return { value: Number(stats.p.toFixed(1)), unit: "P" }
  if (stats.t > 1) return { value: Number(stats.t.toFixed(2)), unit: "T" }
  if (stats.g > 1) return { value: Number(stats.g.toFixed(2)), unit: "G" }
  if (stats.m > 1) return { value: Number(stats.m.toFixed(1)), unit: "M" }
  return { value: Number(stats.k.toFixed(1)), unit: "K" }
}

export default function ServerDetailStatusBox({ now, server }: { now: number; server: NezhaServer }) {
  const info = useMemo(() => formatNezhaInfo(now, server), [now, server])
  const parsedNote = useMemo(() => parsePublicNote(info.public_note), [info.public_note])

  const memTotal = server.host?.mem_total || 0
  const swapTotal = server.host?.swap_total || 0
  const diskTotal = server.host?.disk_total || 0

  const memPercent = calcPercent(server.state?.mem_used, memTotal)
  const swapPercent = calcPercent(server.state?.swap_used, swapTotal)
  const diskPercent = calcPercent(server.state?.disk_used, diskTotal)

  const duration = useMemo(() => formatDurationValue(server.state?.uptime || 0), [server.state?.uptime])

  const transferStat = useMemo(() => {
    const inTransfer = server.state?.net_in_transfer || 0
    const outTransfer = server.state?.net_out_transfer || 0
    const total = inTransfer + outTransfer
    let ruleStat = total
    const trafficType = parsedNote?.planDataMod?.trafficType
    if (trafficType === "1") ruleStat = outTransfer
    else if (trafficType === "3") ruleStat = outTransfer >= inTransfer ? outTransfer : inTransfer
    return formatTransferValue(ruleStat)
  }, [parsedNote?.planDataMod?.trafficType, server.state?.net_in_transfer, server.state?.net_out_transfer])

  const inSpeed = useMemo(() => formatTransferValue(server.state?.net_in_speed || 0), [server.state?.net_in_speed])
  const outSpeed = useMemo(() => formatTransferValue(server.state?.net_out_speed || 0), [server.state?.net_out_speed])

  const rings = useMemo(() => {
    const list = [
      {
        type: "cpu",
        used: Number((server.state?.cpu || 0).toFixed(1)),
        label: "CPU",
        valPercent: `${Number((server.state?.cpu || 0).toFixed(1))}%`,
        valText: `${Number((server.state?.cpu || 0).toFixed(1))}%`,
      },
      {
        type: "mem",
        used: Number(memPercent.toFixed(1)),
        label: "内存",
        valPercent: `${Number(memPercent.toFixed(1))}%`,
        valText: formatBinaryUsageGT(server.state?.mem_used || 0, memTotal),
      },
    ] as { type: "cpu" | "mem" | "swap" | "disk"; used: number; label: string; valPercent: string; valText: string }[]

    if (swapTotal > 0) {
      list.push({
        type: "swap",
        used: Number(swapPercent.toFixed(1)),
        label: "交换",
        valPercent: `${Number(swapPercent.toFixed(1))}%`,
        valText: formatBinaryUsageGT(server.state?.swap_used || 0, swapTotal),
      })
    }

    list.push({
      type: "disk",
      used: Number(diskPercent.toFixed(1)),
      label: "磁盘",
      valPercent: `${Number(diskPercent.toFixed(1))}%`,
      valText: formatBinaryUsageGT(server.state?.disk_used || 0, diskTotal),
    })
    return list
  }, [diskPercent, memPercent, swapPercent, swapTotal, server.state?.cpu, server.state?.disk_used, server.state?.mem_used, server.state?.swap_used])

  return (
    <div className="server-status-and-real-time nazha-box">
      <div className={`server-status-group server-status-group--ring status-list--${rings.length}`}>
        {rings.map((item) => (
          <ServerStatusRing
            key={item.type}
            type={item.type}
            used={item.used}
            colors={{ used: getRingUsedColor(item.type), total: getRingTrackColor() }}
            valPercent={item.valPercent}
            valText={item.valText}
            label={item.label}
          />
        ))}
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
  )
}
