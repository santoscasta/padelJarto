import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-[#f97316]/30 bg-[#f97316]/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-[#fdba74]",
        className,
      )}
      {...props}
    />
  );
}
