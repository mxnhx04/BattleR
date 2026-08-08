const SIZES = {
  sm: "text-base",
  md: "text-2xl",
  lg: "text-4xl",
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
    <span className={`${SIZES[size]} leading-none tracking-tight`}>
      {Array.from({ length: maxHp }, (_, i) =>
        i < hp ? (
          <span key={i} className="text-glow-orange">
            ❤️
          </span>
        ) : (
          <span key={i} className="opacity-25 grayscale">
            🖤
          </span>
        ),
      )}
    </span>
  );
}
