import worldMapSvgUrl from "@/assets/images/world-map.svg"
import { alias2code, count2size, findIntersectingGroups, locationCode2Info, type WorldMapPointBox } from "@/lib/nazhua/world-map"
import { cn, parsePublicNote } from "@/lib/utils"
import type { NezhaServer } from "@/types/nezha-api"
import { useEffect, useMemo, useRef, useState } from "react"

type Location = {
  key: string
  x: number
  y: number
  size: number
  label: string
  servers: NezhaServer[]
}

function computeSize(width?: number, height?: number, boxPadding = 0) {
  const baseW = 1280
  const baseH = 621
  const adjustedW = (width ?? baseW) - boxPadding * 2
  const adjustedH = (height ?? baseH) - boxPadding * 2

  if (width != null && height != null) return { width: baseW, height: baseH }
  if (width != null && height == null) return { width: adjustedW, height: Math.ceil((baseH / baseW) * adjustedW) }
  if (width == null && height != null) return { width: Math.ceil((baseW / baseH) * adjustedH), height: adjustedH }
  if (adjustedW / adjustedH > baseW / baseH) return { width: Math.ceil(adjustedH * (baseW / baseH)), height: adjustedH }
  return { width: adjustedW, height: Math.ceil(adjustedW * (baseH / baseW)) }
}

function buildPoints(locations: Location[], width: number, height: number, boxPadding: number) {
  if (!locations.length) return [] as WorldMapPointBox[]
  const points: WorldMapPointBox[] = locations.map((i) => {
    const left = (width / 1280) * i.x + boxPadding
    const top = (height / 621) * i.y + boxPadding
    const size = i.size || 4
    const item: WorldMapPointBox = {
      key: i.key,
      left,
      top,
      size,
      label: i.label,
      servers: i.servers,
      type: "single",
      topLeft: { left: 0, top: 0 },
      bottomRight: { left: 0, top: 0 },
    }
    const halfSize = (item.size + 8) / 2
    item.topLeft = { left: item.left - halfSize, top: item.top - halfSize }
    item.bottomRight = { left: item.left + halfSize, top: item.top + halfSize }
    return item
  })

  const groups = findIntersectingGroups(points)
  Object.entries(groups).forEach(([key, group]) => {
    const item = points.find((p) => p.key === key)
    if (!item || item.parent) return
    item.size = 4
    item.type = "group"
    item.children = group
    let label = item.label || ""
    let servers = [...(item.servers as NezhaServer[])]
    group.forEach((g) => {
      if (!g.parent && !g.children) {
        g.parent = item
        label += `\n${g.label}`
        servers = servers.concat(g.servers as NezhaServer[])
      }
    })
    item.label = label
    item.servers = servers
  })

  return points.filter((p) => !p.parent)
}

export function serversToLocations(servers: NezhaServer[], now: number) {
  const locationMap: Record<string, NezhaServer[]> = {}
  servers.forEach((s) => {
    const lastActiveTime = s.last_active.startsWith("000") ? 0 : new Date(s.last_active).getTime()
    const online = now - lastActiveTime <= 30000
    if (!online) return

    const note = parsePublicNote(s.public_note || "")
    const location = note?.customData?.location
    const aliasCode = (typeof location === "string" ? location : undefined) || s.country_code?.toUpperCase()
    const code = alias2code(aliasCode) || aliasCode
    if (!code) return
    if (!locationMap[code]) locationMap[code] = []
    locationMap[code].push(s)
  })

  const locations: Location[] = []
  Object.entries(locationMap).forEach(([code, list]) => {
    const info = locationCode2Info(code)
    if (!info?.x || !info?.y) return
    locations.push({
      key: code,
      x: info.x,
      y: info.y,
      size: count2size(list.length),
      label: `${info.name},${list.length}台`,
      servers: list,
    })
  })
  return locations
}

export default function WorldMap({
  width,
  height,
  locations,
  className,
}: {
  width?: number
  height?: number
  locations: Location[]
  className?: string
}) {
  const boxPadding = 0
  const computed = useMemo(() => computeSize(width, height, boxPadding), [width, height, boxPadding])
  const points = useMemo(() => buildPoints(locations, computed.width, computed.height, boxPadding), [locations, computed.width, computed.height, boxPadding])

  const [tipsShow, setTipsShow] = useState(false)
  const [tipsContent, setTipsContent] = useState("")
  const [activeTipsXY, setActiveTipsXY] = useState({ x: 0, y: 0 })
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  const tipsStyle = useMemo(() => {
    const style: Record<string, string> = {}
    if (window.innerWidth > 500) {
      style.top = `${activeTipsXY.y}px`
      style.left = `${activeTipsXY.x}px`
      style.transform = "translate(-50%, 20px)"
    } else {
      style.bottom = "4px"
      style.left = "50%"
      style.transform = "translate(-50%, 0)"
    }
    return style
  }, [activeTipsXY])

  const onPointTap = (p: WorldMapPointBox) => {
    setTipsContent(p.label)
    setActiveTipsXY({ x: p.left, y: p.top - 10 })
    setTipsShow(true)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setTipsShow(false), 5000)
  }

  return (
    <div
      className={cn("nazhua-world-map-group", className)}
      style={
        {
          ["--world-map-width" as never]: `${computed.width}px`,
          ["--world-map-height" as never]: `${computed.height}px`,
        } as React.CSSProperties
      }
    >
      <div className="nazhua-world-map-img" style={{ backgroundImage: `url(${worldMapSvgUrl})` }} />
      <div className="nazhua-world-map-point-container">
        {points.map((p) => (
          <button
            key={p.key}
            type="button"
            className={cn("nazhua-world-map-point", `nazhua-world-map-point--${p.type}`)}
            style={
              {
                ["--map-point-left" as never]: `${p.left}px`,
                ["--map-point-top" as never]: `${p.top}px`,
                ["--map-point-size" as never]: `${p.size}px`,
              } as React.CSSProperties
            }
            onClick={() => onPointTap(p)}
            aria-label={p.label}
          />
        ))}
      </div>

      {tipsShow ? (
        <div className="nazhua-world-map-tips" style={tipsStyle}>
          <span>{tipsContent}</span>
        </div>
      ) : null}
    </div>
  )
}
