import { type CSSProperties, type ReactNode } from "react"

export type ServerMonitorMetric = {
  key: string
  modifier: string
  label: string
  value: ReactNode
}

export function getServerMonitorCategoryStyle(color: string) {
  return { ["--cate-color" as `--${string}`]: color } as CSSProperties
}

export function ServerMonitorCategoryContent({ name, nameTitle, metrics }: { name: ReactNode; nameTitle?: string; metrics: ServerMonitorMetric[] }) {
  return (
    <>
      <span className="server-monitor-category__legend" />
      <span className="server-monitor-category__name" title={nameTitle}>
        {name}
      </span>
      <div className="server-monitor-category__metrics">
        {metrics.map((metric) => (
          <span key={metric.key} className={`server-monitor-category__metric ${metric.modifier}`}>
            <span className="server-monitor-category__metric-label">{metric.label}</span>
            <span className="server-monitor-category__metric-value">{metric.value}</span>
          </span>
        ))}
      </div>
    </>
  )
}
