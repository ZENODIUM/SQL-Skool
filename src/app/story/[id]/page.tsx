import Link from "next/link";
import { notFound } from "next/navigation";
import { Visualizer } from "@/components/viz/Visualizer";
import { getStoryWithTableSet, listStories } from "@/lib/content/stories";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return listStories().map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const data = getStoryWithTableSet(id);
  if (!data) return { title: "Story not found" };
  return {
    title: `${data.story.title} · SqlSkool`,
    description: data.story.summary,
  };
}

export default async function StoryPage({ params }: Props) {
  const { id } = await params;
  const data = getStoryWithTableSet(id);
  if (!data) notFound();

  const { story, tableSet } = data;
  const all = listStories();
  const idx = all.findIndex((s) => s.id === story.id);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx < all.length - 1 ? all[idx + 1] : null;

  return (
    <div className="space-y-6">
      <Visualizer
        tableSet={tableSet}
        sql={story.sql}
        narrationHints={story.narrationHints}
        title={story.title}
        summary={story.summary}
      />
      <div className="flex flex-wrap justify-between gap-3 border-t border-[var(--line)] pt-4 font-mono text-xs uppercase tracking-[0.12em]">
        {prev ? (
          <Link href={`/story/${prev.id}`} className="text-[var(--accent)]">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/story/${next.id}`} className="text-[var(--accent)]">
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
