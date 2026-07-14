import { getSqlJs, loadTableSet, querySnapshot, tableSnapshotFromDef } from "./db";
import { diffEvents } from "./events";
import { narrateStage } from "./narrate";
import { planQuery } from "./plan";
import type { Stage, TableSet, TableSnapshot, VisualizeResult } from "./types";

export type VisualizeOptions = {
  narrationHints?: Record<string, string>;
};

function renameSnapshot(snap: TableSnapshot, name: string): TableSnapshot {
  return {
    ...snap,
    name,
    rows: snap.rows.map((r, i) => ({ ...r, id: `${name}-r${i}` })),
  };
}

export async function visualize(
  tableSet: TableSet,
  sql: string,
  options: VisualizeOptions = {},
): Promise<VisualizeResult> {
  const SQL = await getSqlJs();
  const db = loadTableSet(SQL, tableSet);
  const plan = planQuery(sql);
  const warnings = [...plan.warnings];
  const unsupported = [...plan.unsupported];
  const stages: Stage[] = [];

  let previous: TableSnapshot | undefined;

  try {
    for (const planned of plan.stages) {
      let output: TableSnapshot;
      try {
        output = renameSnapshot(
          querySnapshot(db, planned.materializeSql, planned.id),
          planned.keyword,
        );
        if (planned.materializeAs) {
          const table = planned.materializeAs.replace(/"/g, "");
          db.run(`DROP TABLE IF EXISTS "${table}"`);
          db.run(`CREATE TABLE "${table}" AS ${planned.materializeSql}`);
        }
      } catch (err) {
        unsupported.push(
          `Stage ${planned.keyword} failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        continue;
      }

      const inputs: TableSnapshot[] = [];
      if (planned.inputTableNames.length) {
        for (const name of planned.inputTableNames) {
          const fromDef = tableSnapshotFromDef(tableSet, name);
          if (fromDef.rows.length || fromDef.columns.length) {
            inputs.push(fromDef);
          } else {
            try {
              inputs.push(
                renameSnapshot(
                  querySnapshot(db, `SELECT * FROM "${name}"`, name),
                  name,
                ),
              );
            } catch {
              // ignore missing
            }
          }
        }
      } else if (previous) {
        inputs.push(previous);
      }

      const compareAgainst = inputs[inputs.length - 1] || previous;
      const rowEvents = diffEvents(planned.kind, compareAgainst, output);
      const narration = narrateStage(
        planned,
        compareAgainst,
        output,
        rowEvents,
        options.narrationHints,
      );

      stages.push({
        id: planned.id,
        kind: planned.kind,
        keyword: planned.keyword,
        title: planned.title,
        narration,
        inputs,
        output,
        rowEvents,
        sqlFragment: planned.materializeSql,
      });

      previous = output;
    }

    let final: TableSnapshot;
    try {
      final = renameSnapshot(querySnapshot(db, plan.normalizedSql, "final"), "result");
    } catch (err) {
      final = previous || { name: "result", columns: [], rows: [] };
      warnings.push(
        `Final query failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (!stages.length && final.rows.length) {
      warnings.push("Showing final result only — stages could not be built.");
    }

    return { stages, final, warnings, unsupported };
  } finally {
    db.close();
  }
}
