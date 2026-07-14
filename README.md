```
 _________________________________________
|                                         |
|                SQLSKOOL                 |
|_________________________________________|
|                                         |
|   [ ]   [ ]   [ ]   [ ]   [ ]   [ ]     |
|                                         |
|   [ ]   [ ]   [ ]   [ ]   [ ]   [ ]     |
|                                         |
|                                         |
|                  _____                  |
|                 |     |                 |
|                 | |_| |                 |
|_________________|_____|_________________|
          |     |         |     |
          |_____|         |_____|
```

# SqlSkool

Most SQL tools show you a final result table. They skip the part that actually teaches you anything: what happened between the query and that table.

SqlSkool opens that black box. You run a query, then scrub through each keyword (`FROM`, `JOIN`, `WHERE`, `GROUP BY`, `HAVING`, `WITH`, `DISTINCT`, `ORDER BY`, `LIMIT`, subqueries, `UNION`, and more) and watch the intermediate rows change — kept, dropped, matched, NULL-padded, grouped, reordered.

Built as a portfolio project focused on one idea: teach SQL by showing what each keyword does to real data.

## Run it locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other useful commands:

```bash
npm test          # engine + curated story checks
npm run build     # production build
npm start         # serve the production build
```

## What’s in the app

- **Gallery** — short keyword walkthroughs on tiny, handcrafted tables
- **Story pages** — autoplay scrubber, stage pipeline, input vs intermediate tables
- **Playground** — edit SQL against a curated schema and trace it live

Content is curated on purpose. The visualizer needs small, intentional datasets (unmatched joins, NULL traps, clean groups). Random tables usually make the story harder, not clearer.

## How the engine works

The core API is schema-agnostic:

```ts
visualize(tableSet, sql) => stages[]
```

1. Parse the query into a logical stage plan
2. Run each stage in sql.js (SQLite in WebAssembly)
3. Emit snapshots + narration for every keyword step
4. Render them in a scrubbable timeline

Content lives in `src/lib/content`. The engine lives in `src/lib/engine`. Keeping those separate means the same tracer can power curated stories today and custom tables later.

## Stack

- Next.js + TypeScript
- sql.js (in-browser SQLite)
- node-sql-parser
- Monaco editor
- Framer Motion

## Project layout

```
src/lib/engine/     # visualize(), planner, stage snapshots
src/lib/content/    # TableSets + keyword stories
src/components/viz/ # scrubber, tables, pipeline UI
src/app/            # gallery, story routes, playground
public/             # sql.js wasm assets (needed in the browser)
```

## Notes

After `npm install`, a small postinstall script copies the sql.js wasm files into `public/`. Those files are also committed so a fresh clone can run without surprise missing assets.

This is intentionally narrow. No AI tutor, no big lesson platform yet — just the intermediate-result storytelling piece, done clearly.
