"use client";

import { motion } from "framer-motion";
import type { RowEvent, TableSnapshot } from "@/lib/engine";

type Props = {
  snapshot: TableSnapshot;
  events?: RowEvent[];
  emphasize?: boolean;
  label?: string;
};

function statusForRow(
  rowId: string,
  events: RowEvent[] | undefined,
): RowEvent["kind"] | null {
  if (!events?.length) return null;
  const forRow = events.filter((e) => e.rowId === rowId);
  if (forRow.some((e) => e.kind === "drop")) return "drop";
  if (forRow.some((e) => e.kind === "null_fill")) return "null_fill";
  if (forRow.some((e) => e.kind === "match")) return "match";
  if (forRow.some((e) => e.kind === "reorder")) return "reorder";
  if (forRow.some((e) => e.kind === "keep")) return "keep";
  return forRow[0]?.kind ?? null;
}

const rowClass: Record<string, string> = {
  keep: "bg-[var(--keep)]/15",
  drop: "bg-[var(--drop)]/20 opacity-45 line-through",
  match: "bg-[var(--match)]/20",
  null_fill: "bg-[var(--null)]/25",
  reorder: "bg-[var(--accent)]/10",
  project: "bg-[var(--accent)]/10",
  group_into: "bg-[var(--accent)]/15",
};

function uniqueColumnLabels(columns: string[]): string[] {
  const seen = new Map<string, number>();
  return columns.map((col) => {
    const count = (seen.get(col) || 0) + 1;
    seen.set(col, count);
    return count === 1 ? col : `${col}_${count}`;
  });
}

export function DataTable({ snapshot, events, emphasize, label }: Props) {
  const columnLabels = uniqueColumnLabels(snapshot.columns);

  return (
    <div
      className={`overflow-hidden rounded-sm border ${
        emphasize
          ? "border-[var(--accent)] shadow-[0_0_0_1px_var(--accent)]"
          : "border-[var(--line)]"
      } bg-[var(--panel)]`}
    >
      <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2">
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
          {label || snapshot.name}
        </span>
        <span className="font-mono text-xs text-[var(--muted)]">
          {snapshot.rows.length} rows
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-[var(--panel-2)]">
              {columnLabels.map((col, colIndex) => (
                <th
                  key={`col-${colIndex}-${col}`}
                  className="border-b border-[var(--line)] px-3 py-2 font-mono text-xs font-medium text-[var(--ink)]"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {snapshot.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(snapshot.columns.length, 1)}
                  className="px-3 py-4 text-center text-[var(--muted)]"
                >
                  No rows
                </td>
              </tr>
            ) : (
              snapshot.rows.map((row, idx) => {
                const status = statusForRow(row.id, events);
                return (
                  <motion.tr
                    key={`${snapshot.name}-${idx}-${row.id}`}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.25 }}
                    className={status ? rowClass[status] || "" : undefined}
                  >
                    {row.cells.map((cell, i) => (
                      <td
                        key={`${snapshot.name}-r${idx}-c${i}`}
                        className="border-b border-[var(--line)] px-3 py-1.5 font-mono text-[13px] text-[var(--ink)]"
                      >
                        {cell === null ? (
                          <span className="italic text-[var(--null)]">NULL</span>
                        ) : (
                          String(cell)
                        )}
                      </td>
                    ))}
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
