"use client";

import type { Stage } from "@/lib/engine";

type Props = {
  stages: Stage[];
  activeIndex: number;
  onSelect: (index: number) => void;
};

export function StageRail({ stages, activeIndex, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {stages.map((stage, index) => {
        const active = index === activeIndex;
        return (
          <button
            key={stage.id}
            type="button"
            onClick={() => onSelect(index)}
            className={`rounded-sm border px-3 py-1.5 font-mono text-xs tracking-wide transition ${
              active
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] hover:border-[var(--accent)]"
            }`}
          >
            <span className="opacity-70">{index + 1}.</span> {stage.keyword}
            <span className="ml-2 opacity-70">{stage.output.rows.length}</span>
          </button>
        );
      })}
    </div>
  );
}
