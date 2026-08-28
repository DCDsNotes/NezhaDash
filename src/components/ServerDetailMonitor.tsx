import MiniLineChart, { type LineChartPoint, type LineChartSeries } from "@/components/MiniLineChart"
import { ServerMonitorCategoryContent, type ServerMonitorMetric, getServerMonitorCategoryStyle } from "@/components/ServerMonitorCategory"
import { ServerMonitorPlaceholder } from "@/components/ServerMonitorPlaceholder"
import { ServerMonitorTimeRange } from "@/components/ServerMonitorTimeRange"
import { Switch } from "@/components/ui/switch"
import { useNearViewport } from "@/hooks/use-near-viewport"
import { clampPercent } from "@/lib/number"
import { monitorQueryOptions } from "@/lib/query-options"
import { normalizeTimestampMs } from "@/lib/time"
import { cn } from "@/lib/utils"
import { type NezhaMonitor } from "@/types/nezha-api"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"

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
    let lossTotal = 0
    let lossCount = 0

    const seriesTimes = Array.from(new Set([...delayByTime.keys(), ...lossByTime.keys()])).sort((a, b) => a - b)

    seriesTimes.forEach((time) => {
      const delayValRaw = delayByTime.get(time)
      const delayVal =
        typeof delayValRaw === "number" && Number.isFinite(delayValRaw) ? Number((Math.round(delayValRaw * 100) / 100).toFixed(2)) : null
      lineData.push([time, delayVal])

      const lossValRaw = lossByTime.get(time)
      const lossVal = typeof lossValRaw === "number" && Number.isFinite(lossValRaw) ? clampPercent(lossValRaw) : null
      lossLineData.push([time, lossVal])

      if (delayByTime.has(time)) {
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
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : raw === "true"
  } catch {
    return fallback
  }
}

function writeLocalBool(key: string, val: boolean) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, String(val))
  } catch {
    // Keep the current preference in component state.
  }
}

function getCategoryMetrics(cate: CateItem): ServerMonitorMetric[] {
  return [
    { key: "latency", modifier: "server-monitor-category__metric--latency", label: "延时", value: formatLatency(cate.avg) },
    { key: "loss", modifier: "server-monitor-category__metric--loss", label: "丢包", value: formatPercent(cate.loss) },
  ]
}

function readLocalChartType() {
  if (typeof window === "undefined") return "single" as const
  try {
    return window.localStorage.getItem("nazhua_monitor_chart_type") === "multi" ? ("multi" as const) : ("single" as const)
  } catch {
    return "single" as const
  }
}

export default function ServerDetailMonitor({ now, serverId, onReady }: { now: number; serverId: number; onReady?: () => void }) {
  const [containerRef] = useNearViewport<HTMLDivElement>()
  const [minute, setMinute] = useState<number>(1440)
  const [peakShaving, setPeakShaving] = useState<boolean>(() => readLocalBool("nazhua_monitor_peak_shaving", false))
  const [refreshData, setRefreshData] = useState<boolean>(() => readLocalBool("nazhua_monitor_refresh_data", true))
  const [chartType, setChartType] = useState<"single" | "multi">(() => readLocalChartType())
  const [showCates, setShowCates] = useState<Record<number, boolean>>({})

  const {
    data: monitorResp,
    isError,
    isLoading,
  } = useQuery({
    ...monitorQueryOptions(serverId),
    enabled: true,
    refetchInterval: refreshData ? 60000 : false,
  })

  const monitorData = useMemo(() => (monitorResp?.success && Array.isArray(monitorResp.data) ? monitorResp.data : []), [monitorResp])

  useEffect(() => {
    if (!isLoading) onReady?.()
  }, [isLoading, onReady])

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

  const chartNowTime = Math.floor((normalizeTimestampMs(now) || Date.now()) / 60000) * 60000

  const chartData = useMemo(
    () =>
      buildMonitorChartData({
        monitorData,
        minute,
        nowServerTime: chartNowTime,
        peakShaving,
        showCates,
      }),
    [chartNowTime, monitorData, minute, peakShaving, showCates],
  )

  function setPeakShavingValue(next: boolean) {
    setPeakShaving(next)
    writeLocalBool("nazhua_monitor_peak_shaving", next)
  }

  function setAutoRefreshValue(next: boolean) {
    setRefreshData(next)
    writeLocalBool("nazhua_monitor_refresh_data", next)
  }

  function setChartTypeValue(isMulti: boolean) {
    const next = isMulti ? "multi" : "single"
    setChartType(next)
    try {
      window.localStorage.setItem("nazhua_monitor_chart_type", next)
    } catch {
      // Keep the current preference in component state.
    }
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
  return (
    <div
      ref={containerRef}
      className={cn("server-monitor", "nazha-box", {
        "server-monitor--multi": chartType === "multi",
        "server-monitor--single": chartType === "single",
      })}
    >
      <div className="server-monitor__header">
        <div className="server-monitor__title-area">
          <span className="server-monitor__title">网络监控</span>
        </div>
        <div className="server-monitor__controls">
          <label className="server-monitor__toggle server-monitor__toggle--chart-type" title="监控折线图是否聚合">
            <span className="server-monitor__toggle-label">聚合</span>
            <Switch
              checked={chartType === "multi"}
              onCheckedChange={setChartTypeValue}
              aria-label="聚合监控折线图"
              className={cn("server-monitor__switch", {
                "server-monitor__switch--active": chartType === "multi",
              })}
              thumbClassName="server-monitor__switch-dot"
            />
          </label>
          <label className="server-monitor__toggle server-monitor__toggle--refresh" title="是否自动刷新">
            <span className="server-monitor__toggle-label">刷新</span>
            <Switch
              checked={refreshData}
              onCheckedChange={setAutoRefreshValue}
              aria-label="自动刷新监控数据"
              className={cn("server-monitor__switch", {
                "server-monitor__switch--active": refreshData,
              })}
              thumbClassName="server-monitor__switch-dot"
            />
          </label>
          <label className="server-monitor__toggle server-monitor__toggle--peak-shaving" title="过滤太高或太低的数据">
            <span className="server-monitor__toggle-label">削峰</span>
            <Switch
              checked={peakShaving}
              onCheckedChange={setPeakShavingValue}
              aria-label="过滤异常延迟数据"
              className={cn("server-monitor__switch", {
                "server-monitor__switch--active": peakShaving,
              })}
              thumbClassName="server-monitor__switch-dot"
            />
          </label>
          <ServerMonitorTimeRange value={minute} onValueChange={setMinute} ariaLabel="监控时间范围" />
        </div>
      </div>

      {isLoading ? (
        <ServerMonitorPlaceholder withHeaderLines />
      ) : isError ? (
        <div className="server-monitor__empty" role="alert">
          监控数据加载失败
        </div>
      ) : !hasMonitorData ? (
        <div className="server-monitor__empty">暂无监控数据</div>
      ) : chartType === "single" ? (
        <div className={cn("server-monitor__charts", `server-monitor__charts--len-${chartData.cateList.length}`)}>
          {chartData.cateList.map((cate, index) => (
            <div key={cate.id} className="server-monitor__chart">
              <div className="server-monitor__chart-label">
                <div className="server-monitor-category" style={getServerMonitorCategoryStyle(cate.color)} title={cate.title}>
                  <ServerMonitorCategoryContent name={cate.name} nameTitle={cate.name} metrics={getCategoryMetrics(cate)} />
                </div>
              </div>
              <MiniLineChart seriesList={chartData.seriesByCate[index] || []} dateList={chartData.dateList} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="server-monitor__categories">
            {chartData.cateList.map((cate) => (
              <button
                type="button"
                key={cate.id}
                className={cn("server-monitor-category", {
                  "server-monitor-category--disabled": showCates[cate.id] === false,
                })}
                style={getServerMonitorCategoryStyle(cate.color)}
                title={cate.title}
                onClick={() => handleMultiCateClick(cate.id)}
                aria-pressed={showCates[cate.id] !== false}
              >
                <ServerMonitorCategoryContent name={cate.name} nameTitle={cate.name} metrics={getCategoryMetrics(cate)} />
              </button>
            ))}
          </div>
          <MiniLineChart seriesList={chartData.seriesList} dateList={chartData.dateList} />
        </>
      )}
    </div>
  )
}
