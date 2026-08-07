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
  const billing = viewModel.billing.remainingTime
  const expiryText = billing ? viewModel.billing.endDateText || "长期有效" : "未设置"
  const remainingText = billing?.type === "days" ? `剩余 ${billing.value}` : billing?.value || "未配置"

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
          {viewModel.info.online ? "正常" : "离线"}
        </span>
      </div>

      <div className="probe-node-item__speeds" aria-label="实时网络速度">
        <div className="probe-speed-metric probe-speed-metric--down">
          <span>
            <i className="ri-arrow-down-line" aria-hidden="true" /> 下行
          </span>
          <strong>
            {viewModel.realtime.inSpeed.value}
            <small>{viewModel.realtime.inSpeed.unit}/s</small>
          </strong>
        </div>
        <div className="probe-speed-metric probe-speed-metric--up">
          <span>
            <i className="ri-arrow-up-line" aria-hidden="true" /> 上行
          </span>
          <strong>
            {viewModel.realtime.outSpeed.value}
            <small>{viewModel.realtime.outSpeed.unit}/s</small>
          </strong>
        </div>
      </div>

      <div className="probe-node-item__renewal">
        <span>
          <small>到期时间</small>
          <strong>{expiryText}</strong>
        </span>
        <span
          className={cn("probe-node-item__remaining", {
            "probe-node-item__remaining--expired": billing?.type === "expired",
            "probe-node-item__remaining--infinity": billing?.type === "infinity",
          })}
        >
          {remainingText}
        </span>
      </div>

      <div className="probe-node-item__health">
        {viewModel.rings.slice(0, 3).map((ring) => (
          <span key={ring.type}>
            {ring.label} <strong>{Math.round(Number(ring.used) * 10) / 10}%</strong>
          </span>
        ))}
        <span className="probe-node-item__uptime">
          运行 {viewModel.realtime.duration.value}
          {viewModel.realtime.duration.unit}
        </span>
      </div>

      {tags.length > 0 ? (
        <div className="probe-node-item__tags">
          {tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      ) : null}
    </Link>
  )
}
