import { ServerStatusRing } from "@/components/ServerStatusRing"
import { getRingTrackColor, getRingUsedColor, getServerDetailStatusViewModel } from "@/lib/server-view-model"
import { NezhaServer } from "@/types/nezha-api"
import { useMemo } from "react"

export default function ServerDetailStatusBox({ now, server }: { now: number; server: NezhaServer }) {
  const { realtime, rings } = useMemo(() => getServerDetailStatusViewModel(now, server), [now, server])

  return (
    <div className="server-detail-status nazha-box">
      <div className="server-detail-status__rings server-detail-status__rings--ring">
        {rings.map((item) => (
          <ServerStatusRing
            key={item.type}
            type={item.type}
            used={item.used}
            colors={{ used: getRingUsedColor(item.type), total: getRingTrackColor() }}
            valPercent={item.valPercent}
            valText={item.valText}
            label={item.label}
          />
        ))}
      </div>

      <div className="server-metrics">
        <div className="server-metrics__item server-metrics__item--duration">
          <div className="server-metrics__content">
            <span className="server-metrics__value">{realtime.duration.value}</span>
            <span className="server-metrics__unit">{realtime.duration.unit}</span>
          </div>
          <span className="server-metrics__label">在线</span>
        </div>
        <div className="server-metrics__item server-metrics__item--transfer">
          <div className="server-metrics__content">
            <span className="server-metrics__value">{realtime.transferStat.value}</span>
            <span className="server-metrics__unit">{realtime.transferStat.unit}</span>
          </div>
          <span className="server-metrics__label">流量</span>
        </div>
        <div className="server-metrics__item server-metrics__item--in-speed">
          <div className="server-metrics__content">
            <span className="server-metrics__value">{realtime.inSpeed.value}</span>
            <span className="server-metrics__unit">{realtime.inSpeed.unit}</span>
          </div>
          <span className="server-metrics__label">入网</span>
        </div>
        <div className="server-metrics__item server-metrics__item--out-speed">
          <div className="server-metrics__content">
            <span className="server-metrics__value">{realtime.outSpeed.value}</span>
            <span className="server-metrics__unit">{realtime.outSpeed.unit}</span>
          </div>
          <span className="server-metrics__label">出网</span>
        </div>
      </div>
    </div>
  )
}
