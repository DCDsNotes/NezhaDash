import ServerFlag from "@/components/ServerFlag"
import { serverIdToServerKey } from "@/lib/server-key"
import { getServerCardViewModel, getServerSearchViewModel } from "@/lib/server-view-model"
import { cn } from "@/lib/utils"
import { type NezhaServer } from "@/types/nezha-api"
import { useMemo } from "react"
import { Link } from "react-router-dom"

export default function ServerNavigatorItem({ now, server, active }: { now: number; server: NezhaServer; active: boolean }) {
  const viewModel = useMemo(() => getServerCardViewModel(now, server), [now, server])
  const tags = useMemo(() => getServerSearchViewModel(server).tagList.slice(0, 2), [server])
  const serverKey = serverIdToServerKey(server.id)

  return (
    <Link
      to={`/server/${serverKey}`}
      className={cn("probe-node-item", {
        "probe-node-item--active": active,
        "probe-node-item--offline": !viewModel.info.online,
      })}
      aria-label={`查看 ${viewModel.info.name} 详情`}
      onClick={() => sessionStorage.setItem("fromMainPage", "true")}
    >
      <div className="probe-node-item__top">
        <div className="probe-node-item__identity">
          <span className={cn("probe-status-dot", { "probe-status-dot--offline": !viewModel.info.online })} />
          <ServerFlag country_code={viewModel.info.country_code} className="probe-node-item__flag" />
          <strong>{viewModel.info.name}</strong>
        </div>
        <span className={cn("probe-node-item__state", { "probe-node-item__state--offline": !viewModel.info.online })}>
          {viewModel.info.online ? "在线" : "离线"}
        </span>
      </div>

      <div className="probe-node-item__resources">
        {viewModel.rings.slice(0, 3).map((ring) => (
          <div key={ring.type}>
            <span>{ring.label}</span>
            <strong>{Math.round(Number(ring.used) * 10) / 10}%</strong>
          </div>
        ))}
      </div>

      <div className="probe-node-item__meta">
        <span title="在线时长">
          <i className="ri-time-line" aria-hidden="true" />
          {viewModel.realtime.duration.value}
          {viewModel.realtime.duration.unit}
        </span>
        <span title="实时入网">
          <i className="ri-arrow-down-line" aria-hidden="true" />
          {viewModel.realtime.inSpeed.value}
          {viewModel.realtime.inSpeed.unit}
        </span>
        <span title="实时出网">
          <i className="ri-arrow-up-line" aria-hidden="true" />
          {viewModel.realtime.outSpeed.value}
          {viewModel.realtime.outSpeed.unit}
        </span>
      </div>

      {tags.length > 0 || viewModel.billing.remainingTime ? (
        <div className="probe-node-item__footer">
          <div className="probe-node-item__tags">
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          {viewModel.billing.remainingDays ? (
            <span className="probe-node-item__billing">
              剩余 {viewModel.billing.remainingDays.num}
              {viewModel.billing.remainingDays.unit}
            </span>
          ) : null}
        </div>
      ) : null}
    </Link>
  )
}
