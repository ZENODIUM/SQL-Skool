"use client";

type Props = {
  index: number;
  max: number;
  playing: boolean;
  onChange: (index: number) => void;
  onTogglePlay: () => void;
  onStep: (delta: number) => void;
};

export function Scrubber({
  index,
  max,
  playing,
  onChange,
  onTogglePlay,
  onStep,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-sm border border-[var(--line)] bg-[var(--panel)] px-3 py-2">
      <button
        type="button"
        onClick={() => onStep(-1)}
        className="border border-[var(--line)] px-2 py-1 font-mono text-xs hover:border-[var(--accent)]"
        aria-label="Previous stage"
      >
        Prev
      </button>
      <button
        type="button"
        onClick={onTogglePlay}
        className="min-w-16 border border-[var(--accent)] bg-[var(--accent)] px-3 py-1 font-mono text-xs text-white"
      >
        {playing ? "Pause" : "Play"}
      </button>
      <button
        type="button"
        onClick={() => onStep(1)}
        className="border border-[var(--line)] px-2 py-1 font-mono text-xs hover:border-[var(--accent)]"
        aria-label="Next stage"
      >
        Next
      </button>
      <input
        type="range"
        min={0}
        max={Math.max(max, 0)}
        value={index}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-[180px] flex-1 accent-[var(--accent)]"
        aria-label="Stage scrubber"
      />
      <span className="font-mono text-xs text-[var(--muted)]">
        {max < 0 ? "0 / 0" : `${index + 1} / ${max + 1}`}
      </span>
    </div>
  );
}
