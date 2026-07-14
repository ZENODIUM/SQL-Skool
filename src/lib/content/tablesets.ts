import type { TableSet } from "@/lib/engine";

export const shopTableSet: TableSet = {
  id: "shop",
  name: "Shop",
  description: "Tiny ecommerce schema for learning filters, joins, and aggregates.",
  tables: [
    {
      name: "customers",
      columns: [
        { name: "id", type: "INTEGER" },
        { name: "name", type: "TEXT" },
        { name: "city", type: "TEXT" },
      ],
      rows: [
        { id: 1, name: "Ava", city: "Austin" },
        { id: 2, name: "Ben", city: "Boston" },
        { id: 3, name: "Cara", city: "Austin" },
        { id: 4, name: "Drew", city: "Denver" },
        { id: 5, name: "Eve", city: "Boston" },
      ],
    },
    {
      name: "orders",
      columns: [
        { name: "id", type: "INTEGER" },
        { name: "customer_id", type: "INTEGER" },
        { name: "total", type: "INTEGER" },
        { name: "status", type: "TEXT" },
      ],
      rows: [
        { id: 101, customer_id: 1, total: 40, status: "paid" },
        { id: 102, customer_id: 1, total: 75, status: "paid" },
        { id: 103, customer_id: 2, total: 20, status: "pending" },
        { id: 104, customer_id: 3, total: 90, status: "paid" },
        { id: 105, customer_id: 9, total: 55, status: "paid" },
      ],
    },
    {
      name: "products",
      columns: [
        { name: "id", type: "INTEGER" },
        { name: "name", type: "TEXT" },
        { name: "category", type: "TEXT" },
        { name: "price", type: "INTEGER" },
      ],
      rows: [
        { id: 1, name: "Mug", category: "home", price: 12 },
        { id: 2, name: "Tee", category: "apparel", price: 25 },
        { id: 3, name: "Hat", category: "apparel", price: 18 },
        { id: 4, name: "Lamp", category: "home", price: 40 },
        { id: 5, name: "Mug", category: "home", price: 12 },
      ],
    },
    {
      name: "order_items",
      columns: [
        { name: "id", type: "INTEGER" },
        { name: "order_id", type: "INTEGER" },
        { name: "product_id", type: "INTEGER" },
        { name: "qty", type: "INTEGER" },
      ],
      rows: [
        { id: 1, order_id: 101, product_id: 1, qty: 2 },
        { id: 2, order_id: 101, product_id: 2, qty: 1 },
        { id: 3, order_id: 102, product_id: 4, qty: 1 },
        { id: 4, order_id: 104, product_id: 3, qty: 2 },
        { id: 5, order_id: 103, product_id: 2, qty: 1 },
      ],
    },
  ],
};

export const streamsTableSet: TableSet = {
  id: "streams",
  name: "Streams",
  description: "Streaming plays for GROUP BY / HAVING practice.",
  tables: [
    {
      name: "users",
      columns: [
        { name: "id", type: "INTEGER" },
        { name: "name", type: "TEXT" },
        { name: "plan", type: "TEXT" },
      ],
      rows: [
        { id: 1, name: "Kai", plan: "free" },
        { id: 2, name: "Lina", plan: "pro" },
        { id: 3, name: "Mo", plan: "pro" },
        { id: 4, name: "Nia", plan: "free" },
      ],
    },
    {
      name: "plays",
      columns: [
        { name: "id", type: "INTEGER" },
        { name: "user_id", type: "INTEGER" },
        { name: "track", type: "TEXT" },
        { name: "seconds", type: "INTEGER" },
      ],
      rows: [
        { id: 1, user_id: 1, track: "Dawn", seconds: 120 },
        { id: 2, user_id: 1, track: "Dawn", seconds: 80 },
        { id: 3, user_id: 2, track: "River", seconds: 200 },
        { id: 4, user_id: 2, track: "River", seconds: 150 },
        { id: 5, user_id: 2, track: "Sky", seconds: 90 },
        { id: 6, user_id: 3, track: "River", seconds: 60 },
        { id: 7, user_id: 4, track: "Dawn", seconds: 30 },
      ],
    },
  ],
};

export const tableSets: Record<string, TableSet> = {
  shop: shopTableSet,
  streams: streamsTableSet,
};

export function getTableSet(id: string): TableSet {
  const set = tableSets[id];
  if (!set) throw new Error(`Unknown table set: ${id}`);
  return set;
}
