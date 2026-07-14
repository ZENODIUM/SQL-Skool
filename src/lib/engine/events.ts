import type { CellValue, RowEvent, StageKind, TableSnapshot } from "./types";

function rowKey(cells: CellValue[]): string {
  return cells.map((c) => (c === null ? "∅" : String(c))).join("|");
}

function countMap(snapshot: TableSnapshot): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of snapshot.rows) {
    const k = rowKey(row.cells);
    map.set(k, (map.get(k) || 0) + 1);
  }
  return map;
}

export function diffEvents(
  kind: StageKind,
  before: TableSnapshot | undefined,
  after: TableSnapshot,
): RowEvent[] {
  if (!before) {
    return after.rows.map((r) => ({ kind: "keep" as const, rowId: r.id }));
  }

  if (kind === "order") {
    return after.rows.map((r, i) => ({
      kind: "reorder" as const,
      rowId: r.id,
      note: `position ${i + 1}`,
    }));
  }

  if (kind === "select" || kind === "group") {
    return after.rows.map((r) => ({ kind: "project" as const, rowId: r.id }));
  }

  const afterCounts = countMap(after);
  const events: RowEvent[] = [];

  const sameShape =
    before.columns.length === after.columns.length &&
    before.columns.every((c, i) => c === after.columns[i]);

  if (sameShape) {
    const remaining = new Map(afterCounts);
    for (const row of before.rows) {
      const k = rowKey(row.cells);
      const left = remaining.get(k) || 0;
      if (left > 0) {
        events.push({ kind: "keep", rowId: row.id });
        remaining.set(k, left - 1);
      } else {
        events.push({ kind: "drop", rowId: row.id });
      }
    }

    for (const row of after.rows) {
      if (row.cells.some((c) => c === null)) {
        events.push({ kind: "null_fill", rowId: row.id });
      }
    }
    return events;
  }

  if (kind === "join") {
    after.rows.forEach((r) => {
      events.push({
        kind: r.cells.some((c) => c === null) ? "null_fill" : "match",
        rowId: r.id,
      });
    });
    if (after.rows.length < before.rows.length) {
      const dropped = before.rows.length - after.rows.length;
      before.rows.slice(0, dropped).forEach((r) =>
        events.push({ kind: "drop", rowId: r.id }),
      );
    }
    return events;
  }

  if (after.rows.length < before.rows.length) {
    const keepN = after.rows.length;
    before.rows.forEach((r, i) => {
      events.push({ kind: i < keepN ? "keep" : "drop", rowId: r.id });
    });
    return events;
  }

  return after.rows.map((r) => ({ kind: "keep" as const, rowId: r.id }));
}
