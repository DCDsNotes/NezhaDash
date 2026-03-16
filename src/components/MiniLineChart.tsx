import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

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

function buildAreaPath(points: { x: number; y: number }[], baseY: number) {
  if (points.length === 0) return ""
  const first = points[0]
  const last = points[points.length - 1]
  const line = buildPath(points)
  return `${line} L ${last.x.toFixed(2)} ${baseY.toFixed(2)} L ${first.x.toFixed(2)} ${baseY.toFixed(2)} Z`
}

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}

function clamp(n: number, min: number, max: number) {
  const v = Number(n)
  if (!Number.isFinite(v)) return min
  if (v < min) return min
  if (v > max) return max
  return v
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
  if (normalized <= 2.5) return 2.5 * magnitude
  if (normalized <= 5) return 5 * magnitude
  return 10 * magnitude
}

function buildTicks(max: number, targetLines = 5) {
  const m = Number(max)
  if (!Number.isFinite(m) || m <= 0) return [0, 1]
  const lines = clampInt(targetLines, 2, 10)
  const rawStep = m / (lines - 1)
  const step = Math.max(1, niceStep(rawStep))
  const ticks: number[] = []
  for (let i = 0; i < lines; i += 1) ticks.push(i * step)
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

function formatTooltipTime(ms: number) {
  const d = new Date(ms)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
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
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState<number>(0)
  const [containerHeight, setContainerHeight] = useState<number>(0)
  const [hoverIdx, setHoverIdx] = useState<number>(-1)
  const [hoverX, setHoverX] = useState<number>(0)
  const [hovering, setHovering] = useState(false)
  const [pointerDown, setPointerDown] = useState(false)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const [tooltipSize, setTooltipSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 })

  const viewWidth = Math.max(1, containerWidth || 1000)
  const viewHeight = Math.max(1, containerHeight || 300)

  const paddingLeft = viewWidth < 520 ? 66 : 74
  const paddingRight = viewWidth < 520 ? 42 : 48
  const paddingTop = 10
  const paddingBottom = 30
  const plotWidth = Math.max(1, viewWidth - paddingLeft - paddingRight)
  const plotHeight = Math.max(1, viewHeight - paddingTop - paddingBottom)

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

  const yTicks = useMemo(() => buildTicks(delayMax, 7), [delayMax])
  const yMax = useMemo(() => Math.max(1, yTicks[yTicks.length - 1] ?? 1), [yTicks])
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

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    setContainerWidth(el.clientWidth || 0)
    setContainerHeight(el.clientHeight || 0)
    const ro = new ResizeObserver((entries) => {
      const w = entries?.[0]?.contentRect?.width
      if (typeof w === "number" && Number.isFinite(w)) setContainerWidth(w)
      const h = entries?.[0]?.contentRect?.height
      if (typeof h === "number" && Number.isFinite(h)) setContainerHeight(h)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const timeTicks = useMemo(() => {
    if (normalizedDateList.length < 2) return [] as number[]
    const isMobile = viewWidth < 520
    const maxTicks = isMobile ? 4 : clampInt(Math.floor((containerWidth || 1000) / 95), 6, 12)
    const { xMin, xMax } = xRange
    const span = xMax - xMin || 1
    const ticks: number[] = []
    for (let i = 0; i < maxTicks; i += 1) ticks.push(xMin + (i * span) / (maxTicks - 1))
    return ticks
  }, [containerWidth, normalizedDateList.length, viewWidth, xRange])

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
    const baseY = paddingTop + plotHeight

    return normalizedSeries.map((s) => {
      const ySpan = yMax || 1
      const isLoss = s.yAxisIndex === 1

      const segments: { strokeD: string; fillD?: string }[] = []
      let current: { x: number; y: number }[] = []

      function pushSegment(points: { x: number; y: number }[]) {
        const strokeD = buildPath(points)
        if (!strokeD) return
        const fillD = isLoss ? buildAreaPath(points, baseY) : undefined
        segments.push({ strokeD, fillD })
      }

      s.data.forEach(([t, v]) => {
        if (v === null || v === undefined || !Number.isFinite(Number(v))) {
          if (!connectNulls && current.length > 1) {
            pushSegment(current)
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
        pushSegment(current)
      }

      return {
        id: s.id,
        color: s.color,
        dashed: s.dashed,
        opacity: s.opacity,
        isLoss,
        segments,
      }
    })
  }, [connectNulls, normalizedSeries, paddingLeft, paddingTop, plotHeight, plotWidth, xRange, yMax])

  const crosshairX = useMemo(() => {
    if (!hovering) return null
    return clamp(hoverX, paddingLeft, paddingLeft + plotWidth)
  }, [hoverX, hovering, paddingLeft, plotWidth])

  const tooltipData = useMemo(() => {
    if (!hovering || hoverIdx < 0 || hoverIdx >= normalizedDateList.length) return null
    const t = normalizedDateList[hoverIdx]
    const span = xRange.xMax - xRange.xMin
    const label = formatTooltipTime(t)

    type Row = { key: string; name: string; color: string; delay: string; loss: string }
    const map = new Map<string, { name: string; color: string; delay?: number | null; loss?: number | null }>()

    normalizedSeries.forEach((s, idx) => {
      const v = valueMapList[idx]?.get(t)
      const isLoss = s.yAxisIndex === 1 || String(s.name).includes("丢包") || s.id.endsWith("-loss")
      const base = String(s.name || "").replace(/\s*丢包\s*$/, "").trim() || s.id.replace(/-(delay|loss)$/, "")
      const existing = map.get(base) || { name: base, color: s.color }
      if (isLoss) existing.loss = typeof v === "number" && Number.isFinite(v) ? v : null
      else existing.delay = typeof v === "number" && Number.isFinite(v) ? v : null
      map.set(base, existing)
    })

    const rows: Row[] = Array.from(map.entries()).map(([key, v]) => {
      const delayText = typeof v.delay === "number" ? `${v.delay.toFixed(2).replace(/\\.00$/, "")}ms` : "-"
      const lossText = typeof v.loss === "number" ? `${v.loss.toFixed(2).replace(/\\.00$/, "")}%` : "-"
      return { key, name: v.name, color: v.color, delay: delayText, loss: lossText }
    })

    return { time: t, label, rows, span }
  }, [hoverIdx, hovering, normalizedDateList, normalizedSeries, valueMapList, xRange.xMax, xRange.xMin])

  useEffect(() => {
    if (!tooltipData) return
    const id = requestAnimationFrame(() => {
      const el = tooltipRef.current
      if (!el) return
      const w = el.offsetWidth || 0
      const h = el.offsetHeight || 0
      setTooltipSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
    })
    return () => cancelAnimationFrame(id)
  }, [hoverX, tooltipData])

  const tooltipStyle = useMemo(() => {
    if (!tooltipData) return null
    const cw = containerRef.current?.clientWidth || containerWidth || 0
    const ch = containerRef.current?.clientHeight || containerHeight || 0
    const w = tooltipSize.w || 210
    const h = tooltipSize.h || 0

    const maxLeft = Math.max(10, cw - w - 10)
    let left = hoverX + 12
    if (left + w > cw - 10) left = hoverX - w - 12
    left = Math.max(10, Math.min(left, maxLeft))

    let top = 10
    if (ch && h && top + h > ch - 10) top = Math.max(10, ch - h - 10)

    return { left: `${left}px`, top: `${top}px` }
  }, [containerHeight, containerWidth, hoverX, tooltipData, tooltipSize.h, tooltipSize.w])

  useEffect(() => {
    if (!hovering) setHoverIdx(-1)
  }, [hovering])

  function updateHover(clientX: number) {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = clamp(clientX - rect.left, 0, rect.width || 1)
    const xInPlot = clamp(x, paddingLeft, paddingLeft + plotWidth)
    const ratio = clamp01((xInPlot - paddingLeft) / Math.max(plotWidth, 1))
    const { xMin, xMax } = xRange
    const t = xMin + ratio * (xMax - xMin)
    const idx = findNearestIndex(normalizedDateList, t)
    setHoverIdx(idx)
    setHoverX(x)
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") e.preventDefault()
    setPointerDown(true)
    setHovering(true)
    updateHover(e.clientX)
    const el = containerRef.current
    if (!el) return
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse") {
      setHovering(true)
      updateHover(e.clientX)
      return
    }
    if (!pointerDown) return
    e.preventDefault()
    updateHover(e.clientX)
  }

  function handlePointerLeave(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return
    if (pointerDown) return
    setHovering(false)
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse") return
    try {
      containerRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    setPointerDown(false)
    setHovering(false)
  }

  function handlePointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse") return
    try {
      containerRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
    setPointerDown(false)
    setHovering(false)
  }

  return (
    <div
      className="line-box"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <svg className="chart" viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none">
        <g className="chart-grid">
          {yTicks.map((tick) => {
            const y = paddingTop + plotHeight - clamp01(tick / yMax) * plotHeight
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
            const y = paddingTop + plotHeight - clamp01(tick / yMax) * plotHeight
            const label = `${Math.round(tick)}ms`
            return (
              <text
                key={`yl_${tick}`}
                x={paddingLeft - 6}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fontWeight="700"
                fill="rgba(221,221,221,0.75)"
              >
                {label}
              </text>
            )
          })}
          {hasLossSeries &&
            yTicks.map((tick) => {
              const y = paddingTop + plotHeight - clamp01(tick / yMax) * plotHeight
              const p = clampPercent((tick / yMax) * 100)
              const label = `${Math.round(p)}%`
              return (
                <text
                  key={`yr_${tick}`}
                  x={paddingLeft + plotWidth + 6}
                  y={y + 4}
                  textAnchor="start"
                  fontSize="12"
                  fontWeight="700"
                  fill="rgba(221,221,221,0.65)"
                >
                  {label}
                </text>
              )
            })}
          {timeTicks.map((tick) => {
            const { xMin, xMax } = xRange
            const span = xMax - xMin || 1
            const x = paddingLeft + clamp01((tick - xMin) / span) * plotWidth
            const label = formatTimeLabel(tick, span)
            const isFirst = tick === timeTicks[0]
            const isLast = tick === timeTicks[timeTicks.length - 1]
            return (
              <text
                key={`xt_${tick}`}
                x={x}
                y={viewHeight - 6}
                textAnchor={isFirst ? "start" : isLast ? "end" : "middle"}
                fontSize="12"
                fontWeight="700"
                fill="rgba(221,221,221,0.70)"
              >
                {label}
              </text>
            )
          })}
        </g>

        {paths.map((p) => (
          <g key={p.id}>
            {p.segments.map((seg, index) => (
              <g key={`${p.id}_${index}`}>
                {p.isLoss && seg.fillD ? (
                  <path
                    d={seg.fillD}
                    fill={p.color}
                    opacity={(p.opacity ?? 1) * 0.5}
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null}
                {seg.strokeD ? (
                  <path
                    d={seg.strokeD}
                    fill="none"
                    stroke={p.color}
                    strokeWidth={p.isLoss ? 1.2 : 1.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={p.opacity ?? 1}
                    strokeDasharray={!p.isLoss && p.dashed ? "6 6" : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null}
              </g>
            ))}
          </g>
        ))}

        {crosshairX !== null ? (
          <line
            x1={crosshairX}
            x2={crosshairX}
            y1={paddingTop}
            y2={paddingTop + plotHeight}
            stroke="rgba(255,255,255,0.65)"
            strokeWidth={1.5}
          />
        ) : null}
      </svg>

      {tooltipData ? (
        <div
          ref={tooltipRef}
          className="chart-tooltip"
          style={tooltipStyle || undefined}
        >
          <div className="chart-tooltip-time">{tooltipData.label}</div>
          <div className="chart-tooltip-rows">
            {tooltipData.rows.map((r) => (
              <div key={r.key} className="chart-tooltip-row">
                <span className="dot" style={{ background: r.color }} />
                <span className="name" title={r.name}>
                  {r.name}
                </span>
                <span className="value">{`延时 ${r.delay} 丢包 ${r.loss}`}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
