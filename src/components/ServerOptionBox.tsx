import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { useMemo } from "react"

export type ServerOptionItem = {
  key: string
  label: string
  value: string
  title?: string
  icon?: string
}

export function ServerOptionBox({
  value,
  onChange,
  options,
  acceptEmpty = true,
  mobileShow = true,
  className,
}: {
  value: string
  onChange: (val: string) => void
  options: ServerOptionItem[]
  acceptEmpty?: boolean
  mobileShow?: boolean
  className?: string
}) {
  const activeValue = value ?? ""
  const safeOptions = useMemo(() => (Array.isArray(options) ? options : []), [options])

  return (
    <ToggleGroup
      type="single"
      value={activeValue}
      onValueChange={(nextValue) => {
        if (nextValue || acceptEmpty) onChange(nextValue)
      }}
      className={cn(
        "server-options",
        {
          "server-options--mobile-hidden": !mobileShow,
        },
        className,
      )}
      aria-label="服务器筛选"
    >
      {safeOptions.map((item) => (
        <ToggleGroupItem
          key={item.key}
          value={item.value}
          className={cn("server-options__item", {
            "server-options__item--with-icon": !!item.icon,
          })}
          aria-label={item.label}
          title={item.title || undefined}
        >
          {item.icon ? (
            <i className={cn("server-options__icon", item.icon)} aria-hidden="true" />
          ) : (
            <span className="server-options__label">{item.label}</span>
          )}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
