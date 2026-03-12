import { formatBytes } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { NezhaServer } from "@/types/nezha-api"

function formatUptime(uptimeSeconds: number) {
  const days = Math.floor(uptimeSeconds / 86400)
  if (days >= 1) return { value: `${days}`, unit: "天", label: "在线" }
  const hours = Math.floor(uptimeSeconds / 3600)
  return { value: `${hours}`, unit: "小时", label: "在线" }
}

function formatSpeed(bytesPerSecond: number) {
  const b = bytesPerSecond || 0
  if (!b) return { value: "0", unit: "B/s" }
  const k = 1024
  const m = k * 1024
  const g = m * 1024
  if (b >= g) return { value: (b / g).toFixed(1).replace(/\.0$/, ""), unit: "G/s" }
  if (b >= m) return { value: (b / m).toFixed(1).replace(/\.0$/, ""), unit: "M/s" }
  if (b >= k) return { value: (b / k).toFixed(1).replace(/\.0$/, ""), unit: "K/s" }
  return { value: `${Math.floor(b)}`, unit: "B/s" }
}

export default function ServerRealTime({
  server,
  tpl = "duration,transfer,inSpeed,outSpeed",
}: {
  server: NezhaServer
  tpl?: "duration,transfer,inSpeed,outSpeed" | string
}) {
  const items = tpl.split(",")
  const totalTransfer = (server.state.net_in_transfer || 0) + (server.state.net_out_transfer || 0)
  return (
    <div className="nazhua-server-real-time-group">
      {items.map((key) => {
        if (key === "duration") {
          const { value, unit, label } = formatUptime(server.state.uptime || 0)
          return (
            <div key={key} className={cn("nazhua-server-real-time-item", "nazhua-server-real-time--duration")}>
              <div className="nazhua-item-content">
                <span className="nazhua-item-value">{value}</span>
                <span className="nazhua-item-unit nazhua-item-text">{unit}</span>
              </div>
              <span className="nazhua-item-label">{label}</span>
            </div>
          )
        }
        if (key === "transfer") {
          const value = formatBytes(totalTransfer).replace(" ", "")
          return (
            <div key={key} className={cn("nazhua-server-real-time-item", "nazhua-server-real-time--transfer")}>
              <div className="nazhua-item-content">
                <span className="nazhua-item-value">{value}</span>
              </div>
              <span className="nazhua-item-label">双向流量</span>
            </div>
          )
        }
        if (key === "inSpeed") {
          const sp = formatSpeed(server.state.net_in_speed || 0)
          return (
            <div key={key} className={cn("nazhua-server-real-time-item", "nazhua-server-real-time--inSpeed")}>
              <div className="nazhua-item-content">
                <span className="nazhua-item-value">{sp.value}</span>
                <span className="nazhua-item-unit nazhua-item-text">{sp.unit}</span>
              </div>
              <span className="nazhua-item-label">入网</span>
            </div>
          )
        }
        if (key === "outSpeed") {
          const sp = formatSpeed(server.state.net_out_speed || 0)
          return (
            <div key={key} className={cn("nazhua-server-real-time-item", "nazhua-server-real-time--outSpeed")}>
              <div className="nazhua-item-content">
                <span className="nazhua-item-value">{sp.value}</span>
                <span className="nazhua-item-unit nazhua-item-text">{sp.unit}</span>
              </div>
              <span className="nazhua-item-label">出网</span>
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

