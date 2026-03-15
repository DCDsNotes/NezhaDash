import { useMemo } from "react"

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

export default function MiniLineChart({
  seriesList,
  connectNulls = false,
}: {
  seriesList: LineChartSeries[]
  connectNulls?: boolean
}) {
  const viewWidth = 1000
  const viewHeight = 300

  const normalizedSeries = useMemo(() => {
    return seriesList.map((s) => ({
      ...s,
      data: s.data.map((d) => [normalizeTimestampMs(d[0]), d[1]] as const),
    }))
  }, [seriesList])

  const xRange = useMemo(() => {
    let xMin = Number.POSITIVE_INFINITY
    let xMax = Number.NEGATIVE_INFINITY
    normalizedSeries.forEach((s) => {
      s.data.forEach(([t]) => {
        if (!Number.isFinite(t)) return
        if (t < xMin) xMin = t
        if (t > xMax) xMax = t
      })
    })
    if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMax <= xMin) {
      return { xMin: 0, xMax: 1 }
    }
    return { xMin, xMax }
  }, [normalizedSeries])

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

  const paths = useMemo(() => {
    const { xMin, xMax } = xRange
    const span = xMax - xMin || 1

    return normalizedSeries.map((s) => {
      const yMax = s.yAxisIndex === 1 ? 100 : delayMax
      const ySpan = yMax || 1

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
        const x = clamp01((t - xMin) / span) * viewWidth
        const y = viewHeight - clamp01(Number(v) / ySpan) * viewHeight
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
  }, [connectNulls, delayMax, normalizedSeries, xRange])

  return (
    <div className="line-box">
      <svg className="chart" viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="none">
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
      </svg>
    </div>
  )
}
