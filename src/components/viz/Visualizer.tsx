"use client";

import { useEffect, useMemo, useState } from "react";
import { visualize, type Stage, type TableSet, type VisualizeResult } from "@/lib/engine";
import { DataTable } from "./DataTable";
import { EventLegend } from "./EventLegend";
import { PipelineFlow } from "./PipelineFlow";
import { Scrubber } from "./Scrubber";
import { SqlHighlight } from "./SqlHighlight";
import { StageRail } from "./StageRail";

type Props = {
  tableSet: TableSet;
  sql: string;
  narrationHints?: Record<string, string>;
  title?: string;
  summary?: string;
};

type TraceState = {
  key: string;
  loading: boolean;
  error: string | null;
  result: VisualizeResult | null;
  index: number;
  playing: boolean;
};

export function Visualizer({
  tableSet,
  sql,
  narrationHints,
  title,
  summary,
}: Props) {
  const traceKey = useMemo(
    () =>
      JSON.stringify({
        id: tableSet.id,
        sql,
        narrationHints: narrationHints ?? null,
      }),
    [tableSet.id, sql, narrationHints],
  );

  const [state, setState] = useState<TraceState>({
    key: traceKey,
    loading: true,
    error: null,
    result: null,
    index: 0,
    playing: true,
  });

  if (state.key !== traceKey) {
    setState({
      key: traceKey,
      loading: true,
      error: null,
      result: null,
      index: 0,
      playing: true,
    });
  }

  useEffect(() => {
    let cancelled = false;
    visualize(tableSet, sql, { narrationHints })
      .then((res) => {
        if (!cancelled) {
          setState((prev) =>
            prev.key !== traceKey
              ? prev
              : {
                  ...prev,
                  loading: false,
                  error: null,
                  result: res,
                  index: 0,
                  playing: true,
                },
          );
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState((prev) =>
            prev.key !== traceKey
              ? prev
              : {
                  ...prev,
                  loading: false,
                  error: err instanceof Error ? err.message : String(err),
                  result: null,
                },
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tableSet, sql, narrationHints, traceKey]);

  const stages = state.result?.stages ?? [];
  const max = stages.length - 1;
  const active: Stage | undefined = stages[state.index];

  useEffect(() => {
    if (!state.playing || max < 0) return;
    const id = window.setInterval(() => {
      setState((prev) => {
        if (!prev.playing) return prev;
        if (prev.index >= max) {
          return { ...prev, playing: false };
        }
        return { ...prev, index: prev.index + 1 };
      });
    }, 1600);
    return () => window.clearInterval(id);
  }, [state.playing, max]);

  const schemaPreview = useMemo(
    () =>
      tableSet.tables.map((t) => ({
        name: t.name,
        columns: t.columns.map((c) => c.name).join(", "),
        rows: t.rows.length,
      })),
    [tableSet],
  );

  if (state.loading) {
    return (
      <div className="rounded-sm border border-[var(--line)] bg-[var(--panel)] p-8 text-center font-mono text-sm text-[var(--muted)]">
        Tracing query stages…
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="rounded-sm border border-[var(--drop)] bg-[var(--panel)] p-6 text-[var(--drop)]">
        {state.error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {(title || summary) && (
        <header className="space-y-2">
          {title && (
            <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)] md:text-4xl">
              {title}
            </h1>
          )}
          {summary && <p className="max-w-2xl text-[var(--muted)]">{summary}</p>}
        </header>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        {schemaPreview.map((t) => (
          <div
            key={t.name}
            className="rounded-sm border border-[var(--line)] bg-[var(--panel)] px-3 py-2"
          >
            <div className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
              Table
            </div>
            <div className="font-mono text-sm text-[var(--ink)]">{t.name}</div>
            <div className="truncate font-mono text-xs text-[var(--muted)]">
              {t.columns} · {t.rows} rows
            </div>
          </div>
        ))}
      </div>

      <SqlHighlight sql={sql} activeKeyword={active?.keyword} />

      {stages.length > 0 ? (
        <>
          <PipelineFlow
            stages={stages}
            activeIndex={state.index}
            onSelect={(index) => setState((prev) => ({ ...prev, index, playing: false }))}
          />
          <StageRail
            stages={stages}
            activeIndex={state.index}
            onSelect={(index) => setState((prev) => ({ ...prev, index, playing: false }))}
          />
          <Scrubber
            index={state.index}
            max={max}
            playing={state.playing}
            onChange={(index) => setState((prev) => ({ ...prev, index, playing: false }))}
            onTogglePlay={() =>
              setState((prev) => ({ ...prev, playing: !prev.playing }))
            }
            onStep={(d) =>
              setState((prev) => ({
                ...prev,
                index: Math.min(max, Math.max(0, prev.index + d)),
                playing: false,
              }))
            }
          />
          <EventLegend />

          {active && (
            <section className="space-y-4 rounded-sm border border-[var(--line)] bg-[var(--panel)] p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <div className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--accent)]">
                    Keyword · {active.keyword}
                  </div>
                  <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                    {active.title}
                  </h2>
                </div>
                <div className="font-mono text-xs text-[var(--muted)]">
                  Logical step {state.index + 1}
                  {active.inputs[0] && (
                    <span className="ml-2">
                      {active.inputs[active.inputs.length - 1].rows.length} →{" "}
                      {active.output.rows.length} rows
                    </span>
                  )}
                </div>
              </div>
              <p className="max-w-3xl text-[15px] leading-relaxed text-[var(--ink)]">
                {active.narration}
              </p>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                    Input
                  </div>
                  {active.inputs.length ? (
                    active.inputs.map((input, inputIndex) => (
                      <DataTable
                        key={`input-${inputIndex}-${input.name}`}
                        snapshot={input}
                        events={active.rowEvents}
                        label={input.name}
                      />
                    ))
                  ) : (
                    <div className="text-sm text-[var(--muted)]">No prior intermediate</div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                    Intermediate result
                  </div>
                  <DataTable
                    snapshot={active.output}
                    events={active.rowEvents}
                    emphasize
                    label={active.keyword}
                  />
                </div>
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="rounded-sm border border-[var(--line)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
          No stages visualized for this query. Showing final result below.
        </div>
      )}

      {state.result && (
        <section className="space-y-2">
          <h3 className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
            Final result
          </h3>
          <DataTable snapshot={state.result.final} label="result" emphasize />
        </section>
      )}

      {state.result &&
        (state.result.warnings.length > 0 || state.result.unsupported.length > 0) && (
          <div className="space-y-1 font-mono text-xs text-[var(--muted)]">
            {[...state.result.warnings, ...state.result.unsupported].map((w) => (
              <div key={w}>Note: {w}</div>
            ))}
          </div>
        )}
    </div>
  );
}
