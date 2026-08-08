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
import { getServerDetailStatusViewModel, getServerStatus } from "@/lib/server-view-model"
import { cn } from "@/lib/utils"
import "@/styles/detail.css"
import "@/styles/monitor.css"
import { type NezhaServer } from "@/types/nezha-api"
import { useEffect, useMemo } from "react"
import { Link, Navigate, useParams } from "react-router-dom"

function ServerDetailPriority({ now, server }: { now: number; server: NezhaServer }) {
  const { billing, realtime } = useMemo(() => getServerDetailStatusViewModel(now, server), [now, server])
  const expiry = billing.remainingTime ? billing.endDateText || "长期有效" : "未设置"

  return (
    <section className="probe-detail-priority" aria-label="实时网络与到期信息">
      <div className="probe-detail-priority__speed probe-detail-priority__speed--down">
        <span>
          <i className="ri-arrow-down-line" aria-hidden="true" /> 当前下行
        </span>
        <strong>
          {realtime.inSpeed.value}
          <small>{realtime.inSpeed.unit}/s</small>
        </strong>
      </div>
      <div className="probe-detail-priority__speed probe-detail-priority__speed--up">
        <span>
          <i className="ri-arrow-up-line" aria-hidden="true" /> 当前上行
        </span>
        <strong>
          {realtime.outSpeed.value}
          <small>{realtime.outSpeed.unit}/s</small>
        </strong>
      </div>
      <div className="probe-detail-priority__billing">
        <span>到期时间</span>
        <strong>{expiry}</strong>
      </div>
      <div
        className={cn("probe-detail-priority__remaining", { "probe-detail-priority__remaining--expired": billing.remainingTime?.type === "expired" })}
      >
        <span>剩余天数</span>
        <strong>{billing.remainingTime?.value || "未配置"}</strong>
      </div>
    </section>
  )
}

export default function ServerDetail() {
  const { data: nezhaWsData, connected } = useNezhaWsData()
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
    return <Navigate to="/404" replace />
  }

  if (!serverId) {
    if (!connected || !nezhaWsData) {
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
    return <Navigate to="/404" replace />
  }

  const wsNow = nezhaWsData?.now ?? Date.now()
  const isOnline = server ? getServerStatus(wsNow, server) === "online" : true

  return (
    <div
      className={cn("server-detail-page", {
        "server-detail-page--offline": server && !isOnline,
      })}
    >
      <div className="server-detail-page__topbar">
        <Link to="/" className="server-detail-page__back">
          <i className="ri-arrow-left-line" aria-hidden="true" />
          <span>返回服务器列表</span>
        </Link>
        <span className="probe-detail-heading">节点详情</span>
        <span className={cn("server-detail-page__state", { "server-detail-page__state--offline": !isOnline })}>
          <i className="ri-checkbox-blank-circle-fill" aria-hidden="true" />
          {isOnline ? "正在运行" : "暂时离线"}
        </span>
      </div>
      <div className="world-map-box top-world-map">
        <WorldMap locations={locations} mapWidth={worldMapWidth} />
      </div>
      <ServerDetailName server={server} />
      <ServerDetailPriority now={wsNow} server={server} />
      <ServerDetailStatusBox now={wsNow} server={server} />
      <ServerDetailInfoBox now={wsNow} server={server} />
      <ServerDetailSpeed now={wsNow} server={server} />
      <ServerDetailMonitor now={wsNow} serverId={serverId} />
    </div>
  )
}
