import ServerFlag from "@/components/ServerFlag"
import { ServerStatusRing } from "@/components/ServerStatusRing"
import { serverIdToServerKey } from "@/lib/server-key"
import { getRingTrackColor, getRingUsedColor, getServerCardViewModel } from "@/lib/server-view-model"
import { cn } from "@/lib/utils"
import { NezhaServer } from "@/types/nezha-api"
import { useMemo } from "react"
import { useNavigate } from "react-router-dom"

export default function ServerCard({ now, serverInfo }: { now: number; serverInfo: NezhaServer }) {
  const navigate = useNavigate()
  const { billing, info, realtime, rings } = useMemo(() => getServerCardViewModel(now, serverInfo), [now, serverInfo])

  const cardClick = () => {
    sessionStorage.setItem("fromMainPage", "true")
    navigate(`/server/${serverIdToServerKey(serverInfo.id)}`)
  }

  return (
    <div className={cn("server-card nazha-box", { "server-card--offline": info.online === false })}>
      <div className="server-card__header" onClick={cardClick}>
        <div className="server-card__title">
          <ServerFlag country_code={info.country_code} />
          <span className="server-card__name">{info.name}</span>
        </div>
      </div>

      <div className="server-card__body" onClick={cardClick}>
        <div className="server-card__status-rings">
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
            <span className="server-metrics__label">本月</span>
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

      <div className="server-card__billing">
        <div className="server-card__billing-row">
          {billing.remainingTime ? (
            <div className="server-card__remaining">
              <span className="server-card__remaining-icon" aria-hidden="true">
                <span className="ri-hourglass-fill" />
              </span>
              <span className="server-card__remaining-text">
                {billing.remainingTime.type !== "infinity" ? (
                  <>
                    <span className="server-card__remaining-label">{billing.remainingTime.label}</span>
                    {billing.remainingDays ? (
                      <>
                        <span className="server-card__remaining-value">{billing.remainingDays.num}</span>
                        <span className="server-card__remaining-label">{billing.remainingDays.unit}</span>
                      </>
                    ) : (
                      <span className="server-card__remaining-value">{billing.remainingTime.value}</span>
                    )}
                  </>
                ) : (
                  <span className="server-card__remaining-value">{billing.remainingTime.value}</span>
                )}
              </span>
            </div>
          ) : (
            <div />
          )}

          {billing.endDateText ? (
            <div className="server-card__billing-end-date">
              <span className="server-card__billing-end-date-text">{billing.endDateText}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
