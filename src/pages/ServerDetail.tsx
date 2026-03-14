import { NetworkChart } from "@/components/NetworkChart"
import ServerDetailChart from "@/components/ServerDetailChart"
import ServerDetailOverview from "@/components/ServerDetailOverview"
import TabSwitch from "@/components/TabSwitch"
import WorldMap from "@/components/WorldMap"
import { Separator } from "@/components/ui/separator"
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

  const tabs = ["Detail", "Network"]
  const [currentTab, setCurrentTab] = useState(tabs[0])

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
    const code = String(server.country_code || "").toUpperCase()
    const coord = code ? countryCoordinates[code] : null
    if (!coord) return []
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
      <ServerDetailOverview server_id={String(serverId)} />
      <section className="flex items-center my-2 w-full">
        <Separator className="flex-1" />
        <div className="flex justify-center w-full max-w-[200px]">
          <TabSwitch tabs={tabs} currentTab={currentTab} setCurrentTab={setCurrentTab} />
        </div>
        <Separator className="flex-1" />
      </section>
      <div style={{ display: currentTab === tabs[0] ? "block" : "none" }}>
        <ServerDetailChart server_id={String(serverId)} />
      </div>
      <div style={{ display: currentTab === tabs[1] ? "block" : "none" }}>
        <NetworkChart server_id={serverId} show={currentTab === tabs[1]} />
      </div>
    </div>
  )
}
