import { cn } from "@/lib/utils"
import React from "react"

type PointInfo = {
  key?: string
  left: number
  top: number
  size?: number
  label?: string
  type?: "single" | "group" | "default"
}

function hashToDelay(key: string | undefined) {
  const s = String(key || "")
  if (!s) return "0s"
  let hash = 0
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  }
  const ms = hash % 900
  return `${ms / 1000}s`
}

export default function WorldMapPoint({ info, onTap, className }: { info: PointInfo; onTap?: (info: PointInfo) => void; className?: string }) {
  return (
    <button
      type="button"
      className={cn("world-map-point", info.type ? `world-map-point--${info.type}` : "world-map-point--default", className)}
      style={
        {
          "--map-point-left": `${info.left}px`,
          "--map-point-top": `${info.top}px`,
          "--map-point-size": info.size ? `${info.size}px` : undefined,
          "--map-point-delay": hashToDelay(info.key),
        } as React.CSSProperties
      }
      title={info.label || ""}
      aria-label={info.label || "服务器位置"}
      onClick={(event) => {
        event.stopPropagation()
        onTap?.(info)
      }}
    >
      <span className="point-block" />
    </button>
  )
}
