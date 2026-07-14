"use client";

import type { Stage } from "@/lib/engine";

type Props = {
  stages: Stage[];
  activeIndex: number;
  onSelect: (index: number) => void;
};

export function PipelineFlow({ stages, activeIndex, onSelect }: Props) {
  return (
    <div className="overflow-x-auto rounded-sm border border-[var(--line)] bg-[var(--panel-2)] p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Logical pipeline
      </div>
      <div className="mt-3 flex min-w-max items-stretch gap-1">
        {stages.map((stage, index) => {
          const prev = index > 0 ? stages[index - 1].output.rows.length : null;
          const curr = stage.output.rows.length;
          const delta =
            prev === null ? null : curr - prev;
          const active = index === activeIndex;
          return (
            <div key={stage.id} className="flex items-center gap-1">
              {index > 0 && (
                <div className="px-1 font-mono text-xs text-[var(--muted)]">→</div>
              )}
              <button
                type="button"
                onClick={() => onSelect(index)}
                className={`min-w-[7.5rem] border px-2 py-2 text-left transition ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] hover:border-[var(--accent)]"
                }`}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] opacity-80">
                  {stage.keyword}
                </div>
                <div className="font-mono text-sm tabular-nums">
                  {curr} rows
                  {delta !== null && delta !== 0 && (
                    <span className={`ml-1 text-[10px] ${delta > 0 ? "opacity-90" : "opacity-90"}`}>
                      ({delta > 0 ? `+${delta}` : delta})
                    </span>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
