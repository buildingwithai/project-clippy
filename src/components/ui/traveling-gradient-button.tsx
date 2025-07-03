import * as React from "react";
import { cn } from "@/lib/utils";

export interface TravelingGradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

/**
 * TravelingGradientButton
 * A continuously animated gradient button that does **not** rely on hover/focus.
 * The gradient rotates slowly using the custom `animate-spin-slow` utility (see `index.css`).
 * Usage:
 * ```tsx
 * <TravelingGradientButton onClick={...}>Click me</TravelingGradientButton>
 * ```
 */
export const TravelingGradientButton = React.forwardRef<
  HTMLButtonElement,
  TravelingGradientButtonProps
>(({ className, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        // Base
        "relative inline-flex items-center justify-center overflow-hidden rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        // Inner padding & text colour
        "px-4 py-2 text-slate-100",
        // Gradient layer (before) that spins continuously
        "before:absolute before:inset-[-150%] before:bg-[conic-gradient(var(--tw-gradient-stops))] before:from-indigo-500 before:via-sky-500 before:to-emerald-400 before:animate-spin-slow before:opacity-60 before:blur-sm",
        // Mask the gradient to appear only as a subtle glow
        "after:absolute after:inset-px after:rounded-[calc(theme(borderRadius.md)-1px)] after:bg-slate-900",
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
});

TravelingGradientButton.displayName = "TravelingGradientButton";
