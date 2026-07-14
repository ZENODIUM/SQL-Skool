import type { Database, SqlValue } from "sql.js";
import type { CellValue, TableSet, TableSnapshot } from "./types";

export type SqlJsStatic = {
  Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
};

let sqlPromise: Promise<SqlJsStatic> | null = null;

async function loadWasmBinary(): Promise<ArrayBuffer> {
  if (typeof window === "undefined") {
    const fs = await import("fs");
    const path = await import("path");
    const wasmPath = path.join(
      process.cwd(),
      "node_modules",
      "sql.js",
      "dist",
      "sql-wasm.wasm",
    );
    const buf = fs.readFileSync(wasmPath);
    return buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    ) as ArrayBuffer;
  }

  // Turbopack may request sql-wasm-browser.wasm; always serve from /public.
  const candidates = ["/sql-wasm-browser.wasm", "/sql-wasm.wasm"];
  let lastError: unknown;
  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        lastError = new Error(`Failed to fetch ${url}: ${res.status}`);
        continue;
      }
      return await res.arrayBuffer();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to load sql.js wasm");
}

export async function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = (async () => {
      const initSqlJs = (await import("sql.js")).default;
      const wasmBinary = await loadWasmBinary();
      return initSqlJs({ wasmBinary }) as Promise<SqlJsStatic>;
    })();
  }
  return sqlPromise;
}

function escapeIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "1" : "0";
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function loadTableSet(SQL: SqlJsStatic, tableSet: TableSet): Database {
  const db = new SQL.Database();
  for (const table of tableSet.tables) {
    const cols = table.columns
      .map((c) => `${escapeIdent(c.name)} ${c.type}`)
      .join(", ");
    db.run(`CREATE TABLE ${escapeIdent(table.name)} (${cols});`);
    for (const [index, row] of table.rows.entries()) {
      const colNames = table.columns.map((c) => escapeIdent(c.name)).join(", ");
      const values = table.columns.map((c) => sqlLiteral(row[c.name])).join(", ");
      db.run(
        `INSERT INTO ${escapeIdent(table.name)} (${colNames}) VALUES (${values});`,
      );
      // Track stable row ids via a shadow map table for provenance (optional helper).
      void index;
    }
  }
  return db;
}

function toCell(value: SqlValue): CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "boolean") return value;
  return String(value);
}

export function querySnapshot(
  db: Database,
  sql: string,
  name = "result",
): TableSnapshot {
  const result = db.exec(sql);
  if (!result.length) {
    return { name, columns: [], rows: [] };
  }
  const columns = result[0].columns;
  const rows = result[0].values.map((valueRow, i) => ({
    id: `${name}-r${i}`,
    cells: valueRow.map(toCell),
  }));
  return { name, columns, rows };
}

export function tableSnapshotFromDef(
  tableSet: TableSet,
  tableName: string,
): TableSnapshot {
  const table = tableSet.tables.find(
    (t) => t.name.toLowerCase() === tableName.toLowerCase(),
  );
  if (!table) {
    return { name: tableName, columns: [], rows: [] };
  }
  return {
    name: table.name,
    columns: table.columns.map((c) => c.name),
    rows: table.rows.map((row, i) => ({
      id: `${table.name}-r${i}`,
      cells: table.columns.map((c) => {
        const v = row[c.name];
        if (v === null || v === undefined) return null;
        if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") {
          return v;
        }
        return String(v);
      }),
    })),
  };
}

export function runSql(db: Database, sql: string): TableSnapshot {
  return querySnapshot(db, sql, "result");
}
