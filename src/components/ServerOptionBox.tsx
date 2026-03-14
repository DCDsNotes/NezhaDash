import React, { useMemo } from "react"

import { cn } from "@/lib/utils"

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
        "server-option-box",
        {
          "server-option-box--mobile-hide": !mobileShow,
        },
        className,
      )}
    >
      {safeOptions.map((item) => (
        <div
          key={item.key}
          className={cn("server-option-item", {
            "has-icon": !!item.icon,
            "active": activeValue === item.value,
          })}
          title={item.title || undefined}
          onClick={() => toggleModelValue(item)}
        >
          {item.icon ? (
            <i className={cn("option-icon", item.icon)} title={item.label} />
          ) : (
            <span className="option-label">{item.label}</span>
          )}
        </div>
      ))}
    </div>
  )
}

