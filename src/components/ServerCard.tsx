import { useMemo } from "react"
import { useNavigate } from "react-router-dom"

import ServerFlag from "@/components/ServerFlag"
import { ServerStatusRing } from "@/components/ServerStatusRing"
import { serverIdToServerKey } from "@/lib/server-key"
import { getRingTrackColor, getRingUsedColor, getServerCardViewModel } from "@/lib/server-view-model"
import { cn } from "@/lib/utils"
import { NezhaServer } from "@/types/nezha-api"

export default function ServerCard({ now, serverInfo }: { now: number; serverInfo: NezhaServer }) {
  const navigate = useNavigate()
  const { billing, info, realtime, rings } = useMemo(() => getServerCardViewModel(now, serverInfo), [now, serverInfo])

  const cardClick = () => {
    sessionStorage.setItem("fromMainPage", "true")
    navigate(`/server/${serverIdToServerKey(serverInfo.id)}`)
  }

  return (
    <div className={cn("server-list-item nazha-box", { "server-list-item--offline": info.online === false })}>
      <div className="server-info-group server-list-item-head" onClick={cardClick}>
        <div className="server-name-group left-box">
          <ServerFlag country_code={info.country_code} />
          <span className="server-name">{info.name}</span>
        </div>
      </div>

      <div className="server-list-item-main" onClick={cardClick}>
        <div className="server-list-item-status type--ring len--3">
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

      <div className="server-list-item-bill">
        <div className="left-box">
          {billing.remainingTime ? (
            <div className="remaining-time-info">
              <span className="icon" aria-hidden="true">
                <span className="ri-hourglass-fill" />
              </span>
              <span className="text">
                {billing.remainingTime.type !== "infinity" ? (
                  <>
                    <span className="text-item label-text">{billing.remainingTime.label}</span>
                    {billing.remainingDays ? (
                      <>
                        <span className="text-item value-text">{billing.remainingDays.num}</span>
                        <span className="text-item label-text">{billing.remainingDays.unit}</span>
                      </>
                    ) : (
                      <span className="text-item value-text">{billing.remainingTime.value}</span>
                    )}
                  </>
                ) : (
                  <span className="text-item value-text">{billing.remainingTime.value}</span>
                )}
              </span>
            </div>
          ) : (
            <div />
          )}

          {billing.endDateText ? (
            <div className="billing-end-date">
              <span className="billing-end-date-text">{billing.endDateText}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
