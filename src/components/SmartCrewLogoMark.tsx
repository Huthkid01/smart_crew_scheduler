import type { HTMLAttributes } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type SmartCrewLogoMarkProps = {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  /** Rotating ring (loader). Off for static brand mark only. */
  spin?: boolean;
  variant?: "loading" | "idle";
} & Omit<HTMLAttributes<HTMLDivElement>, "children">;

const dimensions = {
  xs: {
    outer: "h-5 w-5",
    inner: "h-[17px] w-[17px] min-h-[17px] min-w-[17px]",
    icon: "h-2.5 w-2.5",
    ringBorder: "border",
  },
  sm: {
    outer: "h-8 w-8",
    inner: "h-[26px] w-[26px] min-h-[26px] min-w-[26px]",
    icon: "h-[18px] w-[18px]",
    ringBorder: "border-2",
  },
  md: {
    outer: "h-12 w-12",
    inner: "h-[40px] w-[40px] min-h-[40px] min-w-[40px]",
    icon: "h-7 w-7",
    ringBorder: "border-2",
  },
  lg: {
    outer: "h-16 w-16",
    inner: "h-[54px] w-[54px] min-h-[54px] min-w-[54px]",
    icon: "h-9 w-9",
    ringBorder: "border-2",
  },
} as const;

/** Brand loader: Zap in primary circle with optional spinning ring. Use across the app instead of generic spinners. */
export function SmartCrewLogoMark({
  className,
  size = "sm",
  spin = true,
  variant = "loading",
  ...rest
}: SmartCrewLogoMarkProps) {
  const d = dimensions[size];
  const duration = variant === "loading" ? "0.72s" : "1.15s";

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        d.outer,
        className
      )}
      {...rest}
    >
      {spin ? (
        <div
          className={cn(
            "absolute inset-0 rounded-full border-primary/20 border-t-primary border-r-primary/55 motion-reduce:animate-none animate-spin",
            d.ringBorder
          )}
          style={{ animationDuration: duration }}
          aria-hidden
        />
      ) : null}
      <div
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full bg-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]",
          d.inner
        )}
      >
        <Zap className={cn(d.icon, "text-primary-foreground")} strokeWidth={2.5} aria-hidden />
      </div>
    </div>
  );
}
