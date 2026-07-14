import type { Story } from "@/lib/engine";
import { getTableSet } from "./tablesets";

export const stories: Story[] = [
  {
    id: "where-paid",
    title: "WHERE keeps matching rows",
    summary: "Watch rows survive or fade when a predicate runs.",
    teaches: ["FROM", "WHERE", "SELECT"],
    tableSetId: "shop",
    sql: `SELECT id, customer_id, total, status
FROM orders
WHERE status = 'paid'`,
    narrationHints: {
      WHERE: "Only paid orders survive — pending row 103 is eliminated.",
    },
  },
  {
    id: "inner-join",
    title: "INNER JOIN keeps matches only",
    summary: "Unmatched customers and orphan orders disappear.",
    teaches: ["FROM", "INNER JOIN", "SELECT"],
    tableSetId: "shop",
    sql: `SELECT c.name, o.id AS order_id, o.total
FROM customers c
INNER JOIN orders o ON c.id = o.customer_id`,
    narrationHints: {
      "INNER JOIN":
        "Drew & Eve have no orders; order 105 has no customer — both sides drop unmatched rows.",
    },
  },
  {
    id: "left-join-where-trap",
    title: "LEFT JOIN then WHERE trap",
    summary: "A WHERE on the right key turns an outer join into an inner join.",
    teaches: ["FROM", "LEFT JOIN", "WHERE", "SELECT"],
    tableSetId: "shop",
    sql: `SELECT c.name, o.id AS order_id, o.total
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.id IS NOT NULL`,
    narrationHints: {
      "LEFT JOIN":
        "Left join keeps Drew & Eve with NULL order columns — unmatched left rows survive.",
      WHERE:
        "Filtering o.id IS NOT NULL removes those NULL-padded rows — the LEFT JOIN behaves like INNER.",
    },
  },
  {
    id: "left-join",
    title: "LEFT JOIN keeps the left side",
    summary: "Customers without orders stay, with NULL order fields.",
    teaches: ["FROM", "LEFT JOIN", "SELECT"],
    tableSetId: "shop",
    sql: `SELECT c.name, o.id AS order_id, o.total
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id`,
  },
  {
    id: "cross-join",
    title: "CROSS JOIN multiplies rows",
    summary: "Every customer paired with every product — watch the blow-up.",
    teaches: ["FROM", "CROSS JOIN", "SELECT"],
    tableSetId: "shop",
    sql: `SELECT c.name, p.name AS product
FROM customers c
CROSS JOIN products p`,
    narrationHints: {
      "CROSS JOIN": "5 customers × 5 products = 25 rows. Forgetting ON can feel like this.",
    },
  },
  {
    id: "group-by-having",
    title: "GROUP BY then HAVING",
    summary: "Buckets form, aggregates collapse, then whole groups are filtered.",
    teaches: ["FROM", "GROUP BY", "HAVING", "SELECT"],
    tableSetId: "streams",
    sql: `SELECT user_id, COUNT(*) AS play_count, SUM(seconds) AS listened
FROM plays
GROUP BY user_id
HAVING COUNT(*) >= 2`,
    narrationHints: {
      "GROUP BY": "Plays pile by user_id, then each pile becomes one summary row.",
      HAVING: "Users with fewer than 2 plays are removed as whole groups.",
    },
  },
  {
    id: "cte-recent",
    title: "WITH builds a temp table",
    summary: "A CTE materializes first, then the outer query reads it.",
    teaches: ["WITH", "FROM", "WHERE", "SELECT"],
    tableSetId: "shop",
    sql: `WITH paid AS (
  SELECT id, customer_id, total
  FROM orders
  WHERE status = 'paid'
)
SELECT customer_id, total
FROM paid
WHERE total >= 50`,
    narrationHints: {
      WITH: "The paid CTE is built first — a named intermediate you can query like a table.",
    },
  },
  {
    id: "distinct-products",
    title: "DISTINCT collapses duplicates",
    summary: "Duplicate category/name pairs shrink to unique rows.",
    teaches: ["FROM", "SELECT", "DISTINCT"],
    tableSetId: "shop",
    sql: `SELECT DISTINCT name, category
FROM products`,
    narrationHints: {
      DISTINCT: "Two Mug/home rows collapse into one distinct pair.",
    },
  },
  {
    id: "order-limit",
    title: "ORDER BY then LIMIT",
    summary: "Rows reorder, then only the top slice remains.",
    teaches: ["FROM", "SELECT", "ORDER BY", "LIMIT"],
    tableSetId: "shop",
    sql: `SELECT id, total, status
FROM orders
ORDER BY total DESC
LIMIT 3`,
  },
  {
    id: "city-spend",
    title: "Join + group by city",
    summary: "Join customers to orders, then aggregate spend per city.",
    teaches: ["FROM", "INNER JOIN", "GROUP BY", "SELECT"],
    tableSetId: "shop",
    sql: `SELECT c.city, SUM(o.total) AS spend
FROM customers c
INNER JOIN orders o ON c.id = o.customer_id
GROUP BY c.city`,
  },
  {
    id: "multi-join",
    title: "Three-table JOIN chain",
    summary: "Watch the intermediate widen as each join adds another table.",
    teaches: ["FROM", "INNER JOIN", "SELECT"],
    tableSetId: "shop",
    sql: `SELECT c.name, o.id AS order_id, oi.qty, p.name AS product
FROM customers c
INNER JOIN orders o ON c.id = o.customer_id
INNER JOIN order_items oi ON o.id = oi.order_id
INNER JOIN products p ON oi.product_id = p.id`,
    narrationHints: {
      "INNER JOIN":
        "Each JOIN grows the intermediate: customers→orders→line items→product names.",
    },
  },
  {
    id: "where-and",
    title: "WHERE with AND",
    summary: "Compound predicates filter in one pass — both conditions must pass.",
    teaches: ["FROM", "WHERE", "SELECT"],
    tableSetId: "shop",
    sql: `SELECT id, total, status
FROM orders
WHERE status = 'paid' AND total >= 50`,
    narrationHints: {
      WHERE: "Both status='paid' and total>=50 must be true — only 102, 104, and 105 survive.",
    },
  },
  {
    id: "in-subquery",
    title: "WHERE IN (subquery)",
    summary: "Inner query builds a list; outer WHERE keeps matching customers.",
    teaches: ["SUBQUERY", "FROM", "WHERE", "SELECT"],
    tableSetId: "shop",
    sql: `SELECT id, name, city
FROM customers
WHERE id IN (
  SELECT customer_id
  FROM orders
  WHERE status = 'paid'
)`,
    narrationHints: {
      SUBQUERY: "Inner SELECT builds the customer_id list from paid orders first.",
      WHERE: "Outer WHERE keeps customers whose id appears in that list.",
    },
  },
  {
    id: "exists-customers",
    title: "WHERE EXISTS",
    summary: "Keep customers that have at least one related order.",
    teaches: ["FROM", "WHERE", "SELECT", "SUBQUERY"],
    tableSetId: "shop",
    sql: `SELECT c.id, c.name
FROM customers c
WHERE EXISTS (
  SELECT 1
  FROM orders o
  WHERE o.customer_id = c.id
)`,
    narrationHints: {
      WHERE: "EXISTS keeps Ava, Ben, Cara — Drew & Eve have no related orders.",
    },
  },
  {
    id: "union-cities",
    title: "UNION ALL stacks branches",
    summary: "Each branch computes a result, then rows are stacked together.",
    teaches: ["UNION ALL", "WHERE", "SELECT"],
    tableSetId: "shop",
    sql: `SELECT name, city FROM customers WHERE city = 'Austin'
UNION ALL
SELECT name, city FROM customers WHERE city = 'Boston'`,
    narrationHints: {
      "UNION ALL": "Branch rows are stacked — duplicates would be kept if values repeated.",
    },
  },
  {
    id: "limit-offset",
    title: "ORDER BY + LIMIT OFFSET",
    summary: "Sort, skip rows, then keep a page slice.",
    teaches: ["FROM", "SELECT", "ORDER BY", "LIMIT / OFFSET"],
    tableSetId: "shop",
    sql: `SELECT id, total, status
FROM orders
ORDER BY total DESC
LIMIT 2 OFFSET 1`,
    narrationHints: {
      "LIMIT / OFFSET": "Skip the highest total, then keep the next 2 rows.",
    },
  },
  {
    id: "select-case",
    title: "SELECT with CASE",
    summary: "Projection can compute new columns from existing values.",
    teaches: ["FROM", "SELECT"],
    tableSetId: "shop",
    sql: `SELECT id, total,
  CASE
    WHEN total >= 70 THEN 'high'
    WHEN total >= 40 THEN 'mid'
    ELSE 'low'
  END AS band
FROM orders`,
    narrationHints: {
      SELECT: "CASE builds a new band column while keeping the same row count.",
    },
  },
  {
    id: "window-running",
    title: "Window SUM over orders",
    summary: "Window functions compute across rows without collapsing groups.",
    teaches: ["FROM", "SELECT", "ORDER BY"],
    tableSetId: "shop",
    sql: `SELECT id, customer_id, total,
  SUM(total) OVER (ORDER BY id) AS running_total
FROM orders
ORDER BY id`,
    narrationHints: {
      SELECT:
        "SUM(...) OVER keeps one output row per input row — unlike GROUP BY which collapses.",
    },
  },
];

export function getStory(id: string): Story | undefined {
  return stories.find((s) => s.id === id);
}

export function getStoryWithTableSet(id: string) {
  const story = getStory(id);
  if (!story) return null;
  return { story, tableSet: getTableSet(story.tableSetId) };
}

export function listStories() {
  return stories;
}
