import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

const COLOR_CLASSES = {
  orange:
    "border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-brand-black hover:shadow-[0_0_12px_#FF6B00,0_0_36px_rgba(255,107,0,0.6)]",
  cyan: "border-brand-cyan text-brand-cyan hover:bg-brand-cyan hover:text-brand-black hover:shadow-[0_0_12px_#00E5FF,0_0_36px_rgba(0,229,255,0.6)]",
  purple:
    "border-brand-purple text-brand-purple hover:bg-brand-purple hover:text-brand-black hover:shadow-[0_0_12px_#B026FF,0_0_36px_rgba(176,38,255,0.6)]",
} as const;

const BASE_CLASSES =
  "inline-block text-center font-display text-xl tracking-wider uppercase border-2 rounded-md px-6 py-3 transition-all duration-200";
const DISABLED_CLASSES =
  "border-brand-gray text-brand-gray opacity-40 cursor-not-allowed";

type Color = keyof typeof COLOR_CLASSES;

type AsButton = ButtonHTMLAttributes<HTMLButtonElement> & {
  color?: Color;
  children: ReactNode;
  href?: undefined;
};

type AsLink = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  color?: Color;
  children: ReactNode;
  href: string;
};

export function GlowButton(props: AsButton | AsLink) {
  const { color = "orange", className = "", children, ...rest } = props;

  if (props.href) {
    const { href, ...anchorRest } = rest as Omit<AsLink, "color" | "children">;
    return (
      <Link
        href={href}
        className={`${BASE_CLASSES} ${COLOR_CLASSES[color]} ${className}`}
        {...anchorRest}
      >
        {children}
      </Link>
    );
  }

  const { disabled, ...buttonRest } = rest as Omit<
    AsButton,
    "color" | "children" | "href"
  >;
  return (
    <button
      disabled={disabled}
      className={`${BASE_CLASSES} ${
        disabled ? DISABLED_CLASSES : COLOR_CLASSES[color]
      } ${className}`}
      {...buttonRest}
    >
      {children}
    </button>
  );
}
