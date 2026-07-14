import type { PlannedStage } from "./plan";
import type { RowEvent, TableSnapshot } from "./types";

const DEFAULTS: Record<string, string> = {
  FROM: "Start with every row in the source table. Nothing filtered yet.",
  "INNER JOIN":
    "Keep only row pairs whose join keys match. Unmatched rows from either side are dropped.",
  "LEFT JOIN":
    "Keep every left-table row. When the right side has no match, right columns become NULL.",
  "RIGHT JOIN":
    "Keep every right-table row. When the left side has no match, left columns become NULL.",
  "FULL JOIN":
    "Keep rows from both sides. Missing matches are NULL-padded on the other side.",
  "CROSS JOIN":
    "Pair every left row with every right row — row count multiplies.",
  WHERE: "Test each row against the predicate. Survivors stay; others are eliminated.",
  "GROUP BY": "Pile rows that share the same group key, then collapse each pile.",
  HAVING: "Filter whole groups after aggregation — not individual source rows.",
  SELECT: "Choose and compute the output columns from the current intermediate rows.",
  DISTINCT: "Collapse duplicate result rows into a unique set.",
  "ORDER BY": "Reorder the current rows — values do not change.",
  LIMIT: "Keep only the first N rows of the current result; the rest are cut.",
  "LIMIT / OFFSET": "Skip OFFSET rows, then keep the next LIMIT rows.",
  WITH: "Materialize a named temporary result, then treat it like a table.",
  SUBQUERY: "Run the inner query first — its result becomes a value list or probe set for the outer query.",
  UNION: "Stack branch results and remove duplicate rows across branches.",
  "UNION ALL": "Stack branch results and keep every row, including duplicates.",
  "BRANCH 1": "Compute the first result branch before the set operation.",
  "BRANCH 2": "Compute the next result branch before the set operation.",
};

export function narrateStage(
  planned: PlannedStage,
  input: TableSnapshot | undefined,
  output: TableSnapshot,
  events: RowEvent[],
  hints?: Record<string, string>,
): string {
  const key = planned.narrationHintKey || planned.keyword;
  const custom = hints?.[key] || hints?.[planned.keyword];
  if (custom) return custom;

  const base = DEFAULTS[planned.keyword] || DEFAULTS[key] || planned.title;
  const inCount = input?.rows.length;
  const outCount = output.rows.length;
  const dropped = events.filter((e) => e.kind === "drop").length;
  const matched = events.filter((e) => e.kind === "match").length;
  const nulls = events.filter((e) => e.kind === "null_fill").length;

  const stats: string[] = [];
  if (inCount !== undefined) stats.push(`${inCount} → ${outCount} rows`);
  else stats.push(`${outCount} rows`);
  if (dropped) stats.push(`${dropped} dropped`);
  if (matched) stats.push(`${matched} matched`);
  if (nulls) stats.push(`${nulls} NULL-filled`);

  return `${base} (${stats.join(", ")}).`;
}
