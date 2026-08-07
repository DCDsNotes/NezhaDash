import { cn } from "@/lib/utils"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef } from "react"

export const Switch = forwardRef<
  ElementRef<typeof SwitchPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & { thumbClassName?: string }
>(function Switch({ className, thumbClassName, ...props }, ref) {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-input outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          thumbClassName
            ? "pointer-events-none block"
            : "pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
          thumbClassName,
        )}
      />
    </SwitchPrimitive.Root>
  )
})
