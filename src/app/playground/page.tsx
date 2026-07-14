"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Visualizer } from "@/components/viz/Visualizer";
import { listStories } from "@/lib/content/stories";
import { getTableSet, tableSets } from "@/lib/content/tablesets";

const Monaco = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const DEFAULT_SQL = `SELECT c.name, o.id AS order_id, o.total
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.id IS NOT NULL`;

export default function PlaygroundPage() {
  const stories = listStories();
  const [tableSetId, setTableSetId] = useState("shop");
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [runSql, setRunSql] = useState(DEFAULT_SQL);

  const tableSet = useMemo(() => getTableSet(tableSetId), [tableSetId]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)] md:text-4xl">
          Playground
        </h1>
        <p className="max-w-2xl text-[var(--muted)]">
          Edit SQL against a curated tiny schema. The engine traces each keyword
          into intermediate tables.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
          Schema
          <select
            value={tableSetId}
            onChange={(e) => setTableSetId(e.target.value)}
            className="ml-2 border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[var(--ink)]"
          >
            {Object.values(tableSets).map((ts) => (
              <option key={ts.id} value={ts.id}>
                {ts.name}
              </option>
            ))}
          </select>
        </label>
        <label className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--muted)]">
          Load story
          <select
            defaultValue=""
            onChange={(e) => {
              const story = stories.find((s) => s.id === e.target.value);
              if (!story) return;
              setTableSetId(story.tableSetId);
              setSql(story.sql);
              setRunSql(story.sql);
            }}
            className="ml-2 max-w-[240px] border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[var(--ink)]"
          >
            <option value="" disabled>
              Choose…
            </option>
            {stories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setRunSql(sql)}
          className="border border-[var(--accent)] bg-[var(--accent)] px-4 py-1.5 font-mono text-xs uppercase tracking-[0.12em] text-white"
        >
          Trace query
        </button>
      </div>

      <div className="overflow-hidden rounded-sm border border-[var(--line)]">
        <Monaco
          height="220px"
          language="sql"
          theme="vs-light"
          value={sql}
          onChange={(v) => setSql(v ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "IBM Plex Mono, monospace",
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>

      <Visualizer key={`${tableSetId}:${runSql}`} tableSet={tableSet} sql={runSql} />
    </div>
  );
}
