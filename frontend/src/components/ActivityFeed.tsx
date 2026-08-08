import { shortTxHash } from "@/lib/format";
import {
  IconBolt,
  IconCrosshair,
  IconHeart,
  IconPlus,
  IconShield,
  IconSkull,
  IconTrophy,
} from "./icons";
import type { ActivityEvent } from "@/lib/types";

const KIND_COLOR: Record<ActivityEvent["kind"], string> = {
  join: "text-brand-blue",
  attack: "text-brand-gold",
  power: "text-brand-gold",
  shield: "text-brand-blue",
  heal: "text-emerald-400",
  eliminate: "text-brand-gray",
  win: "text-brand-gold",
  system: "text-brand-gray",
};

const KIND_ICON: Record<ActivityEvent["kind"], React.ComponentType<{ className?: string }>> = {
  join: IconPlus,
  attack: IconCrosshair,
  power: IconBolt,
  shield: IconShield,
  heal: (props) => <IconHeart filled {...props} />,
  eliminate: IconSkull,
  win: IconTrophy,
  system: IconCrosshair,
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
      {events.slice(0, limit).map((event) => {
        const Icon = KIND_ICON[event.kind];
        return (
          <li
            key={event.id}
            className="text-sm border-b border-white/5 pb-2 last:border-none"
          >
            <span className={`inline-flex items-start gap-1.5 ${KIND_COLOR[event.kind]}`}>
              <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{event.message}</span>
            </span>
            <span className="block text-[0.65rem] text-brand-gray font-mono mt-0.5">
              tx {shortTxHash(event.txHash)}
            </span>
          </li>
        );
      })}
      {events.length === 0 && (
        <li className="text-sm text-brand-gray">No onchain activity yet.</li>
      )}
    </ul>
  );
}
