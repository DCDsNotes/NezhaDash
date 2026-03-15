import { type CSSProperties, useEffect, useMemo, useState } from "react"

import { useQuery } from "@tanstack/react-query"

import MiniLineChart, { type LineChartPoint, type LineChartSeries } from "@/components/MiniLineChart"
import { fetchMonitor } from "@/lib/nezha-api"
import { cn } from "@/lib/utils"
import { type NezhaMonitor } from "@/types/nezha-api"

type MinuteOption = { label: string; value: number }

type CateItem = {
  id: number
  name: string
  color: string
  avg: number
  over: number
  loss: number
  validRate: number
  title: string
}

type MonitorChartData = {
  dateList: number[]
  cateList: CateItem[]
  seriesList: LineChartSeries[]
  seriesByCate: LineChartSeries[][]
}

const baseMinutes: MinuteOption[] = [
  { label: "30分钟", value: 30 },
  { label: "1小时", value: 60 },
  { label: "3小时", value: 180 },
  { label: "6小时", value: 360 },
  { label: "12小时", value: 720 },
  { label: "24小时", value: 1440 },
]

const DEFAULT_LINE_COLORS = [
  "#5470C6",
  "#91CC75",
  "#FAC858",
  "#EE6666",
  "#73C0DE",
  "#3BA272",
  "#FC8452",
  "#9A60B4",
  "#EA7CCC",
  "#C23531",
  "#2F4554",
  "#61A0A8",
  "#D48265",
  "#91C7AE",
  "#749F83",
  "#CA8622",
  "#BDA29A",
  "#6E7074",
  "#546570",
  "#C4CCD3",
]

function normalizeTimestampMs(t: number) {
  const n = Number(t)
  if (!Number.isFinite(n)) return 0
  if (n > 1e11) return n
  return n * 1000
}

function toMinuteKey(t: number) {
  const ms = normalizeTimestampMs(t)
  return Math.floor(ms / 60000) * 60000
}

function getLineColor(id: number) {
  const idx = Math.abs(Number(id) || 0) % DEFAULT_LINE_COLORS.length
  return DEFAULT_LINE_COLORS[idx]
}

function getThreshold(raw: Array<number | null | undefined>) {
  const filtered = raw.filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v !== 0)
  if (filtered.length === 0) return { median: 0, tolerancePercent: 0.2 }

  const sorted = [...filtered].sort((a, b) => Math.ceil(a) - Math.ceil(b))
  const trimCount = Math.floor(sorted.length * 0.1)
  const trimmed = trimCount >= 1 ? sorted.slice(trimCount, sorted.length - trimCount) : sorted

  const mid = Math.floor(trimmed.length / 2)
  const median = trimmed.length % 2 === 0 ? (trimmed[mid - 1] + trimmed[mid]) / 2 : trimmed[mid]

  let tolerancePercent = 0.15
  if (median <= 10) tolerancePercent = 0.5
  else if (median <= 30) tolerancePercent = 0.35
  else if (median <= 50) tolerancePercent = 0.25
  else if (median <= 100) tolerancePercent = 0.2

  return { median, tolerancePercent }
}

function formatLatency(value: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "-"
  return `${value}ms`
}

function formatPercent(value: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  return `${value}%`
}

function clampPercent(n: number) {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 100) return 100
  return n
}

function buildMonitorChartData({
  monitorData,
  minute,
  nowServerTime,
  peakShaving,
  showCates,
}: {
  monitorData: NezhaMonitor[]
  minute: number
  nowServerTime: number
  peakShaving: boolean
  showCates: Record<number, boolean>
}): MonitorChartData {
  const cateList: CateItem[] = []
  const dateSet = new Set<number>()
  const seriesByCate: LineChartSeries[][] = []
  const seriesList: LineChartSeries[] = []

  const acceptShowTime = (Math.floor(nowServerTime / 60000) - minute) * 60000

  monitorData.forEach((m) => {
    const monitorName = String(m.monitor_name || "")
    const monitorId = Number(m.monitor_id || 0)
    const createdAt = Array.isArray(m.created_at) ? m.created_at : []
    const avgDelay = Array.isArray(m.avg_delay) ? m.avg_delay : []
    const packetLoss = Array.isArray(m.packet_loss) ? m.packet_loss : []
    const hasPacketLoss = packetLoss.length > 0

    const cateAcceptTimeMap = new Map<number, number>()
    const cateAcceptLossMap = new Map<number, number>()
    let earliestTimestamp = nowServerTime

    createdAt.forEach((t, index) => {
      const time = toMinuteKey(t)
      if (!time) return
      if (time < earliestTimestamp) earliestTimestamp = time
      if (time < acceptShowTime) return
      const d = Number(avgDelay[index])
      if (Number.isFinite(d)) {
        cateAcceptTimeMap.set(time, d)
      }

      if (hasPacketLoss) {
        const lossRaw = packetLoss[index]
        const loss = Number(lossRaw)
        if (Number.isFinite(loss)) {
          cateAcceptLossMap.set(time, clampPercent(loss))
        }
      }
    })

    const actualStartTime = Math.max(acceptShowTime, earliestTimestamp)
    const allMinutes = Math.max(0, Math.floor((nowServerTime - actualStartTime) / 60000))

    const dateMap = new Map<number, number | null | undefined>()
    const lossDateMap = new Map<number, number | null | undefined>()
    for (let j = 0; j <= allMinutes; j += 1) {
      const time = actualStartTime + j * 60000
      const delayV = cateAcceptTimeMap.get(time)
      dateMap.set(time, delayV ?? undefined)

      if (hasPacketLoss) {
        const lossV = cateAcceptLossMap.get(time)
        lossDateMap.set(time, lossV ?? undefined)
      } else {
        lossDateMap.set(time, delayV === undefined ? 100 : 0)
      }
    }

    const { median, tolerancePercent } = peakShaving ? getThreshold(Array.from(dateMap.values())) : { median: 0, tolerancePercent: 0 }
    if (peakShaving && median > 0) {
      const threshold = median * tolerancePercent
      dateMap.forEach((v, k) => {
        if (typeof v !== "number" || !Number.isFinite(v)) return
        if (Math.abs(v - median) > threshold) dateMap.set(k, null)
      })
    }

    const lineData: LineChartPoint[] = []
    const lossLineData: LineChartPoint[] = []
    const validatedData: Array<[number, number]> = []
    const overValidatedData: LineChartPoint[] = []
    let delayTotal = 0
    let lossTotal = 0
    let lossCount = 0

    dateMap.forEach((v, k) => {
      const time = Number(k)
      const val = typeof v === "number" && Number.isFinite(v) ? Number((Math.round(v * 100) / 100).toFixed(2)) : v

      lineData.push([time, (val ?? null) as number | null])
      const lossV = lossDateMap.get(time)
      const lossVal = typeof lossV === "number" && Number.isFinite(lossV) ? clampPercent(lossV) : lossV
      lossLineData.push([time, (lossVal ?? null) as number | null])

      if (typeof val === "number" && Number.isFinite(val)) {
        dateSet.add(time)
        validatedData.push([time, val])
        delayTotal += val
      }
      if (v !== undefined) {
        overValidatedData.push([time, (val ?? null) as number | null])
      }
      if (typeof lossVal === "number" && Number.isFinite(lossVal)) {
        lossTotal += lossVal
        lossCount += 1
      }
    })

    const avg = validatedData.length ? delayTotal / validatedData.length : 0
    const over = lineData.length ? (overValidatedData.length / lineData.length) * 100 : 0
    const loss = lossCount > 0 ? lossTotal / lossCount : 100 - over
    const validRate = 1 - (validatedData.length > 0 && overValidatedData.length > 0 ? validatedData.length / overValidatedData.length : 0)

    const color = getLineColor(monitorId)
    const cate: CateItem = {
      id: monitorId,
      name: monitorName,
      color,
      avg: Number(avg.toFixed(2)),
      over: Number(over.toFixed(2)),
      loss: Number(loss.toFixed(2)),
      validRate: Number((validRate * 100).toFixed(2)),
      title: [
        monitorName,
        avg > 0 ? `平均延迟：${Number(avg.toFixed(2))}ms` : "",
        `成功率：${Number(over.toFixed(2))}%`,
        `丢包率：${Number(loss.toFixed(2))}%`,
        peakShaving ? `削峰率: ${Number((validRate * 100).toFixed(2))}%` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    }

    cateList.push(cate)

    const cateId = monitorId
    const delaySeries: LineChartSeries = {
      id: `${cateId}-delay`,
      name: monitorName,
      data: lineData,
      color,
      yAxisIndex: 0,
    }

    const lossSeries: LineChartSeries = {
      id: `${cateId}-loss`,
      name: `${monitorName} 丢包`,
      data: lossLineData,
      color,
      dashed: true,
      opacity: 0.55,
      yAxisIndex: 1,
    }

    const show = showCates[cateId] !== false
    seriesByCate.push([delaySeries, lossSeries])
    if (show) {
      seriesList.push(delaySeries, lossSeries)
    }
  })

  const dateList = Array.from(dateSet).sort((a, b) => a - b)
  return {
    dateList,
    cateList,
    seriesList,
    seriesByCate,
  }
}

function readLocalBool(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback
  const raw = window.localStorage.getItem(key)
  if (raw === null) return fallback
  return raw === "true"
}

function writeLocalBool(key: string, val: boolean) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, String(val))
}

function readLocalChartType() {
  if (typeof window === "undefined") return "multi" as const
  const raw = window.localStorage.getItem("nazhua_monitor_chart_type")
  return raw === "single" ? ("single" as const) : ("multi" as const)
}

export default function ServerDetailMonitor({ now, serverId }: { now: number; serverId: number }) {
  const [minute, setMinute] = useState<number>(1440)
  const [peakShaving, setPeakShaving] = useState<boolean>(() => readLocalBool("nazhua_monitor_peak_shaving", false))
  const [refreshData, setRefreshData] = useState<boolean>(() => readLocalBool("nazhua_monitor_refresh_data", true))
  const [chartType, setChartType] = useState<"single" | "multi">(() => readLocalChartType())
  const [showCates, setShowCates] = useState<Record<number, boolean>>({})

  const { data: monitorResp, isLoading } = useQuery({
    queryKey: ["monitor", serverId],
    queryFn: () => fetchMonitor(serverId),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: refreshData ? 10000 : false,
  })

  const monitorData = useMemo(() => (monitorResp?.success && Array.isArray(monitorResp.data) ? monitorResp.data : []), [monitorResp])

  useEffect(() => {
    if (monitorData.length === 0) return
    setShowCates((prev) => {
      const next: Record<number, boolean> = { ...prev }
      monitorData.forEach((m) => {
        const id = Number(m.monitor_id || 0)
        if (!id) return
        if (next[id] === undefined) next[id] = true
      })
      return next
    })
  }, [monitorData])

  const minutes = baseMinutes

  const minuteActiveArrowStyle = useMemo(() => {
    const index = minutes.findIndex((m) => m.value === minute)
    return { left: `calc(${Math.max(0, index)} * var(--minute-item-width))` }
  }, [minutes, minute])

  const chartData = useMemo(
    () =>
      buildMonitorChartData({
        monitorData,
        minute,
        nowServerTime: normalizeTimestampMs(now) || Date.now(),
        peakShaving,
        showCates,
      }),
    [monitorData, minute, now, peakShaving, showCates],
  )

  function togglePeakShaving() {
    setPeakShaving((v) => {
      const next = !v
      writeLocalBool("nazhua_monitor_peak_shaving", next)
      return next
    })
  }

  function toggleAutoRefresh() {
    setRefreshData((v) => {
      const next = !v
      writeLocalBool("nazhua_monitor_refresh_data", next)
      return next
    })
  }

  function toggleChartType() {
    setChartType((v) => {
      const next = v === "single" ? "multi" : "single"
      if (typeof window !== "undefined") window.localStorage.setItem("nazhua_monitor_chart_type", next)
      return next
    })
  }

  function toggleMinute(val: number) {
    setMinute(val)
  }

  function toggleShowCate(id: number) {
    setShowCates((prev) => {
      const currentShow = prev[id] !== false
      return { ...prev, [id]: !currentShow }
    })
  }

  const hasMonitorData = monitorData.length > 0
  const cateStyle = (color: string) => ({ ["--cate-color" as `--${string}`]: color } as CSSProperties)

  return (
    <div
      className={cn("server-monitor-group", "nazha-box", {
        "chart-type--multi": chartType === "multi",
        "chart-type--single": chartType === "single",
      })}
    >
      <div className="module-head-group">
        <div className="left-box">
          <span className="module-title">网络监控</span>
        </div>
        <div className="right-box">
          <div className="chart-type-switch-group" title="监控折线图是否聚合" onClick={toggleChartType}>
            <span className="label-text">聚合</span>
            <div
              className={cn("switch-box", {
                active: chartType === "multi",
              })}
            >
              <span className="switch-dot" />
            </div>
          </div>
          <div className="refresh-data-group" title="是否自动刷新" onClick={toggleAutoRefresh}>
            <span className="label-text">刷新</span>
            <div
              className={cn("switch-box", {
                active: refreshData,
              })}
            >
              <span className="switch-dot" />
            </div>
          </div>
          <div className="peak-shaving-group" title="过滤太高或太低的数据" onClick={togglePeakShaving}>
            <span className="label-text">削峰</span>
            <div
              className={cn("switch-box", {
                active: peakShaving,
              })}
            >
              <span className="switch-dot" />
            </div>
          </div>
          <div className="last-update-time-group">
            <span className="last-update-time-label">最近</span>
            <div className="minutes">
              {minutes.map((m) => (
                <div
                  key={m.value}
                  className={cn("minute-item", { active: m.value === minute })}
                  onClick={() => toggleMinute(m.value)}
                >
                  <span>{m.label}</span>
                </div>
              ))}
              <div className="active-arrow" style={minuteActiveArrowStyle} />
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="monitor-placeholder">
          <div className="placeholder-line placeholder-line--w60" />
          <div className="placeholder-line placeholder-line--w40" />
          <div className="placeholder-chart" />
        </div>
      ) : !hasMonitorData ? (
        <div className="monitor-empty">暂无监控数据</div>
      ) : chartType === "single" ? (
        <div className={cn("monitor-chart-group", `monitor-chart-len--${chartData.cateList.length}`)}>
          {chartData.cateList.map((cate, index) => (
            <div key={cate.id} className="monitor-chart-item">
              <div className="cate-name-box">
                <div
                  className="monitor-cate-item"
                  style={cateStyle(cate.color)}
                  title={cate.title}
                >
                  <span className="cate-legend" />
                  <span className="cate-name" title={cate.name}>
                    {cate.name}
                  </span>
                  <div className="cate-metrics-row">
                    <span className="cate-avg-ms cate-metric">
                      <span className="metric-label">延时</span>
                      <span className="metric-value">{formatLatency(cate.avg)}</span>
                    </span>
                    <span className="cate-loss-rate cate-metric">
                      <span className="metric-label">丢包</span>
                      <span className="metric-value">{formatPercent(cate.loss)}</span>
                    </span>
                  </div>
                </div>
              </div>
              <MiniLineChart seriesList={chartData.seriesByCate[index] || []} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="monitor-cate-group">
            {chartData.cateList.map((cate) => (
              <div
                key={cate.id}
                className={cn("monitor-cate-item", {
                  disabled: showCates[cate.id] === false,
                })}
                style={cateStyle(cate.color)}
                title={cate.title}
                onClick={() => toggleShowCate(cate.id)}
              >
                <span className="cate-legend" />
                <span className="cate-name" title={cate.name}>
                  {cate.name}
                </span>
                <div className="cate-metrics-row">
                  <span className="cate-avg-ms cate-metric">
                    <span className="metric-label">延时</span>
                    <span className="metric-value">{formatLatency(cate.avg)}</span>
                  </span>
                  <span className="cate-loss-rate cate-metric">
                    <span className="metric-label">丢包</span>
                    <span className="metric-value">{formatPercent(cate.loss)}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
          <MiniLineChart seriesList={chartData.seriesList} />
        </>
      )}
    </div>
  )
}
