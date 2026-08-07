import { cn } from "@/lib/utils"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { type VariantProps, cva } from "class-variance-authority"
import { type ComponentPropsWithoutRef, type ElementRef, createContext, forwardRef, useContext } from "react"

const toggleGroupItemVariants = cva(
  "inline-flex items-center justify-center rounded-sm text-sm font-medium outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground",
  {
    variants: {
      size: {
        sm: "h-8 px-2.5",
        default: "h-9 px-3",
      },
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-background/70",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  },
)

type ToggleGroupStyle = VariantProps<typeof toggleGroupItemVariants>
const ToggleGroupContext = createContext<ToggleGroupStyle>({ size: "default", variant: "default" })

export const ToggleGroup = forwardRef<
  ElementRef<typeof ToggleGroupPrimitive.Root>,
  ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> & ToggleGroupStyle
>(function ToggleGroup({ children, className, size, variant, ...props }, ref) {
  return (
    <ToggleGroupPrimitive.Root ref={ref} className={cn("flex items-center gap-1", className)} {...props}>
      <ToggleGroupContext.Provider value={{ size, variant }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  )
})

export const ToggleGroupItem = forwardRef<
  ElementRef<typeof ToggleGroupPrimitive.Item>,
  ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> & ToggleGroupStyle
>(function ToggleGroupItem({ className, size, variant, ...props }, ref) {
  const context = useContext(ToggleGroupContext)

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(toggleGroupItemVariants({ size: size ?? context.size, variant: variant ?? context.variant }), className)}
      {...props}
    />
  )
})
