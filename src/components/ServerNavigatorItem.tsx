import ServerFlag from "@/components/ServerFlag"
import { preloadServerDetail } from "@/lib/route-preload"
import { serverIdToServerKey } from "@/lib/server-key"
import { getServerCardViewModel } from "@/lib/server-view-model"
import { cn } from "@/lib/utils"
import { type NezhaServer } from "@/types/nezha-api"
import { useMemo } from "react"
import { Link } from "react-router-dom"

export default function ServerNavigatorItem({ now, server, active }: { now: number; server: NezhaServer; active: boolean }) {
  const viewModel = useMemo(() => getServerCardViewModel(now, server), [now, server])
  const serverKey = serverIdToServerKey(server.id)
  const billing = viewModel.billing.remainingTime
  const expiryText = billing ? viewModel.billing.endDateText || "长期有效" : "未设置"
  const remainingText = billing?.type === "days" ? `剩余 ${billing.value}` : billing?.value || "未配置"
  const resources = viewModel.rings.slice(0, 3)

  return (
    <Link
      to={`/server/${serverKey}`}
      className={cn("probe-node-item", {
        "probe-node-item--active": active,
        "probe-node-item--offline": !viewModel.info.online,
      })}
      aria-label={`查看 ${viewModel.info.name} 详情`}
      onPointerEnter={() => void preloadServerDetail()}
      onFocus={() => void preloadServerDetail()}
      onClick={() => sessionStorage.setItem("fromMainPage", "true")}
    >
      <div className="probe-node-item__identity">
        <span className={cn("probe-status-dot", { "probe-status-dot--offline": !viewModel.info.online })} />
        <ServerFlag country_code={viewModel.info.country_code} className="probe-node-item__flag" />
        <span className="probe-node-item__name">
          <strong>{viewModel.info.name}</strong>
          <small>
            {viewModel.info.online ? "已运行" : "暂时离线，已运行"} {viewModel.realtime.duration.value}
            {viewModel.realtime.duration.unit}
          </small>
        </span>
      </div>

      <div className="probe-node-item__speeds" aria-label="实时网络速度">
        <span className="probe-speed-metric probe-speed-metric--down">
          <i className="ri-arrow-down-line" aria-hidden="true" />
          <strong>
            {viewModel.realtime.inSpeed.value}
            <small>{viewModel.realtime.inSpeed.unit}/s</small>
          </strong>
        </span>
        <span className="probe-speed-metric probe-speed-metric--up">
          <i className="ri-arrow-up-line" aria-hidden="true" />
          <strong>
            {viewModel.realtime.outSpeed.value}
            <small>{viewModel.realtime.outSpeed.unit}/s</small>
          </strong>
        </span>
      </div>

      <div className="probe-node-item__resources" aria-label="资源占用">
        {resources.map((resource) => (
          <span key={resource.type}>
            <small>{resource.type === "disk" ? "硬盘" : resource.label}</small>
            <strong>{Math.round(Number(resource.used) * 10) / 10}%</strong>
          </span>
        ))}
      </div>

      <div className="probe-node-item__renewal">
        <small>{expiryText}</small>
        <span
          className={cn("probe-node-item__remaining", {
            "probe-node-item__remaining--expired": billing?.type === "expired",
            "probe-node-item__remaining--infinity": billing?.type === "infinity",
          })}
        >
          {remainingText}
        </span>
      </div>

      <i className="ri-arrow-right-s-line probe-node-item__arrow" aria-hidden="true" />
    </Link>
  )
}
