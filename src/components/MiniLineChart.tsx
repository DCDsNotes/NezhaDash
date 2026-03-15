import { useEffect, useMemo, useRef, useState } from "react"

export type LineChartPoint = readonly [time: number, value: number | null]

export type LineChartSeries = {
  id: string
  name: string
  data: LineChartPoint[]
  color: string
  dashed?: boolean
  opacity?: number
  yAxisIndex?: 0 | 1
}

function normalizeTimestampMs(t: number) {
  const n = Number(t)
  if (!Number.isFinite(n)) return 0
  if (n > 1e11) return n
  return n * 1000
}

function buildPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return ""
  return `M ${points.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" L ")}`
}

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}

function clampInt(n: number, min: number, max: number) {
  const v = Math.floor(Number(n))
  if (!Number.isFinite(v)) return min
  if (v < min) return min
  if (v > max) return max
  return v
}

function niceStep(rawStep: number) {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const normalized = rawStep / magnitude
  if (normalized <= 1) return 1 * magnitude
  if (normalized <= 2) return 2 * magnitude
  if (normalized <= 5) return 5 * magnitude
  return 10 * magnitude
}

function buildTicks(max: number, targetLines = 5) {
  const m = Number(max)
  if (!Number.isFinite(m) || m <= 0) return [0, 1]
  const lines = clampInt(targetLines, 2, 8)
  const step = niceStep(m / (lines - 1))
  const niceMax = Math.max(step, Math.ceil(m / step) * step)
  const ticks: number[] = []
  for (let v = 0; v <= niceMax + step * 0.5; v += step) {
    ticks.push(v)
    if (ticks.length >= 10) break
  }
  return ticks
}

function formatTimeLabel(ms: number, spanMs: number) {
  const d = new Date(ms)
  if (!Number.isFinite(spanMs) || spanMs < 0) spanMs = 0
  if (spanMs >= 1000 * 60 * 60 * 24 * 2) {
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    const hh = String(d.getHours()).padStart(2, "0")
    const mi = String(d.getMinutes()).padStart(2, "0")
    return `${mm}-${dd} ${hh}:${mi}`
  }
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mi}`
}

function findNearestIndex(sorted: number[], target: number) {
  if (!sorted.length) return -1
  let lo = 0
  let hi = sorted.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const v = sorted[mid]
    if (v === target) return mid
    if (v < target) lo = mid + 1
    else hi = mid - 1
  }
  if (lo <= 0) return 0
  if (lo >= sorted.length) return sorted.length - 1
  const prev = sorted[lo - 1]
  const next = sorted[lo]
  return Math.abs(target - prev) <= Math.abs(next - target) ? lo - 1 : lo
}

function clampPercent(n: number) {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 100) return 100
  return n
}

export default function MiniLineChart({
  seriesList,
  connectNulls = false,
  dateList,
}: {
  seriesList: LineChartSeries[]
  connectNulls?: boolean
  dateList?: number[]
}) {
  const viewWidth = 1000
  const viewHeight = 300

  const paddingLeft = 44
  const paddingRight = 44
  const paddingTop = 10
  const paddingBottom = 22
  const plotWidth = viewWidth - paddingLeft - paddingRight
  const plotHeight = viewHeight - paddingTop - paddingBottom

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [hoverIdx, setHoverIdx] = useState<number>(-1)
  const [hoverX, setHoverX] = useState<number>(0)
  const [hovering, setHovering] = useState(false)

  const normalizedSeries = useMemo(() => {
    return seriesList.map((s) => ({
      ...s,
      data: s.data.map((d) => [normalizeTimestampMs(d[0]), d[1]] as const),
    }))
  }, [seriesList])

  const xRange = useMemo(() => {
    const dl = Array.isArray(dateList) ? dateList.map((t) => normalizeTimestampMs(t)).filter((t) => Number.isFinite(t) && t > 0) : []
    let xMin = dl.length ? Math.min(...dl) : Number.POSITIVE_INFINITY
    let xMax = dl.length ? Math.max(...dl) : Number.NEGATIVE_INFINITY

    if (!dl.length) {
      normalizedSeries.forEach((s) => {
        s.data.forEach(([t]) => {
          if (!Number.isFinite(t)) return
          if (t < xMin) xMin = t
          if (t > xMax) xMax = t
        })
      })
    }
    if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMax <= xMin) {
      return { xMin: 0, xMax: 1 }
    }
    return { xMin, xMax }
  }, [dateList, normalizedSeries])

  const delayMax = useMemo(() => {
    let max = 0
    normalizedSeries.forEach((s) => {
      if (s.yAxisIndex === 1) return
      s.data.forEach(([, v]) => {
        if (typeof v !== "number" || !Number.isFinite(v)) return
        if (v > max) max = v
      })
    })
    return Math.max(max, 1)
  }, [normalizedSeries])

  const yTicks = useMemo(() => buildTicks(delayMax, 5), [delayMax])
  const hasLossSeries = useMemo(() => normalizedSeries.some((s) => s.yAxisIndex === 1), [normalizedSeries])

  const normalizedDateList = useMemo(() => {
    if (Array.isArray(dateList) && dateList.length) {
      return dateList
        .map((t) => normalizeTimestampMs(t))
        .filter((t) => Number.isFinite(t) && t > 0)
        .sort((a, b) => a - b)
    }
    const set = new Set<number>()
    normalizedSeries.forEach((s) => s.data.forEach(([t]) => (t ? set.add(t) : null)))
    return Array.from(set).sort((a, b) => a - b)
  }, [dateList, normalizedSeries])

  const timeTicks = useMemo(() => {
    if (normalizedDateList.length < 2) return [] as number[]
    const lastIdx = normalizedDateList.length - 1
    const midIdx = Math.floor(lastIdx / 2)
    const q1Idx = Math.floor(lastIdx / 4)
    const q3Idx = Math.floor((lastIdx * 3) / 4)
    const list = [normalizedDateList[0], normalizedDateList[q1Idx], normalizedDateList[midIdx], normalizedDateList[q3Idx], normalizedDateList[lastIdx]]
    const uniq = Array.from(new Set(list)).filter((v) => typeof v === "number")
    return uniq.length > 3 ? [uniq[0], uniq[Math.floor(uniq.length / 2)], uniq[uniq.length - 1]] : uniq
  }, [normalizedDateList])

  const valueMapList = useMemo(() => {
    return normalizedSeries.map((s) => {
      const map = new Map<number, number | null>()
      s.data.forEach(([t, v]) => {
        if (!t) return
        map.set(t, v)
      })
      return map
    })
  }, [normalizedSeries])

  const paths = useMemo(() => {
    const { xMin, xMax } = xRange
    const span = xMax - xMin || 1

    return normalizedSeries.map((s) => {
      const ySpan = delayMax || 1

      const segments: string[] = []
      let current: { x: number; y: number }[] = []

      s.data.forEach(([t, v]) => {
        if (v === null || v === undefined || !Number.isFinite(Number(v))) {
          if (!connectNulls && current.length > 1) {
            segments.push(buildPath(current))
            current = []
          }
          return
        }
        const rawVal = Number(v)
        const val = s.yAxisIndex === 1 ? (rawVal / 100) * ySpan : rawVal
        const x = paddingLeft + clamp01((t - xMin) / span) * plotWidth
        const y = paddingTop + plotHeight - clamp01(Number(val) / ySpan) * plotHeight
        current.push({ x, y })
      })

      if (current.length > 1) {
        segments.push(buildPath(current))
      }

      return {
        id: s.id,
        color: s.color,
        dashed: s.dashed,
        opacity: s.opacity,
        d: segments.join(" "),
      }
    })
  }, [connectNulls, delayMax, normalizedSeries, paddingLeft, paddingTop, plotHeight, plotWidth, xRange])

  const crosshairX = useMemo(() => {
    if (!hovering || hoverIdx < 0 || hoverIdx >= normalizedDateList.length) return null
    const { xMin, xMax } = xRange
    const span = xMax - xMin || 1
    const t = normalizedDateList[hoverIdx]
    const x = paddingLeft + clamp01((t - xMin) / span) * plotWidth
    return x
  }, [hoverIdx, hovering, normalizedDateList, paddingLeft, plotWidth, xRange])

  const tooltipData = useMemo(() => {
    if (!hovering || hoverIdx < 0 || hoverIdx >= normalizedDateList.length) return null
    const t = normalizedDateList[hoverIdx]
    const span = xRange.xMax - xRange.xMin
    const label = formatTimeLabel(t, span)
    const rows = normalizedSeries.map((s, idx) => {
      const v = valueMapList[idx]?.get(t)
      const isLoss = s.yAxisIndex === 1 || String(s.name).includes("丢包")
      const unit = isLoss ? "%" : "ms"
      const value = typeof v === "number" && Number.isFinite(v) ? `${v.toFixed(2).replace(/\\.00$/, "")}${unit}` : "-"
      return { id: s.id, name: s.name, color: s.color, value }
    })
    return { time: t, label, rows }
  }, [hoverIdx, hovering, normalizedDateList, normalizedSeries, valueMapList, xRange.xMax, xRange.xMin])

  useEffect(() => {
    if (!hovering) setHoverIdx(-1)
  }, [hovering])

  function handleMouseMove(e: React.MouseEvent) {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = clamp01(x / Math.max(rect.width, 1))
    const { xMin, xMax } = xRange
    const t = xMin + ratio * (xMax - xMin)
    const idx = findNearestIndex(normalizedDateList, t)
    setHoverIdx(idx)
    setHoverX(x)
    setHovering(true)
  }

  function handleMouseLeave() {
    setHovering(false)
  }

  return (
    <div className="line-box" ref={containerRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <svg className="chart" viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none">
        <g className="chart-grid">
          {yTicks.map((tick) => {
            const y = paddingTop + plotHeight - clamp01(tick / delayMax) * plotHeight
            return <line key={`y_${tick}`} x1={paddingLeft} x2={paddingLeft + plotWidth} y1={y} y2={y} stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
          })}
          {timeTicks.map((tick) => {
            const { xMin, xMax } = xRange
            const span = xMax - xMin || 1
            const x = paddingLeft + clamp01((tick - xMin) / span) * plotWidth
            return <line key={`x_${tick}`} x1={x} x2={x} y1={paddingTop} y2={paddingTop + plotHeight} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          })}
        </g>

        <g className="chart-axis-labels">
          {yTicks.map((tick) => {
            const y = paddingTop + plotHeight - clamp01(tick / delayMax) * plotHeight
            const label = tick >= 100 ? `${Math.round(tick)}ms` : `${Number(tick.toFixed(1)).toString()}ms`
            return (
              <text key={`yl_${tick}`} x={paddingLeft - 6} y={y + 4} textAnchor="end" fontSize="11" fill="rgba(221,221,221,0.75)">
                {label}
              </text>
            )
          })}
          {hasLossSeries &&
            yTicks.map((tick) => {
              const y = paddingTop + plotHeight - clamp01(tick / delayMax) * plotHeight
              const p = clampPercent((tick / delayMax) * 100)
              const label = `${Math.round(p)}%`
              return (
                <text key={`yr_${tick}`} x={paddingLeft + plotWidth + 6} y={y + 4} textAnchor="start" fontSize="11" fill="rgba(221,221,221,0.65)">
                  {label}
                </text>
              )
            })}
          {timeTicks.map((tick) => {
            const { xMin, xMax } = xRange
            const span = xMax - xMin || 1
            const x = paddingLeft + clamp01((tick - xMin) / span) * plotWidth
            const label = formatTimeLabel(tick, span)
            return (
              <text key={`xt_${tick}`} x={x} y={viewHeight - 6} textAnchor="middle" fontSize="11" fill="rgba(221,221,221,0.70)">
                {label}
              </text>
            )
          })}
        </g>

        {paths.map((p) =>
          p.d ? (
            <path
              key={p.id}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={p.opacity ?? 1}
              strokeDasharray={p.dashed ? "6 6" : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ) : null,
        )}

        {crosshairX !== null ? (
          <line
            x1={crosshairX}
            x2={crosshairX}
            y1={paddingTop}
            y2={paddingTop + plotHeight}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={1}
          />
        ) : null}
      </svg>

      {tooltipData ? (
        <div
          className="chart-tooltip"
          style={{
            left: `${Math.max(10, Math.min(hoverX + 12, (containerRef.current?.clientWidth || 0) - 210))}px`,
            top: "10px",
          }}
        >
          <div className="chart-tooltip-time">{tooltipData.label}</div>
          <div className="chart-tooltip-rows">
            {tooltipData.rows.map((r) => (
              <div key={r.id} className="chart-tooltip-row">
                <span className="dot" style={{ background: r.color }} />
                <span className="name" title={r.name}>
                  {r.name}
                </span>
                <span className="value">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
