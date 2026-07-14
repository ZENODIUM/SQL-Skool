import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-[var(--line)] bg-[var(--panel)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="group">
          <div className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--ink)]">
            SqlSkool
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] group-hover:text-[var(--accent)]">
            Behind every keyword
          </div>
        </Link>
        <nav className="flex items-center gap-4 font-mono text-xs uppercase tracking-[0.12em]">
          <Link href="/" className="text-[var(--ink)] hover:text-[var(--accent)]">
            Gallery
          </Link>
          <Link
            href="/playground"
            className="border border-[var(--accent)] px-3 py-1.5 text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
          >
            Playground
          </Link>
        </nav>
      </div>
    </header>
  );
}
