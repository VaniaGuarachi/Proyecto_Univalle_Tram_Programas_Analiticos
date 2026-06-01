import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-bold ring-offset-white transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-univalle-primary/35 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55 active:scale-[0.98]",
          {
            "bg-gradient-to-b from-univalle-action to-univalle-hover text-white shadow-[0_12px_24px_rgba(116,19,50,0.18)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(116,19,50,0.24)]": variant === 'default',
            "border border-univalle-primary/20 bg-white/90 text-univalle-primary shadow-sm hover:-translate-y-0.5 hover:border-univalle-primary/35 hover:bg-univalle-primary/5 hover:shadow-md": variant === 'outline',
            "text-slate-600 hover:bg-white/70 hover:text-univalle-primary hover:shadow-sm": variant === 'ghost',
            "h-10 px-4 py-2": size === 'default',
            "h-9 rounded-lg px-3 text-xs": size === 'sm',
            "h-11 rounded-xl px-8": size === 'lg',
            "h-10 w-10 rounded-xl": size === 'icon',
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
