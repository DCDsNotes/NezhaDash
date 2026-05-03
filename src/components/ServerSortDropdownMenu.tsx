import React, { forwardRef } from "react"

import { cn } from "@/lib/utils"

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
      className={cn("server-sort-select-dropdown", {
        "server-sort-select-dropdown--mobile": isMobile,
      })}
      style={{
        ...dropdownStyle,
        display: visible ? "block" : "none",
      }}
    >
      <div className="sort-select-options">
        {options.map((item) => (
          <div
            key={item.value}
            className={cn("server-sort-item", { active: activeValue === item.value })}
            title={item.title || undefined}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(item)
            }}
          >
            <span className="option-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
})

