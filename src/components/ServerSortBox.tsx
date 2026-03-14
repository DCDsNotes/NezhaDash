import React, { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

import { ServerSortDropdownMenu, SortOption } from "./ServerSortDropdownMenu"

function ArrowIcon({ dir }: { dir: "up" | "down" }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      {dir === "down" ? (
        <path fill="currentColor" d="M12 16l-6-6h12l-6 6z" />
      ) : (
        <path fill="currentColor" d="M12 8l6 6H6l6-6z" />
      )}
    </svg>
  )
}

export function ServerSortBox({
  value,
  onChange,
  options,
  acceptEmpty = true,
  mobileShow = true,
  className,
}: {
  value: { prop: string; order: "asc" | "desc" }
  onChange: (val: { prop: string; order: "asc" | "desc" }) => void
  options: SortOption[]
  acceptEmpty?: boolean
  mobileShow?: boolean
  className?: string
}) {
  const triggerRef = useRef<HTMLDivElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const [isMobile, setIsMobile] = useState<boolean>(() => (typeof window !== "undefined" ? window.innerWidth < 768 : false))
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  const activeValue = value

  const selectedLabel = useMemo(() => {
    const selectedOption = options.find((opt) => opt.value === activeValue.prop)
    return selectedOption ? selectedOption.label : "排序"
  }, [activeValue.prop, options])

  function updateDropdownPosition() {
    const triggerEl = triggerRef.current
    const dropdownEl = dropdownRef.current
    if (!triggerEl || !dropdownEl) return

    if (isMobile) {
      setDropdownStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        visibility: "visible",
        zIndex: 500,
      })
      return
    }

    const triggerRect = triggerEl.getBoundingClientRect()
    let top = triggerRect.bottom + 8
    let left = triggerRect.left

    setDropdownStyle({
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      visibility: "hidden",
      zIndex: 500,
    })

    requestAnimationFrame(() => {
      const dropdownRect = dropdownEl.getBoundingClientRect()
      if (left + dropdownRect.width > window.innerWidth) {
        left = window.innerWidth - dropdownRect.width - 10
      }
      if (top + dropdownRect.height > window.innerHeight) {
        top = triggerRect.top - dropdownRect.height - 8
      }
      if (left < 10) left = 10

      setDropdownStyle({
        position: "fixed",
        top: `${top}px`,
        left: `${left}px`,
        visibility: "visible",
        zIndex: 500,
      })
    })
  }

  function toggleDropdown(e: React.MouseEvent) {
    e.stopPropagation()
    setIsDropdownOpen((v) => !v)
  }

  function toggleOrder(e: React.MouseEvent) {
    e.stopPropagation()
    if (!activeValue.prop) return
    onChange({
      prop: activeValue.prop,
      order: activeValue.order === "desc" ? "asc" : "desc",
    })
  }

  function handleSelectItem(item: SortOption) {
    if (activeValue.prop === item.value) {
      if (acceptEmpty) onChange({ prop: "", order: "desc" })
    } else {
      onChange({ prop: item.value, order: activeValue.order || "desc" })
    }
    setIsDropdownOpen(false)
  }

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768)
      if (isDropdownOpen) updateDropdownPosition()
    }

    function handleDocumentClick(event: MouseEvent) {
      if (!isDropdownOpen) return
      const triggerEl = triggerRef.current
      const dropdownEl = dropdownRef.current
      const target = event.target as Node | null
      if (!triggerEl || !dropdownEl || !target) return
      if (!triggerEl.contains(target) && !dropdownEl.contains(target)) {
        setIsDropdownOpen(false)
      }
    }

    window.addEventListener("resize", handleResize)
    document.addEventListener("click", handleDocumentClick)
    return () => {
      window.removeEventListener("resize", handleResize)
      document.removeEventListener("click", handleDocumentClick)
    }
  }, [isDropdownOpen, isMobile])

  useEffect(() => {
    if (isDropdownOpen) updateDropdownPosition()
  }, [isDropdownOpen, isMobile])

  return (
    <div
      className={cn(
        "server-sort-box",
        {
          "server-sort-box--mobile-hide": !mobileShow,
        },
        className,
      )}
    >
      <div ref={triggerRef} className="sort-select-wrapper" onClick={toggleDropdown}>
        <div className="sort-select-selected">
          <span className="sort-select-selected-value">{selectedLabel}</span>
          <span className="sort-select-selected-icon" onClick={toggleOrder}>
            <ArrowIcon dir={activeValue.order === "desc" ? "down" : "up"} />
          </span>
        </div>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <ServerSortDropdownMenu
            ref={dropdownRef}
            visible={isDropdownOpen}
            options={options}
            activeValue={activeValue.prop}
            dropdownStyle={dropdownStyle}
            isMobile={isMobile}
            onSelect={handleSelectItem}
          />,
          document.body,
        )}
    </div>
  )
}

