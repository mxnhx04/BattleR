export function Logo({ size = 140 }: { size?: number }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className="overflow-visible">
      <polygon
        points="100,6 182,52 182,148 100,194 18,148 18,52"
        fill="rgba(241,211,43,0.06)"
        stroke="#F1D32B"
        strokeWidth={2}
        style={{ filter: "drop-shadow(0 0 10px rgba(241,211,43,0.65))" }}
      />
      <polygon
        points="100,26 164,62 164,138 100,174 36,138 36,62"
        fill="none"
        stroke="#1EBDDB"
        strokeWidth={1}
        opacity={0.6}
      />
      <g stroke="#F5F6F8" strokeWidth={1.6} fill="none">
        <circle cx="100" cy="100" r="34" />
        <line x1="100" y1="46" x2="100" y2="70" />
        <line x1="100" y1="130" x2="100" y2="154" />
        <line x1="46" y1="100" x2="70" y2="100" />
        <line x1="130" y1="100" x2="154" y2="100" />
      </g>
      <circle cx="100" cy="100" r="4" fill="#F1D32B" />
    </svg>
  );
}
