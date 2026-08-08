import { IconHeart } from "./icons";

const SIZES = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-9 h-9",
} as const;

export function HpHearts({
  hp,
  maxHp,
  size = "md",
}: {
  hp: number;
  maxHp: number;
  size?: keyof typeof SIZES;
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: maxHp }, (_, i) =>
        i < hp ? (
          <IconHeart key={i} filled className={`${SIZES[size]} text-brand-gold`} />
        ) : (
          <IconHeart
            key={i}
            filled={false}
            className={`${SIZES[size]} text-brand-gray opacity-40`}
          />
        ),
      )}
    </span>
  );
}
