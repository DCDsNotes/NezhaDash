import type { NazhuaStatusItem } from "@/lib/nazhua/server-status"
import { cn } from "@/lib/utils"

import { Donut } from "./Donut"

export default function ServerStatusDonut({
  item,
  size,
  showContent = false,
}: {
  item: NazhuaStatusItem
  size: number
  showContent?: boolean
}) {
  const used = Math.min(Math.max(item.used, 1), 100)
  return (
    <div className={cn("nazhua-server-status", `nazhua-server-status--${item.type}`)}>
      <div className="nazhua-server-status-donut" style={{ height: size, width: size }}>
        <Donut used={used} size={size} strokeWidth={Math.ceil((size / 100) * 10)} colors={item.colors.used} trackColor={item.colors.total}>
          <div
            className="nazhua-donut-label"
            title={item.valPercent || `${Number((item.used || 0).toFixed(1))}%`}
            style={{ transform: "scale(var(--nazhua-server-status-label-scale, 1))" }}
          >
            <div className="nazhua-server-status-val-text">
              <span>{item.valText}</span>
            </div>
            <div className="nazhua-server-status-label">{item.label}</div>
          </div>
        </Donut>
      </div>

      {showContent && item.content ? (
        <div className="nazhua-server-status-content">
          <span className="nazhua-default-content">{item.content.default}</span>
          <span className="nazhua-default-mobile">{item.content.mobile}</span>
        </div>
      ) : null}
    </div>
  )
}
