import { describe, expect, it } from "vitest";
import { stories } from "@/lib/content/stories";
import { getTableSet } from "@/lib/content/tablesets";
import { visualize } from "@/lib/engine";

/** Expected keyword presence + final row count for every curated story */
const expectations: Record<
  string,
  { keywords: string[]; finalRows: number; minStages?: number }
> = {
  "where-paid": { keywords: ["FROM", "WHERE", "SELECT"], finalRows: 4 },
  "inner-join": { keywords: ["FROM", "INNER JOIN", "SELECT"], finalRows: 4 },
  "left-join-where-trap": {
    keywords: ["FROM", "LEFT JOIN", "WHERE", "SELECT"],
    finalRows: 4,
  },
  "left-join": { keywords: ["FROM", "LEFT JOIN", "SELECT"], finalRows: 6 },
  "cross-join": { keywords: ["FROM", "CROSS JOIN", "SELECT"], finalRows: 25 },
  "group-by-having": {
    keywords: ["FROM", "GROUP BY", "HAVING"],
    finalRows: 2,
  },
  "cte-recent": { keywords: ["WITH", "FROM", "WHERE", "SELECT"], finalRows: 3 },
  "distinct-products": { keywords: ["FROM", "DISTINCT"], finalRows: 4 },
  "order-limit": { keywords: ["FROM", "ORDER BY", "LIMIT"], finalRows: 3 },
  "city-spend": { keywords: ["FROM", "INNER JOIN", "GROUP BY"], finalRows: 2 },
  "multi-join": {
    keywords: ["FROM", "INNER JOIN", "SELECT"],
    finalRows: 5,
    minStages: 4,
  },
  "where-and": { keywords: ["FROM", "WHERE", "SELECT"], finalRows: 3 },
  "in-subquery": {
    keywords: ["SUBQUERY", "FROM", "WHERE", "SELECT"],
    finalRows: 2,
  },
  "exists-customers": { keywords: ["FROM", "WHERE", "SELECT"], finalRows: 3 },
  "union-cities": { keywords: ["UNION ALL"], finalRows: 4, minStages: 3 },
  "limit-offset": {
    keywords: ["FROM", "ORDER BY", "LIMIT / OFFSET"],
    finalRows: 2,
  },
  "select-case": { keywords: ["FROM", "SELECT"], finalRows: 5 },
  "window-running": { keywords: ["FROM", "SELECT", "ORDER BY"], finalRows: 5 },
};

describe("curated story visualizations", () => {
  it("has an expectation for every story", () => {
    for (const story of stories) {
      expect(expectations[story.id], `missing expectation for ${story.id}`).toBeTruthy();
    }
  });

  for (const story of stories) {
    it(`visualizes ${story.id}`, async () => {
      const exp = expectations[story.id];
      const result = await visualize(getTableSet(story.tableSetId), story.sql, {
        narrationHints: story.narrationHints,
      });

      expect(result.stages.length, `${story.id} should have stages`).toBeGreaterThan(0);
      if (exp.minStages) {
        expect(result.stages.length).toBeGreaterThanOrEqual(exp.minStages);
      }

      const keywords = result.stages.map((s) => s.keyword);
      for (const kw of exp.keywords) {
        expect(keywords, `${story.id} missing keyword ${kw}`).toContain(kw);
      }

      expect(result.final.rows.length, `${story.id} final row count`).toBe(
        exp.finalRows,
      );

      // Every stage should have narration + an output snapshot
      for (const stage of result.stages) {
        expect(stage.narration.length).toBeGreaterThan(10);
        expect(stage.output).toBeTruthy();
        expect(Array.isArray(stage.output.columns)).toBe(true);
      }
    });
  }

  it("LEFT JOIN trap drops rows after WHERE", async () => {
    const result = await visualize(
      getTableSet("shop"),
      stories.find((s) => s.id === "left-join-where-trap")!.sql,
    );
    const join = result.stages.find((s) => s.keyword === "LEFT JOIN")!;
    const where = result.stages.find((s) => s.keyword === "WHERE")!;
    expect(join.output.rows.length).toBeGreaterThan(where.output.rows.length);
  });

  it("IN subquery materializes inner list before outer WHERE", async () => {
    const result = await visualize(
      getTableSet("shop"),
      stories.find((s) => s.id === "in-subquery")!.sql,
    );
    const subIdx = result.stages.findIndex((s) => s.keyword === "SUBQUERY");
    const whereIdx = result.stages.findIndex((s) => s.keyword === "WHERE");
    expect(subIdx).toBeGreaterThanOrEqual(0);
    expect(whereIdx).toBeGreaterThan(subIdx);
  });

  it("UNION ALL merges branch row counts", async () => {
    const result = await visualize(
      getTableSet("shop"),
      stories.find((s) => s.id === "union-cities")!.sql,
    );
    const merge = result.stages.find((s) => s.keyword === "UNION ALL")!;
    expect(merge).toBeTruthy();
    expect(merge.output.rows.length).toBe(4);
  });

  it("multi-join grows through multiple INNER JOIN stages", async () => {
    const result = await visualize(
      getTableSet("shop"),
      stories.find((s) => s.id === "multi-join")!.sql,
    );
    const joins = result.stages.filter((s) => s.keyword === "INNER JOIN");
    expect(joins.length).toBeGreaterThanOrEqual(2);
  });
});
