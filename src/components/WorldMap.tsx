import React, { useEffect, useMemo, useRef, useState } from "react"

import { countryCoordinates } from "@/lib/geo-limit"
import { cn } from "@/lib/utils"
import { count2size, findIntersectingGroups, lonLatToMapXY } from "@/lib/world-map"

import WorldMapPoint from "./WorldMapPoint"

type LocationInput = {
  key: string
  count: number
  label: string
  servers: { id: number; name: string }[]
  lng: number
  lat: number
}

function computeDetailContainerWidth() {
  const w = window.innerWidth
  if (w <= 720) return w
  if (w <= 800) return 720
  if (w <= 1024) return 800
  return 900
}

function computeWorldMapWidth() {
  return Math.max(computeDetailContainerWidth() - 40, 300)
}

export default function WorldMap({
  locations,
  className,
}: {
  locations: LocationInput[]
  className?: string
}) {
  const [mapWidth, setMapWidth] = useState<number>(() => (typeof window === "undefined" ? 900 : computeWorldMapWidth()))

  useEffect(() => {
    const handleResize = () => setMapWidth(computeWorldMapWidth())
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const mapHeight = useMemo(() => Math.ceil((621 / 1280) * (Number(mapWidth) || 0)), [mapWidth])

  const points = useMemo(() => {
    const boxPadding = 0
    if (!Array.isArray(locations) || locations.length === 0) return []

    const pts = locations.map((loc) => {
      const { x, y } = lonLatToMapXY(loc.lng, loc.lat)
      const left = (mapWidth / 1280) * x + boxPadding
      const top = (mapHeight / 621) * y + boxPadding
      const size = count2size(loc.count)
      const item: any = {
        key: loc.key,
        left,
        top,
        size,
        label: loc.label,
        servers: loc.servers,
        type: "single",
      }
      const halfSize = (item.size + 8) / 2
      item.topLeft = { left: item.left - halfSize, top: item.top - halfSize }
      item.bottomRight = { left: item.left + halfSize, top: item.top + halfSize }
      return item
    })

    const groups = findIntersectingGroups(pts)
    Object.entries(groups).forEach(([key, group]) => {
      const item = pts.find((i) => i.key === key)
      if (!item || item.parent) return
      item.size = 4
      item.type = "group"
      item.children = group
      let label = item.label || ""
      let servers = [...(item.servers || [])]
      group.forEach((g: any) => {
        if (!g.parent && !g.children) {
          g.parent = item
          label += `\n${g.label}`
          servers = servers.concat(g.servers || [])
        }
      })
      item.label = label
      item.servers = servers
    })

    return pts.filter((i) => !i.parent)
  }, [locations, mapWidth, mapHeight])

  const [tipsShow, setTipsShow] = useState(false)
  const [tipsContent, setTipsContent] = useState("")
  const [activeXY, setActiveXY] = useState({ x: 0, y: 0 })
  const tipsTimer = useRef<number | null>(null)

  function handleTap(info: any) {
    setTipsContent(info.label || "")
    setActiveXY({ x: info.left, y: info.top - 10 })
    setTipsShow(true)
    if (tipsTimer.current) {
      window.clearTimeout(tipsTimer.current)
    }
    tipsTimer.current = window.setTimeout(() => setTipsShow(false), 5000)
  }

  useEffect(
    () => () => {
      if (tipsTimer.current) window.clearTimeout(tipsTimer.current)
    },
    [],
  )

  const tipsStyle = useMemo(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 500) {
      return { bottom: "4px", left: "50%", transform: "translate(-50%, 0)" }
    }
    return { top: `${activeXY.y}px`, left: `${activeXY.x}px`, transform: "translate(-50%, 20px)" }
  }, [activeXY])

  return (
    <div
      className={cn("world-map-group", className)}
      style={
        {
          "--world-map-width": `${mapWidth}px`,
          "--world-map-height": `${mapHeight}px`,
        } as React.CSSProperties
      }
    >
      <div className="world-map-img" />
      <div className="world-map-point-container">
        {points.map((p) => (
          <WorldMapPoint key={p.key} info={p} onTap={handleTap} />
        ))}
      </div>
      {tipsShow && (
        <div className="world-map-tips" style={tipsStyle as React.CSSProperties}>
          <span>{tipsContent}</span>
        </div>
      )}
    </div>
  )
}

export function buildLocationsFromServers(servers: { id: number; name: string; country_code?: string; online?: boolean | number }[]) {
  const map = new Map<string, { count: number; servers: { id: number; name: string }[] }>()
  servers.forEach((s) => {
    const isOnline = s.online === true || s.online === 1
    if (!isOnline) return
    const code = (s.country_code || "").toUpperCase()
    if (!code) return
    if (!countryCoordinates[code]) return
    const prev = map.get(code) || { count: 0, servers: [] }
    prev.count += 1
    prev.servers.push({ id: s.id, name: s.name })
    map.set(code, prev)
  })

  const locations: LocationInput[] = []
  map.forEach((v, code) => {
    const coord = countryCoordinates[code]
    locations.push({
      key: code,
      count: v.count,
      servers: v.servers,
      lng: coord.lng,
      lat: coord.lat,
      label: `${coord.name},${v.count}台`,
    })
  })
  return locations
}

