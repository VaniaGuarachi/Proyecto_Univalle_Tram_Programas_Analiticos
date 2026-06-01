import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-slate-200/80 bg-white/90 px-4 py-2 text-sm text-slate-900 shadow-sm ring-offset-white placeholder:text-slate-400 file:border-0 file:bg-transparent file:text-sm file:font-semibold focus-visible:outline-none focus-visible:border-univalle-primary/45 focus-visible:ring-4 focus-visible:ring-univalle-primary/10 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
