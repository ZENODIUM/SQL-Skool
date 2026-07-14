"use client";

const items = [
  { key: "keep", label: "Keep", className: "bg-[var(--keep)]/25 border-[var(--keep)]" },
  { key: "drop", label: "Drop", className: "bg-[var(--drop)]/25 border-[var(--drop)]" },
  { key: "match", label: "Match", className: "bg-[var(--match)]/25 border-[var(--match)]" },
  { key: "null", label: "NULL fill", className: "bg-[var(--null)]/25 border-[var(--null)]" },
  { key: "reorder", label: "Reorder", className: "bg-[var(--accent)]/15 border-[var(--accent)]" },
];

export function EventLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.key}
          className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink)] ${item.className}`}
        >
          {item.label}
        </span>
      ))}
    </div>
  );
}
