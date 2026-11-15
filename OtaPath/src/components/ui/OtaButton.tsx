import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * OtaButton — the OtaPath rubber-sticker button.
 * Chunky pill, flat color block, tactile bottom edge that squashes
 * on press (border-b-4 → border-b-2 + scale-95). No shadows, ever.
 */

const variants = {
  tangerine: "bg-tangerine text-cream",
  solar: "bg-solar text-ink-charcoal",
  forest: "bg-forest text-cream",
  cobalt: "bg-cobalt text-cream",
  blush: "bg-blush text-cream",
  paper: "bg-cream text-ink-charcoal",
} as const;

const sizes = {
  sm: "px-4 py-2.5 text-sm",
  md: "px-6 py-3.5 text-base",
  lg: "px-8 py-4 text-lg",
} as const;

export type OtaButtonProps = {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  href?: string;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<"button">, "className" | "children">;

export function OtaButton({
  variant = "tangerine",
  size = "md",
  href,
  className = "",
  children,
  ...rest
}: OtaButtonProps) {
  const cls = [
    "inline-flex items-center justify-center gap-2 select-none",
    "rounded-full font-sans font-bold tracking-tight",
    "border-b-4 border-stone-900/15",
    "transition-all duration-150",
    "hover:brightness-[1.05] hover:-translate-y-0.5",
    "active:translate-y-0.5 active:scale-[0.96] active:border-b-2",
    variants[variant],
    sizes[size],
    className,
  ].join(" ");

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
