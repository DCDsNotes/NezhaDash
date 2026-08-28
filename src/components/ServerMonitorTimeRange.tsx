import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

export const SERVER_MONITOR_MINUTES = [
  { label: "30分钟", value: 30 },
  { label: "1小时", value: 60 },
  { label: "3小时", value: 180 },
  { label: "6小时", value: 360 },
  { label: "12小时", value: 720 },
  { label: "24小时", value: 1440 },
] as const

export function getServerMonitorMinuteLabel(value: number) {
  return SERVER_MONITOR_MINUTES.find((option) => option.value === value)?.label || "24小时"
}

export function ServerMonitorTimeRange({
  value,
  onValueChange,
  ariaLabel,
}: {
  value: number
  onValueChange: (value: number) => void
  ariaLabel: string
}) {
  const activeIndex = SERVER_MONITOR_MINUTES.findIndex((option) => option.value === value)

  return (
    <div className="server-monitor__range">
      <span className="server-monitor__range-label">最近</span>
      <ToggleGroup
        type="single"
        value={String(value)}
        onValueChange={(nextValue) => {
          if (nextValue) onValueChange(Number(nextValue))
        }}
        className="server-monitor__minutes"
        aria-label={ariaLabel}
      >
        {SERVER_MONITOR_MINUTES.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={String(option.value)}
            className={cn("server-monitor__minute", { "server-monitor__minute--active": option.value === value })}
            aria-label={`最近${option.label}`}
          >
            <span>{option.label}</span>
          </ToggleGroupItem>
        ))}
        <div className="server-monitor__minute-indicator" style={{ left: `calc(${Math.max(0, activeIndex)} * var(--minute-item-width))` }} />
      </ToggleGroup>
    </div>
  )
}
