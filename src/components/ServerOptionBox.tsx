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

  function toggleModelValue(item: ServerOptionItem) {
    if (activeValue === item.value) {
      if (acceptEmpty) onChange("")
      return
    }
    onChange(item.value)
  }

  return (
    <div
      className={cn(
        "server-options",
        {
          "server-options--mobile-hidden": !mobileShow,
        },
        className,
      )}
    >
      {safeOptions.map((item) => (
        <div
          key={item.key}
          className={cn("server-options__item", {
            "server-options__item--with-icon": !!item.icon,
            "server-options__item--active": activeValue === item.value,
          })}
          title={item.title || undefined}
          onClick={() => toggleModelValue(item)}
        >
          {item.icon ? (
            <i className={cn("server-options__icon", item.icon)} title={item.label} />
          ) : (
            <span className="server-options__label">{item.label}</span>
          )}
        </div>
      ))}
    </div>
  )
}
