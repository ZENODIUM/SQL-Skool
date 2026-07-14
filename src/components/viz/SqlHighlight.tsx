"use client";

const KEYWORDS =
  /\b(WITH|SELECT|DISTINCT|FROM|INNER|LEFT|RIGHT|FULL|CROSS|JOIN|ON|WHERE|GROUP BY|HAVING|ORDER BY|LIMIT|OFFSET|AS|AND|OR|NOT|IS|NULL|IN|EXISTS|UNION|ALL|ASC|DESC|CASE|WHEN|THEN|ELSE|END|OVER)\b/gi;

type Props = {
  sql: string;
  activeKeyword?: string;
};

export function SqlHighlight({ sql, activeKeyword }: Props) {
  const active = (activeKeyword || "").toUpperCase();
  const parts: { text: string; isKw: boolean; isActive: boolean }[] = [];
  let last = 0;
  const re = new RegExp(KEYWORDS.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(sql))) {
    if (match.index > last) {
      parts.push({ text: sql.slice(last, match.index), isKw: false, isActive: false });
    }
    const text = match[0];
    const upper = text.toUpperCase();
    const isActive =
      Boolean(active) &&
      (active === upper ||
        active.includes(upper) ||
        (active === "GROUP BY" && upper === "GROUP") ||
        (active === "GROUP BY" && upper === "BY") ||
        (active === "ORDER BY" && upper === "ORDER") ||
        (active === "ORDER BY" && upper === "BY") ||
        (active === "LIMIT / OFFSET" && (upper === "LIMIT" || upper === "OFFSET")) ||
        (active.endsWith("JOIN") && (upper === "JOIN" || active.startsWith(upper))));
    parts.push({ text, isKw: true, isActive });
    last = match.index + text.length;
  }
  if (last < sql.length) {
    parts.push({ text: sql.slice(last), isKw: false, isActive: false });
  }

  return (
    <pre className="overflow-x-auto whitespace-pre-wrap rounded-sm border border-[var(--line)] bg-[var(--panel-2)] p-4 font-mono text-[13px] leading-relaxed text-[var(--ink)]">
      {parts.map((p, i) =>
        p.isKw ? (
          <span
            key={i}
            className={
              p.isActive
                ? "rounded-sm bg-[var(--accent)] px-0.5 font-semibold text-white"
                : "font-semibold text-[var(--accent-2)]"
            }
          >
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </pre>
  );
}
