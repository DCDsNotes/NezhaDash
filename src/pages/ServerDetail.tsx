import ServerDetailInfoBox from "@/components/ServerDetailInfoBox"
import ServerDetailMonitor from "@/components/ServerDetailMonitor"
import ServerDetailName from "@/components/ServerDetailName"
import ServerDetailSpeed from "@/components/ServerDetailSpeed"
import ServerDetailStatusBox from "@/components/ServerDetailStatusBox"
import WorldMap from "@/components/WorldMap"
import { useNezhaWsData } from "@/hooks/use-nezha-ws-data"
import { useWorldMapSize } from "@/hooks/use-world-map-size"
import { countryCoordinates } from "@/lib/geo-limit"
import { serverIdToServerKey } from "@/lib/server-key"
import { getServerStatus } from "@/lib/server-view-model"
import { cn } from "@/lib/utils"
import { useEffect, useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"

export default function ServerDetail() {
  const navigate = useNavigate()
  const { data: nezhaWsData, lastMessage, connected } = useNezhaWsData()
  const { width: worldMapWidth, height: worldMapHeight } = useWorldMapSize()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  }, [])

  const { serverKey } = useParams()
  const activeWsData = connected ? nezhaWsData : null
  const server = serverKey ? activeWsData?.servers?.find((s) => serverIdToServerKey(s.id) === serverKey) : undefined
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

  if (!serverKey) {
    navigate("/404")
    return null
  }

  if (!serverId) {
    if (!connected || !lastMessage || !nezhaWsData) {
      return (
        <div className="server-detail-page">
          <div className="world-map-box top-world-map">
            <div
              className="world-map-skeleton"
              style={{
                width: `${worldMapWidth}px`,
                height: `${worldMapHeight}px`,
              }}
            />
          </div>
          <div className="server-detail-skeleton server-detail-skeleton--name" />
          <div className="server-detail-skeleton server-detail-skeleton--status" />
          <div className="server-detail-skeleton server-detail-skeleton--info" />
          <div className="server-detail-skeleton server-detail-skeleton--speed" />
          <div className="server-detail-skeleton server-detail-skeleton--monitor" />
        </div>
      )
    }
    navigate("/404")
    return null
  }

  const wsNow = nezhaWsData?.now ?? Date.now()
  const isOnline = server ? getServerStatus(wsNow, server) === "online" : true

  return (
    <div
      className={cn("server-detail-page", {
        "server-detail-page--offline": server && !isOnline,
      })}
    >
      <div className="world-map-box top-world-map">
        <WorldMap locations={locations} mapWidth={worldMapWidth} />
      </div>
      <ServerDetailName server={server} />
      <ServerDetailStatusBox now={wsNow} server={server} />
      <ServerDetailInfoBox now={wsNow} server={server} />
      <ServerDetailSpeed now={wsNow} server={server} />
      <ServerDetailMonitor now={wsNow} serverId={serverId} />
    </div>
  )
}
