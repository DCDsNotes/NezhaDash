import DotBox from "@/components/nazhua/DotBox"
import ServerInfoBox from "@/components/nazhua/ServerInfoBox"
import ServerRealTime from "@/components/nazhua/ServerRealTime"
import ServerStatusDonut from "@/components/nazhua/ServerStatusDonut"
import WorldMap from "@/components/nazhua/WorldMap"
import ServerFlag from "@/components/ServerFlag"
import { useWebSocketContext } from "@/hooks/use-websocket-context"
import { getNazhuaStatusList, formatNazhuaCpuMemDiskSummary } from "@/lib/nazhua/server-status"
import { alias2code, locationCode2Info } from "@/lib/nazhua/world-map"
import { resolveServerIdFromRouteParam, serverPath } from "@/lib/routes"
import { cn, parsePublicNote } from "@/lib/utils"
import type { NezhaWebsocketResponse } from "@/types/nezha-api"
import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

export default function ServerDetail() {
  const navigate = useNavigate()
  const { id: idParam } = useParams()
  const { lastMessage, connected } = useWebSocketContext()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  }, [])

  if (!idParam) {
    navigate("/404")
    return null
  }

  if (!connected && !lastMessage) return null
  const nezhaWsData = lastMessage ? (JSON.parse(lastMessage.data) as NezhaWebsocketResponse) : null
  if (!nezhaWsData) return null

  const resolvedId = resolveServerIdFromRouteParam(idParam, nezhaWsData.servers || [])
  const server = resolvedId != null ? nezhaWsData.servers.find((s) => s.id === resolvedId) : undefined

  useEffect(() => {
    if (/^\\d+$/.test(idParam) && resolvedId != null) {
      navigate(serverPath(resolvedId), { replace: true })
    }
  }, [idParam, resolvedId, navigate])

  useEffect(() => {
    if (nezhaWsData && resolvedId == null) navigate("/")
  }, [nezhaWsData, resolvedId, navigate])

  if (!server) return null

  const note = parsePublicNote(server.public_note || "")
  const slogan = typeof note?.customData?.slogan === "string" ? note.customData.slogan : undefined
  const aliasCode =
    (typeof note?.customData?.location === "string" ? note.customData.location : undefined) || server.country_code?.toUpperCase()
  const code = alias2code(aliasCode) || aliasCode
  const locInfo = locationCode2Info(code)

  const locations = useMemo(() => {
    if (!locInfo || !code) return []
    return [
      {
        key: code,
        x: locInfo.x,
        y: locInfo.y,
        size: 4,
        label: `${locInfo.name}`,
        servers: [server],
      },
    ]
  }, [server, locInfo, code])

  const containerRef = useRef<HTMLDivElement>(null)
  const [worldMapWidth, setWorldMapWidth] = useState(900)
  useEffect(() => {
    const handle = () => {
      const w = Math.max(Math.min((containerRef.current?.offsetWidth || window.innerWidth) - 40, window.innerWidth - 40, 900), 300)
      setWorldMapWidth(w)
    }
    handle()
    window.addEventListener("resize", handle)
    return () => window.removeEventListener("resize", handle)
  }, [server.id])

  const cpuMemDisk = formatNazhuaCpuMemDiskSummary(server)
  const statusList = getNazhuaStatusList({ server, tpl: ["cpu", "mem", "swap", "disk"], withContent: true })

  return (
    <div ref={containerRef} className="nazhua-detail-container">
      {locations.length ? (
        <div className="nazhua-world-map-box">
          <WorldMap width={worldMapWidth} locations={locations} />
        </div>
      ) : null}

      <DotBox className="nazhua-server-head" padding={16}>
        <div className="nazhua-server-flag-box">
          <ServerFlag country_code={server.country_code} className="nazhua-server-flag-big" />
        </div>
        <div className="nazhua-server-name-and-slogan">
          <div className="nazhua-server-name-group">
            <span className="nazhua-server-name">{server.name}</span>
            {cpuMemDisk ? <span className="nazhua-core-mem">{cpuMemDisk}</span> : null}
          </div>
          {slogan ? <div className="nazhua-slogan-content">“{slogan}”</div> : null}
        </div>
      </DotBox>

      <DotBox padding={15} className={cn("nazhua-server-status-and-real-time")}>
        <div className="nazhua-server-status-group">
          {statusList.map((item) => (
            <ServerStatusDonut key={item.type} item={item} size={120} showContent={true} />
          ))}
        </div>
        <ServerRealTime server={server} />
      </DotBox>

      <ServerInfoBox server={server} />
    </div>
  )
}
