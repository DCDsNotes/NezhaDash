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

function calculatePacketLoss(delays: Array<number | null | undefined>): number[] {
  if (!delays || delays.length === 0) return []

  const packetLossRates: number[] = []
  const windowSize = Math.min(10, Math.max(3, Math.floor(delays.length / 10)))
  const timeoutThreshold = 3000
  const extremeDelayThreshold = 10000

  for (let i = 0; i < delays.length; i += 1) {
    const currentDelay = delays[i]
    let lossRate = 0

    if (currentDelay === 0 || currentDelay === null || currentDelay === undefined) {
      lossRate = 100
    } else if (currentDelay >= extremeDelayThreshold) {
      lossRate = Math.min(95, 60 + (currentDelay - extremeDelayThreshold) / 1000)
    } else if (currentDelay >= timeoutThreshold) {
      lossRate = Math.min(50, (currentDelay - timeoutThreshold) / 200)
    } else {
      const start = Math.max(0, i - Math.floor(windowSize / 2))
      const end = Math.min(delays.length, i + Math.ceil(windowSize / 2))
      const windowDelays = delays.slice(start, end).filter((d): d is number => typeof d === "number" && Number.isFinite(d) && d > 0)

      if (windowDelays.length > 2) {
        const mean = windowDelays.reduce((sum, d) => sum + d, 0) / windowDelays.length
        const variance = windowDelays.reduce((sum, d) => sum + (d - mean) ** 2, 0) / windowDelays.length
        const standardDeviation = Math.sqrt(variance)
        const coefficientOfVariation = standardDeviation / mean

        if (coefficientOfVariation > 0.8) {
          lossRate = Math.min(25, coefficientOfVariation * 15)
        } else if (coefficientOfVariation > 0.5) {
          lossRate = Math.min(10, coefficientOfVariation * 8)
        } else if (coefficientOfVariation > 0.3) {
          lossRate = Math.min(5, coefficientOfVariation * 5)
        }

        if (typeof currentDelay === "number" && currentDelay > mean * 2.5) {
          lossRate += Math.min(15, (currentDelay / mean - 2.5) * 10)
        }
      }
    }

    if (i > 0) {
      const alpha = 0.3
      lossRate = alpha * lossRate + (1 - alpha) * packetLossRates[i - 1]
    }

    packetLossRates.push(Math.max(0, Math.min(100, lossRate)))
  }

  return packetLossRates.map((rate) => Number(rate.toFixed(2)))
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
  const seriesByCate: LineChartSeries[][] = []
  const seriesList: LineChartSeries[] = []

  const nowTime = normalizeTimestampMs(nowServerTime) || Date.now()
  const acceptShowTime = nowTime - Math.max(0, Number(minute) || 0) * 60000

  const allTimeSet = new Set<number>()
  monitorData.forEach((m) => {
    const createdAt = Array.isArray(m.created_at) ? m.created_at : []
    createdAt.forEach((t) => {
      const time = normalizeTimestampMs(Number(t))
      if (!time) return
      if (time < acceptShowTime) return
      allTimeSet.add(time)
    })
  })
  const dateList = Array.from(allTimeSet).sort((a, b) => a - b)

  monitorData.forEach((m) => {
    const monitorName = String(m.monitor_name || "")
    const monitorId = Number(m.monitor_id || 0)
    const createdAt = Array.isArray(m.created_at) ? m.created_at : []
    const avgDelay = Array.isArray(m.avg_delay) ? m.avg_delay : []
    const packetLoss = Array.isArray(m.packet_loss) ? m.packet_loss : []
    const lossList = packetLoss.length > 0 ? packetLoss : calculatePacketLoss(avgDelay)

    const delayByTime = new Map<number, number | null>()
    const lossByTime = new Map<number, number | null>()

    for (let i = 0; i < createdAt.length; i += 1) {
      const time = normalizeTimestampMs(Number(createdAt[i]))
      if (!time) continue
      if (time < acceptShowTime) continue

      const d = Number(avgDelay[i])
      delayByTime.set(time, Number.isFinite(d) ? d : null)

      const l = Number(lossList[i])
      lossByTime.set(time, Number.isFinite(l) ? clampPercent(l) : null)
    }

    const { median, tolerancePercent } = peakShaving ? getThreshold(Array.from(delayByTime.values())) : { median: 0, tolerancePercent: 0 }
    let shavedCount = 0
    let eligibleCount = 0
    if (peakShaving && median > 0) {
      const threshold = median * tolerancePercent
      delayByTime.forEach((v, k) => {
        if (typeof v !== "number" || !Number.isFinite(v) || v === 0) return
        eligibleCount += 1
        if (Math.abs(v - median) > threshold) {
          delayByTime.set(k, null)
          shavedCount += 1
        }
      })
    }
    const shaveRatePercent = eligibleCount > 0 ? (shavedCount / eligibleCount) * 100 : 0

    const lineData: LineChartPoint[] = []
    const lossLineData: LineChartPoint[] = []

    let delayTotal = 0
    let delayCount = 0
    let sampleCount = 0
    let lossTotal = 0
    let lossCount = 0

    dateList.forEach((time) => {
      const delayValRaw = delayByTime.get(time)
      const delayVal = typeof delayValRaw === "number" && Number.isFinite(delayValRaw) ? Number((Math.round(delayValRaw * 100) / 100).toFixed(2)) : null
      lineData.push([time, delayVal])

      const lossValRaw = lossByTime.get(time)
      const lossVal = typeof lossValRaw === "number" && Number.isFinite(lossValRaw) ? clampPercent(lossValRaw) : null
      lossLineData.push([time, lossVal])

      if (delayByTime.has(time)) {
        sampleCount += 1
        if (typeof delayVal === "number" && Number.isFinite(delayVal) && delayVal > 0) {
          delayTotal += delayVal
          delayCount += 1
        }
      }
      if (typeof lossVal === "number" && Number.isFinite(lossVal)) {
        lossTotal += lossVal
        lossCount += 1
      }
    })

    const avg = delayCount > 0 ? delayTotal / delayCount : 0
    const loss = lossCount > 0 ? lossTotal / lossCount : 0
    const over = lossCount > 0 ? 100 - loss : 0
    const validRate = shaveRatePercent

    const color = getLineColor(monitorId)
    const cate: CateItem = {
      id: monitorId,
      name: monitorName,
      color,
      avg: Number(avg.toFixed(2)),
      over: Number(over.toFixed(2)),
      loss: Number(loss.toFixed(2)),
      validRate: Number(validRate.toFixed(2)),
      title: [
        monitorName,
        avg > 0 ? `平均延迟：${Number(avg.toFixed(2))}ms` : "",
        `成功率：${Number(over.toFixed(2))}%`,
        `丢包率：${Number(loss.toFixed(2))}%`,
        peakShaving ? `削峰率: ${Number(validRate.toFixed(2))}%` : "",
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

  function handleMultiCateClick(id: number) {
    setShowCates((prev) => {
      const ids = chartData.cateList.map((c) => c.id)
      if (!ids.length) return prev
      const isShown = (cateId: number) => prev[cateId] !== false
      const onlyThisSelected = ids.every((cateId) => (cateId === id ? isShown(cateId) : !isShown(cateId)))

      const next: Record<number, boolean> = { ...prev }
      if (onlyThisSelected) {
        ids.forEach((cateId) => {
          next[cateId] = true
        })
        return next
      }
      ids.forEach((cateId) => {
        next[cateId] = cateId === id
      })
      return next
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
              <MiniLineChart seriesList={chartData.seriesByCate[index] || []} dateList={chartData.dateList} />
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
                onClick={() => handleMultiCateClick(cate.id)}
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
          <MiniLineChart seriesList={chartData.seriesList} dateList={chartData.dateList} />
        </>
      )}
    </div>
  )
}
