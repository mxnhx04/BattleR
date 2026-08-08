import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

const COLOR_CLASSES = {
  gold: "border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-black hover:shadow-[0_0_12px_#F1D32B,0_0_36px_rgba(241,211,43,0.6)]",
  blue: "border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-brand-black hover:shadow-[0_0_12px_#1EBDDB,0_0_36px_rgba(30,189,219,0.6)]",
} as const;

const BASE_CLASSES =
  "inline-block text-center font-heading font-bold text-xl tracking-wider uppercase border-2 rounded-md px-6 py-3 transition-all duration-200";
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
  const { color = "gold", className = "", children, ...rest } = props;

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
