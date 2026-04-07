import { Slot } from "@radix-ui/react-slot";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  danger:
    "bg-[#7f1d1d] text-white hover:bg-[#991b1b]",
  ghost:
    "border border-white/15 bg-white/5 text-[#fef3c7] hover:bg-white/10",
  primary:
    "bg-[#f97316] text-[#1c1917] hover:bg-[#fb923c]",
  secondary:
    "border border-[#f97316]/40 bg-[#f97316]/10 text-[#fed7aa] hover:bg-[#f97316]/20",
};

export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  asChild?: boolean;
  variant?: ButtonVariant;
}

export function Button({
  asChild,
  className,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
