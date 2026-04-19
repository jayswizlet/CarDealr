import type { ScoreResponse } from "@/lib/types";

type Label = ScoreResponse["label"];

const STYLES: Record<Label, string> = {
  "Great Deal": "bg-emerald-500 text-white",
  "Good Deal":  "bg-green-400 text-white",
  "Fair":       "bg-yellow-400 text-gray-900",
  "Overpriced": "bg-red-500 text-white",
};

export default function ScoreBadge({ score, label }: { score: number; label: Label }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STYLES[label]}`}
    >
      {score} · {label}
    </span>
  );
}
