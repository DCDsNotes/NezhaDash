import ServerFlag from "@/components/ServerFlag"
import { serverIdToServerKey } from "@/lib/server-key"
import { getServerCardViewModel, getServerSearchViewModel } from "@/lib/server-view-model"
import { cn } from "@/lib/utils"
import { type NezhaServer } from "@/types/nezha-api"
import { useMemo } from "react"
import { Link } from "react-router-dom"

function ResourceBar({ label, value, color }: { label: string; value: number; color: string }) {
  const percent = Math.max(0, Math.min(100, value))
  return (
    <div className="server-resource">
      <div className="server-resource__head">
        <span>{label}</span>
        <strong>{Math.round(percent * 10) / 10}%</strong>
      </div>
      <div className="server-resource__track" aria-hidden="true">
        <span style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function ServerCard({ now, serverInfo }: { now: number; serverInfo: NezhaServer }) {
  const viewModel = useMemo(() => getServerCardViewModel(now, serverInfo), [now, serverInfo])
  const tags = useMemo(() => getServerSearchViewModel(serverInfo).tagList, [serverInfo])
  const detailUrl = `/server/${serverIdToServerKey(serverInfo.id)}`

  return (
    <Link
      to={detailUrl}
      className={cn("server-card", { "server-card--offline": !viewModel.info.online })}
      onClick={() => sessionStorage.setItem("fromMainPage", "true")}
      aria-label={`查看 ${viewModel.info.name} 详情`}
    >
      <div className="server-card__heading">
        <div className="server-card__identity">
          <span className={cn("dashboard-status-dot", { "dashboard-status-dot--offline": !viewModel.info.online })} />
          <ServerFlag country_code={viewModel.info.country_code} className="server-card__flag" />
          <span className="server-card__name">{viewModel.info.name}</span>
          <span className={cn("server-card__state", { "server-card__state--offline": !viewModel.info.online })}>
            {viewModel.info.online ? "在线" : "离线"}
          </span>
        </div>
        <i className="ri-arrow-right-s-line server-card__arrow" aria-hidden="true" />
      </div>

      <div className="server-card__content">
        <div className="server-card__resources">
          {viewModel.rings.map((ring) => (
            <ResourceBar
              key={ring.type}
              label={ring.label}
              value={Number(ring.used)}
              color={ring.type === "cpu" ? "#2d8bb3" : ring.type === "mem" ? "#0aa579" : "#d59a16"}
            />
          ))}
        </div>

        <div className="server-card__metrics">
          <div>
            <span>在线时长</span>
            <strong>
              {viewModel.realtime.duration.value}
              <small>{viewModel.realtime.duration.unit}</small>
            </strong>
          </div>
          <div>
            <span>流量</span>
            <strong>
              {viewModel.realtime.transferStat.value}
              <small>{viewModel.realtime.transferStat.unit}</small>
            </strong>
          </div>
          <div>
            <span>入网</span>
            <strong>
              {viewModel.realtime.inSpeed.value}
              <small>{viewModel.realtime.inSpeed.unit}</small>
            </strong>
          </div>
          <div>
            <span>出网</span>
            <strong>
              {viewModel.realtime.outSpeed.value}
              <small>{viewModel.realtime.outSpeed.unit}</small>
            </strong>
          </div>
        </div>
      </div>

      <div className="server-card__footer">
        <div className="server-card__tags">
          {tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        {viewModel.billing.remainingTime ? (
          <span className="server-card__billing">
            <i className="ri-time-line" aria-hidden="true" />
            {viewModel.billing.remainingDays
              ? `${viewModel.billing.remainingDays.num}${viewModel.billing.remainingDays.unit}`
              : viewModel.billing.remainingTime.value}
          </span>
        ) : null}
      </div>
    </Link>
  )
}
