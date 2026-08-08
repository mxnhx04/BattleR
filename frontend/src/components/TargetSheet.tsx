import { HpHearts } from "./HpHearts";
import type { Player } from "@/lib/types";

export function TargetSheet({
  title,
  targets,
  onSelect,
  onCancel,
}: {
  title: string;
  targets: Player[];
  onSelect: (id: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-6">
      <div className="w-full max-w-sm bg-brand-charcoal border border-white/10 rounded-xl p-5 max-h-[80vh] overflow-y-auto">
        <div className="font-display text-2xl tracking-wide mb-4 text-center">
          {title}
        </div>
        <div className="flex flex-col gap-2">
          {targets.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-left hover:border-brand-orange hover:bg-brand-orange/10 transition-colors"
            >
              <span className="font-display text-lg tracking-wide">
                {t.name}
              </span>
              <HpHearts hp={t.hp} maxHp={t.maxHp} size="sm" />
            </button>
          ))}
          {targets.length === 0 && (
            <div className="text-brand-gray text-sm text-center py-4">
              No living opponents left.
            </div>
          )}
        </div>
        <button
          onClick={onCancel}
          className="mt-4 w-full text-center text-xs tracking-[0.2em] uppercase text-brand-gray hover:text-white py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
