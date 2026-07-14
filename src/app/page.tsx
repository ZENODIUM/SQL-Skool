import Link from "next/link";
import { listStories } from "@/lib/content/stories";

export default function HomePage() {
  const stories = listStories();

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden border border-[var(--line)] bg-[var(--panel)]/90 px-6 py-12 md:px-10 md:py-16">
        <div className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 20% 20%, rgb(13 110 110 / 18%), transparent 50%), radial-gradient(ellipse at 80% 0%, rgb(11 107 203 / 12%), transparent 45%)",
          }}
        />
        <div className="relative max-w-2xl space-y-5">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--accent)]">
            SqlSkool
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-[1.1] tracking-tight text-[var(--ink)] md:text-6xl">
            Behind every SQL keyword
          </h1>
          <p className="max-w-xl text-lg text-[var(--muted)]">
            Open the black box. Scrub through intermediate tables as FROM, JOIN,
            WHERE, GROUP BY, HAVING, and WITH transform real rows.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/story/left-join-where-trap"
              className="border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-white"
            >
              Watch the JOIN trap
            </Link>
            <Link
              href="/playground"
              className="border border-[var(--ink)] px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-[var(--ink)]"
            >
              Open playground
            </Link>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            Keyword stories
          </h2>
          <p className="font-mono text-xs text-[var(--muted)]">
            {stories.length} curated walkthroughs
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {stories.map((story) => (
            <Link
              key={story.id}
              href={`/story/${story.id}`}
              className="group border border-[var(--line)] bg-[var(--panel)] p-4 transition hover:border-[var(--accent)]"
            >
              <div className="mb-2 flex flex-wrap gap-1.5">
                {story.teaches.map((k) => (
                  <span
                    key={k}
                    className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--accent)]"
                  >
                    {k}
                  </span>
                ))}
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)] group-hover:text-[var(--accent)]">
                {story.title}
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{story.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
