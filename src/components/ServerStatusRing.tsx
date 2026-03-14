import { useMemo, type CSSProperties } from "react"

type Colors =
  | string
  | {
      used?: string | string[]
      total?: string
    }

function clampPercent(n: number) {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 100) return 100
  return n
}

function formatPercent(n: number) {
  const v = Math.round(n * 10) / 10
  return `${v}%`
}

export function ServerStatusRing({
  type = "",
  used = 0,
  colors = {},
  valText = "",
  valPercent = "",
  label = "",
}: {
  type?: string
  used?: number | string
  colors?: Colors
  valText?: string
  valPercent?: string
  label?: string
}) {
  const usedPercent = useMemo(() => clampPercent(Number(used)), [used])
  const displayPercent = useMemo(() => valPercent || formatPercent(usedPercent), [valPercent, usedPercent])

  const displayValText = useMemo(() => {
    if (!valText) return ""
    if (valText === displayPercent) return ""
    return valText
  }, [valText, displayPercent])

  const tooltip = useMemo(() => {
    if (!label) return ""
    const v = Math.round(usedPercent * 10) / 10
    return `${label}使用${v}%`
  }, [label, usedPercent])

  const ringStyle = useMemo(() => {
    const style: Record<string, string> = {
      "--ring-used": `${usedPercent}%`,
    }

    const usedColor = typeof colors === "string" ? colors : colors?.used
    const trackColor = typeof colors === "object" && colors ? colors.total : undefined

    if (Array.isArray(usedColor)) {
      const [ringColor] = usedColor
      if (ringColor) style["--ring-color"] = ringColor
    } else if (usedColor) {
      style["--ring-color"] = usedColor
    }
    style["--ring-track"] = trackColor || "rgba(255, 255, 255, 0.18)"
    return style as CSSProperties
  }, [colors, usedPercent])

  return (
    <div className={`server-status-ring server-status--${type}`} style={ringStyle} title={tooltip}>
      <div className="ring">
        <div className="ring-center">
          <div className="ring-percent">{displayPercent}</div>
          {displayValText ? <div className="ring-val">{displayValText}</div> : null}
        </div>
      </div>
      {label ? <div className="ring-label">{label}</div> : null}
    </div>
  )
}
