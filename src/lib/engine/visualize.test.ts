import { describe, expect, it } from "vitest";
import { getTableSet } from "@/lib/content/tablesets";
import { stories } from "@/lib/content/stories";
import { planQuery, visualize } from "@/lib/engine";

describe("planQuery", () => {
  it("plans WHERE + SELECT stages", () => {
    const plan = planQuery(`SELECT id FROM orders WHERE status = 'paid'`);
    const keywords = plan.stages.map((s) => s.keyword);
    expect(keywords).toContain("FROM");
    expect(keywords).toContain("WHERE");
    expect(keywords).toContain("SELECT");
  });

  it("plans LEFT JOIN then WHERE", () => {
    const plan = planQuery(`
      SELECT c.name, o.id
      FROM customers c
      LEFT JOIN orders o ON c.id = o.customer_id
      WHERE o.id IS NOT NULL
    `);
    const keywords = plan.stages.map((s) => s.keyword);
    expect(keywords).toContain("LEFT JOIN");
    expect(keywords.indexOf("LEFT JOIN")).toBeLessThan(keywords.indexOf("WHERE"));
  });

  it("plans GROUP BY and HAVING", () => {
    const plan = planQuery(`
      SELECT user_id, COUNT(*) AS n
      FROM plays
      GROUP BY user_id
      HAVING COUNT(*) >= 2
    `);
    const keywords = plan.stages.map((s) => s.keyword);
    expect(keywords).toContain("GROUP BY");
    expect(keywords).toContain("HAVING");
  });

  it("plans CTE WITH stages", () => {
    const plan = planQuery(`
      WITH paid AS (
        SELECT id, total FROM orders WHERE status = 'paid'
      )
      SELECT total FROM paid
    `);
    expect(plan.stages.some((s) => s.keyword === "WITH")).toBe(true);
  });
});

describe("visualize", () => {
  it("filters paid orders", async () => {
    const result = await visualize(
      getTableSet("shop"),
      `SELECT id, status FROM orders WHERE status = 'paid'`,
    );
    expect(result.stages.length).toBeGreaterThan(0);
    expect(result.final.rows.every((r) => r.cells[1] === "paid")).toBe(true);
    expect(result.final.rows.length).toBe(4);
  });

  it("shows LEFT JOIN keeps unmatched customers before WHERE", async () => {
    const result = await visualize(
      getTableSet("shop"),
      `SELECT c.name, o.id AS order_id
       FROM customers c
       LEFT JOIN orders o ON c.id = o.customer_id
       WHERE o.id IS NOT NULL`,
    );
    const joinStage = result.stages.find((s) => s.keyword === "LEFT JOIN");
    const whereStage = result.stages.find((s) => s.keyword === "WHERE");
    expect(joinStage).toBeTruthy();
    expect(whereStage).toBeTruthy();
    expect(joinStage!.output.rows.length).toBeGreaterThan(
      whereStage!.output.rows.length,
    );
  });

  it("runs every curated story without throwing", async () => {
    for (const story of stories) {
      const result = await visualize(getTableSet(story.tableSetId), story.sql, {
        narrationHints: story.narrationHints,
      });
      expect(result.final).toBeTruthy();
      expect(
        result.stages.length > 0 || result.warnings.length > 0,
        `story ${story.id} should produce stages or warnings`,
      ).toBe(true);
    }
  });

  it("aggregates with HAVING", async () => {
    const result = await visualize(
      getTableSet("streams"),
      `SELECT user_id, COUNT(*) AS play_count
       FROM plays
       GROUP BY user_id
       HAVING COUNT(*) >= 2`,
    );
    expect(result.final.rows.length).toBe(2);
    const whereLike = result.stages.find((s) => s.keyword === "HAVING");
    expect(whereLike).toBeTruthy();
  });
});
