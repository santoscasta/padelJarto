import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-white/10 bg-[#14110f]/80 p-6 shadow-[0_20px_80px_rgba(12,10,9,0.3)] backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
