import ServerDetailInfoBox from "@/components/ServerDetailInfoBox"
import ServerDetailMonitor from "@/components/ServerDetailMonitor"
import ServerDetailName from "@/components/ServerDetailName"
import ServerDetailStatusBox from "@/components/ServerDetailStatusBox"
import WorldMap from "@/components/WorldMap"
import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { countryCoordinates } from "@/lib/geo-limit"
import { serverIdToServerKey } from "@/lib/server-key"
import { cn, formatNezhaInfo } from "@/lib/utils"
import { NezhaWebsocketResponse } from "@/types/nezha-api"
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

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

export default function ServerDetail() {
  const navigate = useNavigate()
  const { lastMessage, connected } = useWebSocketContext()
  const [worldMapWidth, setWorldMapWidth] = useState<number>(() => (typeof window === "undefined" ? 900 : computeWorldMapWidth()))
  const worldMapHeight = useMemo(() => Math.ceil((621 / 1280) * (Number(worldMapWidth) || 0)), [worldMapWidth])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  }, [])

  useEffect(() => {
    const handleResize = () => setWorldMapWidth(computeWorldMapWidth())
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const { serverKey } = useParams()

  if (!serverKey) {
    navigate("/404")
    return null
  }

  const nezhaWsData = connected && lastMessage ? (JSON.parse(lastMessage.data) as NezhaWebsocketResponse) : null
  const server = nezhaWsData?.servers?.find((s) => serverIdToServerKey(s.id) === serverKey)
  const serverId = server?.id

  const locations = useMemo(() => {
    if (!server) return []
    let code = String(server.country_code || "").toUpperCase()
    if (!code || !countryCoordinates[code]) code = "CN"
    const coord = countryCoordinates[code]
    return [
      {
        key: code,
        count: 1,
        label: coord.name,
        servers: [{ id: server.id, name: server.name }],
        lng: coord.lng,
        lat: coord.lat,
      },
    ]
  }, [server])

  if (!serverId) {
    if (!connected || !lastMessage || !nezhaWsData) {
      return (
        <div className={cn("detail-container", "is-loading")}>
          <div className="world-map-box top-world-map">
            <div
              className="world-map-skeleton"
              style={{
                width: `${worldMapWidth}px`,
                height: `${worldMapHeight}px`,
              }}
            />
          </div>
          <div className="detail-skeleton-block detail-skeleton-block--name" />
          <div className="detail-skeleton-block detail-skeleton-block--status" />
          <div className="detail-skeleton-block detail-skeleton-block--info" />
          <div className="detail-skeleton-block detail-skeleton-block--monitor" />
        </div>
      )
    }
    navigate("/404")
    return null
  }

  const wsNow = nezhaWsData?.now ?? Date.now()
  const isOnline = server ? formatNezhaInfo(wsNow, server).online : true

  return (
    <div
      className={cn("detail-container", "server-info", {
        "server--offline": server && !isOnline,
      })}
    >
      <div className="world-map-box top-world-map">
        <WorldMap locations={locations} />
      </div>
      <ServerDetailName server={server} />
      <ServerDetailStatusBox now={wsNow} server={server} />
      <ServerDetailInfoBox now={wsNow} server={server} />
      <ServerDetailMonitor now={wsNow} serverId={serverId} />
    </div>
  )
}
