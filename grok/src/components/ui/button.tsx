import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "outline" | "danger" | "quiet";

export function Button({
  className,
  variant = "outline",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg" | "icon";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-[transform,background-color,color,box-shadow] duration-150 ease-out active:not-disabled:scale-[0.96] disabled:opacity-40 disabled:pointer-events-none",
        size === "sm" && "h-10 min-h-10 px-3 text-xs rounded-sm sm:h-8 sm:min-h-8",
        size === "md" && "h-10 px-3.5 text-sm rounded-md",
        size === "lg" && "h-12 px-4 text-sm rounded-md",
        size === "icon" && "size-10 rounded-md",
        variant === "primary" && "bg-accent text-accent-fg shadow-border hover:brightness-110",
        variant === "outline" && "bg-paper text-ink shadow-border hover:shadow-border-hover",
        variant === "ghost" && "bg-transparent text-ink hover:bg-chip",
        variant === "quiet" && "bg-chip text-ink hover:bg-line",
        variant === "danger" && "bg-danger text-paper",
        className,
      )}
      {...props}
    />
  );
}
