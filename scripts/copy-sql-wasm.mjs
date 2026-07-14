import fs from "fs";
import path from "path";

const root = process.cwd();
const dist = path.join(root, "node_modules", "sql.js", "dist");
const pub = path.join(root, "public");

fs.mkdirSync(pub, { recursive: true });

for (const file of ["sql-wasm.wasm", "sql-wasm-browser.wasm"]) {
  const from = path.join(dist, file);
  const to = path.join(pub, file);
  if (!fs.existsSync(from)) {
    console.warn(`[copy-sql-wasm] skip missing ${file}`);
    continue;
  }
  fs.copyFileSync(from, to);
  console.log(`[copy-sql-wasm] ${file}`);
}
