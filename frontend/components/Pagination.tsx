interface Props {
  page: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function Pagination({ page, totalPages, total, onPrev, onNext }: Props) {
  return (
    <div className="flex items-center justify-between mt-8">
      <span className="text-zinc-500 text-sm">{total.toLocaleString()} results</span>
      <div className="flex items-center gap-3">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className="px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm disabled:opacity-30 hover:bg-zinc-700 transition-colors"
        >
          ← Prev
        </button>
        <span className="text-zinc-400 text-sm tabular-nums">
          {page} / {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={page >= totalPages}
          className="px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm disabled:opacity-30 hover:bg-zinc-700 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
