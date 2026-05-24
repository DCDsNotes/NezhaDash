import { cn } from "@/lib/utils"
import React, { forwardRef } from "react"

export type SortOption = {
  value: string
  label: string
  title?: string
}

export const ServerSortDropdownMenu = forwardRef<
  HTMLDivElement,
  {
    visible: boolean
    options: SortOption[]
    activeValue: string
    dropdownStyle: React.CSSProperties
    isMobile: boolean
    onSelect: (item: SortOption) => void
  }
>(function ServerSortDropdownMenu({ visible, options, activeValue, dropdownStyle, isMobile, onSelect }, ref) {
  return (
    <div
      ref={ref}
      className={cn("server-sort-dropdown", {
        "server-sort-dropdown--mobile": isMobile,
      })}
      style={{
        ...dropdownStyle,
        display: visible ? "block" : "none",
      }}
    >
      <div className="server-sort-dropdown__options">
        {options.map((item) => (
          <div
            key={item.value}
            className={cn("server-sort-dropdown__item", { "server-sort-dropdown__item--active": activeValue === item.value })}
            title={item.title || undefined}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(item)
            }}
          >
            <span className="server-sort-dropdown__label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
})
