import React from "react"

import { cn } from "@/lib/utils"

type PointInfo = {
  left: number
  top: number
  size?: number
  label?: string
  type?: "single" | "group" | "default"
}

export default function WorldMapPoint({
  info,
  onTap,
  className,
}: {
  info: PointInfo
  onTap?: (info: PointInfo) => void
  className?: string
}) {
  return (
    <div
      className={cn("world-map-point", info.type ? `world-map-point--${info.type}` : "world-map-point--default", className)}
      style={
        {
          "--map-point-left": `${info.left}px`,
          "--map-point-top": `${info.top}px`,
          "--map-point-size": info.size ? `${info.size}px` : undefined,
        } as React.CSSProperties
      }
      title={info.label || ""}
      onClick={() => onTap?.(info)}
    >
      <div className="point-block" />
    </div>
  )
}

