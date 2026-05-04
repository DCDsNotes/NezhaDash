import { useMemo } from "react"

import { ServerStatusRing } from "@/components/ServerStatusRing"
import { getRingTrackColor, getRingUsedColor, getServerDetailStatusViewModel } from "@/lib/server-view-model"
import { NezhaServer } from "@/types/nezha-api"

export default function ServerDetailStatusBox({ now, server }: { now: number; server: NezhaServer }) {
  const { realtime, rings } = useMemo(() => getServerDetailStatusViewModel(now, server), [now, server])

  return (
    <div className="server-status-and-real-time nazha-box">
      <div className={`server-status-group server-status-group--ring status-list--${rings.length}`}>
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

      <div className="server-real-time-group">
        <div className="server-real-time-item server-real-time--duration">
          <div className="item-content">
            <span className="item-value">{realtime.duration.value}</span>
            <span className="item-unit item-text">{realtime.duration.unit}</span>
          </div>
          <span className="item-label">在线</span>
        </div>
        <div className="server-real-time-item server-real-time--transfer">
          <div className="item-content">
            <span className="item-value">{realtime.transferStat.value}</span>
            <span className="item-unit item-text">{realtime.transferStat.unit}</span>
          </div>
          <span className="item-label">流量</span>
        </div>
        <div className="server-real-time-item server-real-time--inSpeed">
          <div className="item-content">
            <span className="item-value">{realtime.inSpeed.value}</span>
            <span className="item-unit item-text">{realtime.inSpeed.unit}</span>
          </div>
          <span className="item-label">入网</span>
        </div>
        <div className="server-real-time-item server-real-time--outSpeed">
          <div className="item-content">
            <span className="item-value">{realtime.outSpeed.value}</span>
            <span className="item-unit item-text">{realtime.outSpeed.unit}</span>
          </div>
          <span className="item-label">出网</span>
        </div>
      </div>
    </div>
  )
}
