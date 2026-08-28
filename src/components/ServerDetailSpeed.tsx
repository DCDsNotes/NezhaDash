import MiniLineChart, { type LineChartSeries } from "@/components/MiniLineChart"
import { ServerMonitorCategoryContent, getServerMonitorCategoryStyle } from "@/components/ServerMonitorCategory"
import { ServerMonitorPlaceholder } from "@/components/ServerMonitorPlaceholder"
import { ServerMonitorTimeRange, getServerMonitorMinuteLabel } from "@/components/ServerMonitorTimeRange"
import { useNearViewport } from "@/hooks/use-near-viewport"
import { serverSpeedQueryOptions } from "@/lib/query-options"
import { normalizeTimestampMs } from "@/lib/time"
import { cn } from "@/lib/utils"
import { type NezhaServer, type NezhaServerSpeedHistory } from "@/types/nezha-api"
import { useQuery } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"

type SpeedPoint = {
  time: number
  inSpeed: number
  outSpeed: number
}

const SPEED_IN_COLOR = "#d97a59"
const SPEED_OUT_COLOR = "#3183a7"

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

export default function ServerDetailSpeed({ now, server, onReady }: { now: number; server: NezhaServer; onReady?: () => void }) {
  const [containerRef] = useNearViewport<HTMLDivElement>()
  const [minute, setMinute] = useState<number>(1440)
  const nowTime = normalizeTimestampMs(now) || Date.now()
  const chartNowTime = Math.floor(nowTime / 60000) * 60000
  const historyWindowMs = Math.max(1, minute) * 60000
  const inSpeed = Math.max(Number(server.state?.net_in_speed || 0), 0)
  const outSpeed = Math.max(Number(server.state?.net_out_speed || 0), 0)

  const {
    data: speedResp,
    isError,
    isLoading,
  } = useQuery({
    ...serverSpeedQueryOptions(server.id),
    enabled: true,
    refetchInterval: 60000,
  })

  const serverPoints = useMemo(() => buildSpeedPoints(speedResp?.success ? speedResp.data : undefined), [speedResp])

  useEffect(() => {
    if (!isLoading) onReady?.()
  }, [isLoading, onReady])

  const chartData = useMemo(() => {
    const cutoff = chartNowTime - historyWindowMs
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
        min: chartNowTime - historyWindowMs,
        max: chartNowTime,
      },
      inMax: getMaxSpeed(points, "inSpeed"),
      outMax: getMaxSpeed(points, "outSpeed"),
    }
  }, [chartNowTime, historyWindowMs, inSpeed, outSpeed, serverPoints])

  const activeMinuteLabel = getServerMonitorMinuteLabel(minute)

  const speedItems = [
    {
      key: "in",
      name: "下载",
      color: SPEED_IN_COLOR,
      current: formatSpeed(inSpeed),
      max: formatSpeed(chartData.inMax),
      title: `当前下载 ${formatSpeed(inSpeed)}\n${activeMinuteLabel}最高 ${formatSpeed(chartData.inMax)}`,
    },
    {
      key: "out",
      name: "上传",
      color: SPEED_OUT_COLOR,
      current: formatSpeed(outSpeed),
      max: formatSpeed(chartData.outMax),
      title: `当前上传 ${formatSpeed(outSpeed)}\n${activeMinuteLabel}最高 ${formatSpeed(chartData.outMax)}`,
    },
  ]

  return (
    <div ref={containerRef} className="server-speed server-monitor nazha-box">
      <div className="server-monitor__header">
        <div className="server-monitor__title-area">
          <span className="server-monitor__title">网络速度</span>
        </div>
        <div className="server-monitor__controls">
          <ServerMonitorTimeRange value={minute} onValueChange={setMinute} ariaLabel="网络速度时间范围" />
        </div>
      </div>

      <div className="server-monitor__categories server-speed__categories">
        {speedItems.map((item) => (
          <div
            key={item.key}
            className="server-monitor-category server-speed-category"
            style={getServerMonitorCategoryStyle(item.color)}
            title={item.title}
          >
            <ServerMonitorCategoryContent
              name={item.name}
              metrics={[
                { key: "current", modifier: "server-monitor-category__metric--current", label: "当前", value: item.current },
                { key: "max", modifier: "server-monitor-category__metric--max", label: "最高", value: item.max },
              ]}
            />
          </div>
        ))}
      </div>

      {isLoading && chartData.points.length <= 1 ? (
        <ServerMonitorPlaceholder />
      ) : isError ? (
        <div className="server-monitor__empty" role="alert">
          速度数据加载失败
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
            rightPadding={8}
            yAxisLabelFormatter={speedAxisFormatter}
            tooltipValueFormatter={speedTooltipFormatter}
          />
        </div>
      )}
    </div>
  )
}
