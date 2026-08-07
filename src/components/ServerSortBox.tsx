import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useMemo } from "react"

export type SortOption = {
  value: string
  label: string
  title?: string
}

export function ServerSortBox({
  value,
  onChange,
  options,
  mobileShow = true,
  className,
}: {
  value: { prop: string; order: "asc" | "desc" }
  onChange: (val: { prop: string; order: "asc" | "desc" }) => void
  options: SortOption[]
  mobileShow?: boolean
  className?: string
}) {
  const selectedLabel = useMemo(() => options.find((option) => option.value === value.prop)?.label || "排序", [options, value.prop])

  return (
    <div
      className={cn(
        "server-sort",
        {
          "server-sort--mobile-hidden": !mobileShow,
        },
        className,
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="server-sort__selected" aria-label={`排序字段：${selectedLabel}`}>
            <i className="server-sort__selected-icon ri-list-settings-line" aria-hidden="true" />
            <span className="server-sort__selected-value">{selectedLabel}</span>
            <i className="ri-arrow-down-s-line ml-1 text-base" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="server-sort-dropdown">
          <DropdownMenuRadioGroup
            value={value.prop}
            onValueChange={(prop) => {
              if (prop) onChange({ ...value, prop })
            }}
          >
            {options.map((item) => (
              <DropdownMenuRadioItem
                key={item.value}
                value={item.value}
                className="server-sort-dropdown__item [&>span:first-child]:hidden"
                title={item.title}
              >
                <span className="server-sort-dropdown__label">{item.label}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon-sm"
        className="server-sort__order-icon m-0"
        onClick={() => onChange({ ...value, order: value.order === "desc" ? "asc" : "desc" })}
        aria-label={value.order === "desc" ? "当前降序，切换为升序" : "当前升序，切换为降序"}
        title={value.order === "desc" ? "降序" : "升序"}
      >
        <i className={value.order === "desc" ? "ri-arrow-down-line" : "ri-arrow-up-line"} aria-hidden="true" />
      </Button>
    </div>
  )
}
