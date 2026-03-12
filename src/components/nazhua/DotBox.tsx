import { cn } from "@/lib/utils"
import type { CSSProperties, ReactNode } from "react"

export default function DotBox({
  children,
  className,
  padding = 20,
  borderRadius = 12,
  color = "#eee",
  style,
  onClick,
}: {
  children: ReactNode
  className?: string
  padding?: number | string
  borderRadius?: number | string
  color?: string
  style?: CSSProperties
  onClick?: () => void
}) {
  const mergedStyle: CSSProperties = {
    ...(style || {}),
    color,
  }
  if (borderRadius !== undefined) mergedStyle["--nazhua-border-radius" as never] = typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius
  if (padding !== undefined) mergedStyle.padding = typeof padding === "number" ? `${padding}px` : padding

  return (
    <div className={cn("nazhua-dot-box", className)} style={mergedStyle} onClick={onClick}>
      {children}
    </div>
  )
}

