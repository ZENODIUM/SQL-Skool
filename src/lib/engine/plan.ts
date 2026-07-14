import { Parser, type Select } from "node-sql-parser";
import type { StageKind } from "./types";

type LooseWith = {
  name?: { value?: string; column?: string };
  stmt?: Select | { ast: Select };
};

export type PlannedStage = {
  id: string;
  kind: StageKind;
  keyword: string;
  title: string;
  /** SQL that materializes this stage's output as SELECT * style table */
  materializeSql: string;
  /** Optional source tables shown as inputs */
  inputTableNames: string[];
  narrationHintKey?: string;
  /** When set, register this stage's SQL as a temp table for later stages (CTEs) */
  materializeAs?: string;
};

const PARSE_DIALECTS = ["PostgreSQL", "MySQL", "SQLite"] as const;
const SQLIFY_OPTS = { database: "PostgreSQL" as const };

export type QueryPlan = {
  stages: PlannedStage[];
  unsupported: string[];
  warnings: string[];
  normalizedSql: string;
};

const parser = new Parser();

function stripTrailingSemicolon(sql: string): string {
  return sql.trim().replace(/;+\s*$/, "");
}

type SelectNode = Select & {
  _next?: SelectNode | null;
  set_op?: string | null;
};

function getSelectAst(sql: string): SelectNode | null {
  for (const database of PARSE_DIALECTS) {
    try {
      const ast = parser.astify(sql, { database });
      const node = Array.isArray(ast) ? ast[0] : ast;
      if (node && typeof node === "object" && "type" in node && node.type === "select") {
        return node as SelectNode;
      }
    } catch {
      // try next dialect — SQLite grammar misses CROSS JOIN / OVER
    }
  }
  return null;
}

function collectUnionChain(ast: SelectNode): { selects: SelectNode[]; ops: string[] } {
  const selects: SelectNode[] = [ast];
  const ops: string[] = [];
  let cur: SelectNode | null | undefined = ast;
  while (cur?._next) {
    ops.push((cur.set_op || "union").toUpperCase());
    selects.push(cur._next);
    cur = cur._next;
  }
  return { selects, ops };
}

type ExprNode = {
  type?: string;
  operator?: string;
  left?: ExprNode;
  right?: ExprNode;
  name?: { name?: { value?: string }[] };
  args?: { value?: unknown[] };
  ast?: Select;
  value?: unknown;
};

function findInSubqueries(expr: ExprNode | null | undefined, out: Select[] = []): Select[] {
  if (!expr || typeof expr !== "object") return out;
  if (
    expr.type === "binary_expr" &&
    (expr.operator === "IN" || expr.operator === "NOT IN") &&
    expr.right?.type === "expr_list" &&
    Array.isArray(expr.right.value)
  ) {
    for (const item of expr.right.value as ExprNode[]) {
      if (item?.ast?.type === "select") out.push(item.ast);
    }
  }
  if (expr.type === "function") {
    const fname = expr.name?.name?.[0]?.value?.toUpperCase();
    if (fname === "EXISTS" && Array.isArray(expr.args?.value)) {
      for (const item of expr.args!.value as ExprNode[]) {
        if (item?.ast?.type === "select") out.push(item.ast);
      }
    }
  }
  findInSubqueries(expr.left, out);
  findInSubqueries(expr.right, out);
  return out;
}

function joinTypeKeyword(join: { join?: string | null }): string {
  const j = (join.join || "INNER JOIN").toUpperCase();
  if (j.includes("LEFT")) return "LEFT JOIN";
  if (j.includes("RIGHT")) return "RIGHT JOIN";
  if (j.includes("FULL")) return "FULL JOIN";
  if (j.includes("CROSS")) return "CROSS JOIN";
  return "INNER JOIN";
}

type FromItem = {
  db?: string | null;
  table?: string | null;
  as?: string | null;
  join?: string | null;
  on?: unknown;
};

function fromTableName(from: FromItem | undefined): string | null {
  if (!from?.table) return null;
  return from.as || from.table;
}

function buildFromJoinSql(select: Select, upToJoinIndex: number): string {
  const from = select.from as FromItem[] | undefined;
  if (!from?.length) return "";

  const parts: string[] = [];
  const first = from[0];
  const firstName = first.table;
  if (!firstName) return "";
  parts.push(
    `${firstName}${first.as && first.as !== firstName ? ` AS ${first.as}` : ""}`,
  );

  for (let i = 1; i <= upToJoinIndex && i < from.length; i++) {
    const item = from[i];
    if (!item.table) continue;
    const jt = item.join || "INNER JOIN";
    const alias =
      item.as && item.as !== item.table ? ` AS ${item.as}` : "";
    let onSql = "";
    if (item.on) {
      try {
        onSql = ` ON ${parser.exprToSQL(item.on as never, SQLIFY_OPTS)}`;
      } catch {
        onSql = "";
      }
    }
    parts.push(`${jt} ${item.table}${alias}${onSql}`);
  }

  return parts.join(" ");
}

function whereSql(select: Select): string | null {
  if (!select.where) return null;
  try {
    return parser.exprToSQL(select.where as never, SQLIFY_OPTS);
  } catch {
    return null;
  }
}

function groupBySql(select: Select): string | null {
  const gb = select.groupby as { columns?: unknown[] } | unknown[] | null;
  if (!gb) return null;
  const cols = Array.isArray(gb) ? gb : gb.columns;
  if (!cols?.length) return null;
  try {
    return cols
      .map((c) => parser.exprToSQL(c as never, SQLIFY_OPTS))
      .join(", ");
  } catch {
    return null;
  }
}

function havingSql(select: Select): string | null {
  if (!select.having) return null;
  try {
    return parser.exprToSQL(select.having as never, SQLIFY_OPTS);
  } catch {
    return null;
  }
}

function orderBySql(select: Select): string | null {
  if (!select.orderby?.length) return null;
  try {
    return select.orderby
      .map((o) => {
        const expr = parser.exprToSQL(o.expr as never, SQLIFY_OPTS);
        return `${expr}${o.type ? ` ${o.type}` : ""}`;
      })
      .join(", ");
  } catch {
    return null;
  }
}

function limitInfo(select: Select): { limit?: string; offset?: string } {
  const lim = select.limit as
    | { seperator?: string; value: { value: number }[] }
    | null
    | undefined;
  if (!lim?.value?.length) return {};
  if (lim.value.length === 1) {
    return { limit: String(lim.value[0].value) };
  }
  // OFFSET x LIMIT y pattern sometimes
  return {
    offset: String(lim.value[0].value),
    limit: String(lim.value[1].value),
  };
}

function columnsSql(select: Select): string {
  try {
    const cols = select.columns as unknown;
    if (!cols) return "*";
    if (cols === "*") return "*";
    if (Array.isArray(cols)) {
      return cols
        .map((col: { as?: string; expr?: unknown }) => {
          if (col.as) {
            return `${parser.exprToSQL(col.expr as never, SQLIFY_OPTS)} AS ${col.as}`;
          }
          return parser.exprToSQL(col.expr as never, SQLIFY_OPTS);
        })
        .join(", ");
    }
    return "*";
  } catch {
    return "*";
  }
}

function hasDistinct(select: Select): boolean {
  return Boolean(select.distinct);
}

function planSelectBody(
  select: Select,
  prefix = "",
  cteNames: string[] = [],
): { stages: PlannedStage[]; unsupported: string[] } {
  const stages: PlannedStage[] = [];
  const unsupported: string[] = [];
  const from = select.from as FromItem[] | undefined;

  if (!from?.length) {
    unsupported.push("SELECT without FROM");
    return { stages, unsupported };
  }

  const base = from[0];
  const baseTable = base.table;
  if (!baseTable) {
    unsupported.push("Complex FROM (subquery) not fully visualized");
  }

  const baseAlias = fromTableName(base) || baseTable || "source";
  const baseFromSql = buildFromJoinSql(select, 0);

  stages.push({
    id: `${prefix}from`,
    kind: "from",
    keyword: "FROM",
    title: `FROM ${baseAlias}`,
    materializeSql: `SELECT * FROM ${baseFromSql}`,
    inputTableNames: baseTable ? [baseTable] : [],
    narrationHintKey: "FROM",
  });

  // Joins
  for (let i = 1; i < (from?.length || 0); i++) {
    const item = from![i];
    if (!item.table) {
      unsupported.push("Joined subquery not fully visualized");
      continue;
    }
    const keyword = joinTypeKeyword(item);
    const fromJoinSql = buildFromJoinSql(select, i);
    stages.push({
      id: `${prefix}join-${i}`,
      kind: "join",
      keyword,
      title: `${keyword} ${item.as || item.table}`,
      materializeSql: `SELECT * FROM ${fromJoinSql}`,
      inputTableNames: [
        ...(i === 1 && baseTable ? [baseTable] : []),
        item.table,
      ],
      narrationHintKey: keyword,
    });
  }

  const lastJoinIndex = Math.max(0, (from?.length || 1) - 1);
  const fromJoinSql = buildFromJoinSql(select, lastJoinIndex);
  const where = whereSql(select);
  let working = `SELECT * FROM ${fromJoinSql}`;

  // Nested IN / EXISTS subqueries — materialize their results first
  const nested = findInSubqueries(select.where as ExprNode | undefined);
  nested.forEach((sub, i) => {
    try {
      const subSql = parser.sqlify(sub, SQLIFY_OPTS);
      const subPlan = planSelectBody(sub, `${prefix}subq-${i}-`, cteNames);
      unsupported.push(...subPlan.unsupported);
      for (const s of subPlan.stages) {
        stages.push({
          ...s,
          kind: s.kind === "from" ? "subquery" : s.kind,
          keyword: s.kind === "from" ? "SUBQUERY" : s.keyword,
          title: `Subquery · ${s.title}`,
          narrationHintKey: s.kind === "from" ? "SUBQUERY" : s.narrationHintKey,
        });
      }
      stages.push({
        id: `${prefix}subq-${i}-ready`,
        kind: "subquery",
        keyword: "SUBQUERY",
        title: `Subquery result ready`,
        materializeSql: subSql,
        inputTableNames: [],
        narrationHintKey: "SUBQUERY",
      });
    } catch {
      unsupported.push(`Nested subquery ${i + 1} could not be visualized`);
    }
  });

  if (where) {
    working = `SELECT * FROM ${fromJoinSql} WHERE ${where}`;
    stages.push({
      id: `${prefix}where`,
      kind: "where",
      keyword: "WHERE",
      title: nested.length ? "WHERE using subquery" : "WHERE filter",
      materializeSql: working,
      inputTableNames: [],
      narrationHintKey: "WHERE",
    });
  }

  const groupBy = groupBySql(select);
  if (groupBy) {
    const having = havingSql(select);
    const selectList = columnsSql(select);
    // Materialize grouped rows with same select list when aggregates present
    working = `SELECT ${selectList} FROM ${fromJoinSql}${
      where ? ` WHERE ${where}` : ""
    } GROUP BY ${groupBy}`;
    stages.push({
      id: `${prefix}group`,
      kind: "group",
      keyword: "GROUP BY",
      title: `GROUP BY ${groupBy}`,
      materializeSql: working,
      inputTableNames: [],
      narrationHintKey: "GROUP BY",
    });

    if (having) {
      working = `${working} HAVING ${having}`;
      stages.push({
        id: `${prefix}having`,
        kind: "having",
        keyword: "HAVING",
        title: "HAVING filter on groups",
        materializeSql: working,
        inputTableNames: [],
        narrationHintKey: "HAVING",
      });
    }
  }

  // SELECT projection (skip if already projected by GROUP BY with non-* list)
  const selectList = columnsSql(select);
  const alreadyProjected = Boolean(groupBy);
  if (!alreadyProjected) {
    working = `SELECT ${selectList} FROM ${fromJoinSql}${
      where ? ` WHERE ${where}` : ""
    }`;
    stages.push({
      id: `${prefix}select`,
      kind: "select",
      keyword: "SELECT",
      title: "SELECT columns",
      materializeSql: working,
      inputTableNames: [],
      narrationHintKey: "SELECT",
    });
  } else if (selectList !== "*") {
    // ensure final select stage exists for narration even if group already projected
    stages.push({
      id: `${prefix}select`,
      kind: "select",
      keyword: "SELECT",
      title: "SELECT aggregates / columns",
      materializeSql: working,
      inputTableNames: [],
      narrationHintKey: "SELECT",
    });
  }

  if (hasDistinct(select)) {
    working = `SELECT DISTINCT ${selectList === "*" ? "*" : selectList} FROM (${working})`;
    // Better: wrap
    const inner = alreadyProjected
      ? working.replace(/^SELECT /, "SELECT DISTINCT ")
      : `SELECT DISTINCT ${selectList} FROM ${fromJoinSql}${where ? ` WHERE ${where}` : ""}`;
    working = inner;
    stages.push({
      id: `${prefix}distinct`,
      kind: "distinct",
      keyword: "DISTINCT",
      title: "DISTINCT rows",
      materializeSql: working,
      inputTableNames: [],
      narrationHintKey: "DISTINCT",
    });
  }

  const order = orderBySql(select);
  if (order) {
    // Rebuild final ordered query from select AST by appending
    const baseQuery = stages[stages.length - 1]?.materializeSql || working;
    working = `${baseQuery} ORDER BY ${order}`;
    stages.push({
      id: `${prefix}order`,
      kind: "order",
      keyword: "ORDER BY",
      title: `ORDER BY ${order}`,
      materializeSql: working,
      inputTableNames: [],
      narrationHintKey: "ORDER BY",
    });
  }

  const { limit, offset } = limitInfo(select);
  if (limit !== undefined) {
    const baseQuery = stages[stages.length - 1]?.materializeSql || working;
    working =
      offset !== undefined
        ? `${baseQuery} LIMIT ${limit} OFFSET ${offset}`
        : `${baseQuery} LIMIT ${limit}`;
    stages.push({
      id: `${prefix}limit`,
      kind: "limit",
      keyword: offset !== undefined ? "LIMIT / OFFSET" : "LIMIT",
      title: offset !== undefined ? `LIMIT ${limit} OFFSET ${offset}` : `LIMIT ${limit}`,
      materializeSql: working,
      inputTableNames: [],
      narrationHintKey: "LIMIT",
    });
  }

  // mark unused cteNames for lint silence when empty
  void cteNames;

  return { stages, unsupported };
}

function cteSelectSql(withItem: LooseWith): string | null {
  try {
    const stmt = withItem.stmt;
    const select =
      stmt && typeof stmt === "object" && "ast" in stmt
        ? stmt.ast
        : (stmt as Select | undefined);
    if (!select) return null;
    return parser.sqlify(select, SQLIFY_OPTS);
  } catch {
    return null;
  }
}

function planOneSelect(
  ast: SelectNode,
  prefix: string,
): { stages: PlannedStage[]; unsupported: string[] } {
  const stages: PlannedStage[] = [];
  const unsupported: string[] = [];
  const cteNames: string[] = [];

  if (ast.with?.length) {
    for (const [i, raw] of ast.with.entries()) {
      const withItem = raw as LooseWith;
      const name = withItem.name?.value || withItem.name?.column || `cte_${i}`;
      cteNames.push(String(name));
      const cteSql = cteSelectSql(withItem);
      if (!cteSql) {
        unsupported.push(`CTE ${name} could not be expanded`);
        continue;
      }
      const cteAst = getSelectAst(cteSql);
      if (!cteAst) {
        unsupported.push(`CTE ${name} is not a simple SELECT`);
        continue;
      }
      const inner = planSelectBody(cteAst, `${prefix}cte-${name}-`, cteNames);
      unsupported.push(...inner.unsupported);
      for (const s of inner.stages) {
        stages.push({
          ...s,
          title: `WITH ${name} · ${s.title}`,
          keyword: s.kind === "from" ? "WITH" : s.keyword,
          kind: s.kind === "from" ? "cte" : s.kind,
          narrationHintKey: s.kind === "from" ? "WITH" : s.narrationHintKey,
        });
      }
      stages.push({
        id: `${prefix}cte-${name}-ready`,
        kind: "cte",
        keyword: "WITH",
        title: `CTE \`${name}\` ready`,
        materializeSql: cteSql,
        inputTableNames: [],
        narrationHintKey: "WITH",
        materializeAs: String(name),
      });
    }
  }

  const body = planSelectBody(ast, prefix, cteNames);
  stages.push(...body.stages);
  unsupported.push(...body.unsupported);
  return { stages, unsupported };
}

export function planQuery(sql: string): QueryPlan {
  const normalizedSql = stripTrailingSemicolon(sql);
  const warnings: string[] = [];
  const unsupported: string[] = [];
  const stages: PlannedStage[] = [];

  const ast = getSelectAst(normalizedSql);
  if (!ast) {
    return {
      stages: [],
      unsupported: ["Could not parse SQL as a SELECT (SQLite dialect)"],
      warnings,
      normalizedSql,
    };
  }

  const { selects, ops } = collectUnionChain(ast);

  if (selects.length === 1) {
    const one = planOneSelect(ast, "");
    stages.push(...one.stages);
    unsupported.push(...one.unsupported);
  } else {
    const branchSqls: string[] = [];
    selects.forEach((sel, i) => {
      // Isolate branch — sqlify otherwise emits the full UNION chain
      const isolated = {
        ...sel,
        _next: undefined,
        set_op: undefined,
        with: i === 0 ? sel.with : null,
      } as SelectNode;
      const branchSql = parser.sqlify(isolated, SQLIFY_OPTS);
      branchSqls.push(branchSql);
      const planned = planOneSelect(isolated, `branch-${i}-`);
      unsupported.push(...planned.unsupported);
      for (const s of planned.stages) {
        stages.push({
          ...s,
          title: `Branch ${i + 1} · ${s.title}`,
        });
      }
      stages.push({
        id: `branch-${i}-result`,
        kind: "set_op",
        keyword: `BRANCH ${i + 1}`,
        title: `Branch ${i + 1} result`,
        materializeSql: branchSql,
        inputTableNames: [],
        narrationHintKey: "UNION",
      });
    });

    let combined = branchSqls[0];
    for (let i = 1; i < branchSqls.length; i++) {
      const op = ops[i - 1] || "UNION";
      combined = `${combined} ${op} ${branchSqls[i]}`;
      stages.push({
        id: `set-op-${i}`,
        kind: "set_op",
        keyword: op.includes("ALL") ? "UNION ALL" : "UNION",
        title: `${op} merge`,
        materializeSql: combined,
        inputTableNames: [],
        narrationHintKey: op.includes("ALL") ? "UNION ALL" : "UNION",
      });
    }
  }

  if (!stages.length) {
    unsupported.push("No visualizable stages found");
  }

  return { stages, unsupported: [...new Set(unsupported)], warnings, normalizedSql };
}
