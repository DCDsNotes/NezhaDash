import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.min(100, Math.max(0, n))
}

export function Donut({
  used,
  size = 100,
  strokeWidth = 10,
  colors,
  trackColor = "rgba(255, 255, 255, 0.25)",
  children,
  className,
}: {
  used: number
  size?: number
  strokeWidth?: number
  colors: string | [string, string]
  trackColor?: string
  children?: ReactNode
  className?: string
}) {
  const pct = clamp01(used)
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  const gap = c - dash

  const gradId = `nazhua-donut-grad-${Math.random().toString(36).slice(2)}`
  const hasGrad = Array.isArray(colors)

  return (
    <div className={cn("nazhua-donut-box", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="nazhua-donut-svg" aria-hidden="true">
        {hasGrad && (
          <defs>
            <linearGradient id={gradId} x1="1" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor={colors[0]} />
              <stop offset="1" stopColor={colors[1]} />
            </linearGradient>
          </defs>
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={hasGrad ? `url(#${gradId})` : (colors as string)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children ? <div className="nazhua-donut-content">{children}</div> : null}
    </div>
  )
}

