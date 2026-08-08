// Small line-icon set replacing emoji throughout the app. All icons take
// currentColor for stroke/fill so they inherit text color, and a
// className for sizing.

interface IconProps {
  className?: string;
}

export function IconHeart({ filled, className }: IconProps & { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
    >
      <path d="M12 21s-7.2-4.5-9.6-9C1 8.4 2.5 4.8 6 4.8c2 0 3.4 1.1 4.2 2.4C11 5.9 12.4 4.8 14.4 4.8c3.5 0 5 3.6 3.6 7.2C15.6 16.5 12 21 12 21z" />
    </svg>
  );
}

export function IconShield({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <path d="M12 3 20 6.5v5c0 5-3.4 8-8 9.5-4.6-1.5-8-4.5-8-9.5v-5L12 3Z" />
    </svg>
  );
}

export function IconCrosshair({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="7" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconBolt({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <polygon points="13,2 5,14 11,14 9,22 19,10 13,10" />
    </svg>
  );
}

export function IconSkull({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3c-4 0-7 3-7 7 0 3 1.5 4.5 2 6l.5 2h9l.5-2c.5-1.5 2-3 2-6 0-4-3-7-7-7Z" />
      <circle cx="9" cy="10.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10.5" r="1.3" fill="currentColor" stroke="none" />
      <path d="M10 15.5h4" />
    </svg>
  );
}

export function IconTrophy({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4v2a3 3 0 0 0 3 3" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3" />
      <path d="M12 13v3" />
      <path d="M9 20h6" />
      <path d="M10 16.5h4l.4 3.5H9.6l.4-3.5Z" />
    </svg>
  );
}

export function IconPlus({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconSpeaker({ muted, className }: IconProps & { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" stroke="none" />
      {muted ? (
        <>
          <line x1="16" y1="9" x2="21" y2="15" />
          <line x1="21" y1="9" x2="16" y2="15" />
        </>
      ) : (
        <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      )}
    </svg>
  );
}

export function IconPhone({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="7" y="2.5" width="10" height="19" rx="1.5" />
      <line x1="10" y1="19" x2="14" y2="19" />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4,13 9,18 20,6" />
    </svg>
  );
}
