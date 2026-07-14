export type ColumnDef = {
  name: string;
  type: string;
};

export type TableDef = {
  name: string;
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
};

export type TableSet = {
  id: string;
  name: string;
  description: string;
  tables: TableDef[];
};

export type CellValue = string | number | boolean | null;

export type TableSnapshot = {
  name: string;
  columns: string[];
  rows: { id: string; cells: CellValue[] }[];
};

export type RowEventKind =
  | "keep"
  | "drop"
  | "match"
  | "null_fill"
  | "group_into"
  | "reorder"
  | "project";

export type RowEvent = {
  kind: RowEventKind;
  rowId: string;
  note?: string;
  pairedWith?: string;
  groupKey?: string;
};

export type StageKind =
  | "from"
  | "join"
  | "where"
  | "group"
  | "having"
  | "select"
  | "distinct"
  | "order"
  | "limit"
  | "cte"
  | "subquery"
  | "set_op";

export type Stage = {
  id: string;
  kind: StageKind;
  keyword: string;
  title: string;
  narration: string;
  inputs: TableSnapshot[];
  output: TableSnapshot;
  rowEvents: RowEvent[];
  sqlFragment?: string;
};

export type VisualizeResult = {
  stages: Stage[];
  final: TableSnapshot;
  warnings: string[];
  unsupported: string[];
};

export type Story = {
  id: string;
  title: string;
  summary: string;
  teaches: string[];
  tableSetId: string;
  sql: string;
  narrationHints?: Record<string, string>;
};
