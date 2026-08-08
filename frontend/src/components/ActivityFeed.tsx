import { shortTxHash } from "@/lib/format";
import type { ActivityEvent } from "@/lib/types";

const KIND_COLOR: Record<ActivityEvent["kind"], string> = {
  join: "text-brand-cyan",
  attack: "text-brand-orange",
  power: "text-brand-orange",
  shield: "text-brand-cyan",
  heal: "text-emerald-400",
  eliminate: "text-brand-purple",
  win: "text-brand-purple",
  system: "text-brand-gray",
};

export function ActivityFeed({
  events,
  limit = 12,
}: {
  events: ActivityEvent[];
  limit?: number;
}) {
  return (
    <ul className="flex flex-col gap-2 overflow-y-auto">
      {events.slice(0, limit).map((event) => (
        <li
          key={event.id}
          className="text-sm border-b border-white/5 pb-2 last:border-none"
        >
          <span className={KIND_COLOR[event.kind]}>{event.message}</span>
          <span className="block text-[0.65rem] text-brand-gray font-mono mt-0.5">
            tx {shortTxHash(event.txHash)}
          </span>
        </li>
      ))}
      {events.length === 0 && (
        <li className="text-sm text-brand-gray">No onchain activity yet.</li>
      )}
    </ul>
  );
}
