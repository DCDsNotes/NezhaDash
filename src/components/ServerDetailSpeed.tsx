import MiniLineChart, { type LineChartSeries } from "@/components/MiniLineChart"
import { useNearViewport } from "@/hooks/use-near-viewport"
import { fetchServerSpeedHistory } from "@/lib/nezha-api"
import { cn } from "@/lib/utils"
import { type NezhaServer, type NezhaServerSpeedHistory } from "@/types/nezha-api"
import { useQuery } from "@tanstack/react-query"
import { type CSSProperties, useMemo } from "react"

type SpeedPoint = {
  time: number
  inSpeed: number
  outSpeed: number
}

const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000
const SPEED_IN_COLOR = "#f5b199"
const SPEED_OUT_COLOR = "#89c3eb"

function normalizeTimestampMs(t: number) {
  const n = Number(t)
  if (!Number.isFinite(n)) return 0
  if (n > 1e11) return n
  return n * 1000
}

function formatSpeed(bytesPerSecond: number, decimals = 1) {
  const value = Math.max(Number(bytesPerSecond) || 0, 0)
  if (!value) return "0 B/s"

  const sizes = ["B/s", "KiB/s", "MiB/s", "GiB/s", "TiB/s"]
  const i = Math.min(Math.floor(Math.log(value) / Math.log(1024)), sizes.length - 1)
  return `${Number((value / 1024 ** i).toFixed(decimals))} ${sizes[i]}`
}

function getMaxSpeed(points: SpeedPoint[], key: "inSpeed" | "outSpeed") {
  if (!points.length) return 0
  return points.reduce((max, item) => Math.max(max, item[key]), 0)
}

function speedTooltipFormatter(value: number | null) {
  return value == null ? "-" : formatSpeed(value)
}

function speedAxisFormatter(value: number) {
  return formatSpeed(value, 0)
}

function speedCategoryStyle(color: string) {
  return { ["--cate-color" as `--${string}`]: color } as CSSProperties
}

function buildSpeedPoints(data: NezhaServerSpeedHistory | undefined) {
  if (!data) return []

  const createdAt = Array.isArray(data.created_at) ? data.created_at : []
  const inSpeedList = Array.isArray(data.net_in_speed) ? data.net_in_speed : []
  const outSpeedList = Array.isArray(data.net_out_speed) ? data.net_out_speed : []
  const length = Math.min(createdAt.length, inSpeedList.length, outSpeedList.length)
  const points: SpeedPoint[] = []

  for (let i = 0; i < length; i += 1) {
    const time = normalizeTimestampMs(Number(createdAt[i]))
    if (!time) continue
    points.push({
      time,
      inSpeed: Math.max(Number(inSpeedList[i]) || 0, 0),
      outSpeed: Math.max(Number(outSpeedList[i]) || 0, 0),
    })
  }

  return points.sort((a, b) => a.time - b.time)
}

function appendCurrentPoint(points: SpeedPoint[], point: SpeedPoint) {
  const list = points.filter((item) => item.time <= point.time)
  const last = list[list.length - 1]
  if (!last) return [point]
  if (point.time - last.time < 1000) return [...list.slice(0, -1), point]
  return [...list, point]
}

export default function ServerDetailSpeed({ now, server }: { now: number; server: NezhaServer }) {
  const { ref: speedRef, nearViewport } = useNearViewport<HTMLDivElement>()
  const nowTime = normalizeTimestampMs(now) || Date.now()
  const chartNowTime = Math.floor(nowTime / 60000) * 60000
  const inSpeed = Math.max(Number(server.state?.net_in_speed || 0), 0)
  const outSpeed = Math.max(Number(server.state?.net_out_speed || 0), 0)

  const { data: speedResp, isLoading } = useQuery({
    queryKey: ["server-speed", server.id],
    queryFn: () => fetchServerSpeedHistory(server.id),
    enabled: nearViewport,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    refetchInterval: 60000,
  })

  const serverPoints = useMemo(() => buildSpeedPoints(speedResp?.success ? speedResp.data : undefined), [speedResp])

  const chartData = useMemo(() => {
    const cutoff = chartNowTime - HISTORY_WINDOW_MS
    const points = appendCurrentPoint(
      serverPoints.filter((item) => item.time >= cutoff && item.time <= chartNowTime),
      {
        time: chartNowTime,
        inSpeed,
        outSpeed,
      },
    )
    const dateList = points.map((item) => item.time)
    const seriesList: LineChartSeries[] = [
      {
        id: "speed-in",
        name: "下载",
        data: points.map((item) => [item.time, item.inSpeed] as const),
        color: SPEED_IN_COLOR,
      },
      {
        id: "speed-out",
        name: "上传",
        data: points.map((item) => [item.time, item.outSpeed] as const),
        color: SPEED_OUT_COLOR,
      },
    ]

    return {
      points,
      dateList,
      seriesList,
      range: {
        min: chartNowTime - HISTORY_WINDOW_MS,
        max: chartNowTime,
      },
      inMax: getMaxSpeed(points, "inSpeed"),
      outMax: getMaxSpeed(points, "outSpeed"),
    }
  }, [chartNowTime, inSpeed, outSpeed, serverPoints])

  const speedItems = [
    {
      key: "in",
      name: "下载",
      color: SPEED_IN_COLOR,
      current: formatSpeed(inSpeed),
      max: formatSpeed(chartData.inMax),
      title: `当前下载 ${formatSpeed(inSpeed)}\n24小时最高 ${formatSpeed(chartData.inMax)}`,
    },
    {
      key: "out",
      name: "上传",
      color: SPEED_OUT_COLOR,
      current: formatSpeed(outSpeed),
      max: formatSpeed(chartData.outMax),
      title: `当前上传 ${formatSpeed(outSpeed)}\n24小时最高 ${formatSpeed(chartData.outMax)}`,
    },
  ]

  return (
    <div ref={speedRef} className="server-speed server-monitor nazha-box">
      <div className="server-monitor__header">
        <div className="server-monitor__title-area">
          <span className="server-monitor__title">24小时网速</span>
        </div>
      </div>

      <div className="server-monitor__categories server-speed__categories">
        {speedItems.map((item) => (
          <div
            key={item.key}
            className="server-monitor-category server-speed-category"
            style={speedCategoryStyle(item.color)}
            title={item.title}
          >
            <span className="server-monitor-category__legend" />
            <span className="server-monitor-category__name">{item.name}</span>
            <div className="server-monitor-category__metrics">
              <span className="server-monitor-category__metric server-monitor-category__metric--current">
                <span className="server-monitor-category__metric-label">当前</span>
                <span className="server-monitor-category__metric-value">{item.current}</span>
              </span>
              <span className="server-monitor-category__metric server-monitor-category__metric--max">
                <span className="server-monitor-category__metric-label">最高</span>
                <span className="server-monitor-category__metric-value">{item.max}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {(!nearViewport || isLoading) && chartData.points.length <= 1 ? (
        <div className="server-monitor__placeholder">
          <div className="server-monitor__placeholder-chart" />
        </div>
      ) : (
        <div
          className={cn("server-speed__chart", {
            "server-speed__chart--collecting": chartData.points.length < 2,
          })}
        >
          <MiniLineChart
            seriesList={chartData.seriesList}
            dateList={chartData.dateList}
            timeRange={chartData.range}
            tooltipMode="series"
            yAxisLabelFormatter={speedAxisFormatter}
            tooltipValueFormatter={speedTooltipFormatter}
          />
        </div>
      )}
    </div>
  )
}
