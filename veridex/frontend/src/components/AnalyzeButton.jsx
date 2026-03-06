import { Loader2, ArrowRight } from 'lucide-react';

export default function AnalyzeButton({ loading, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-(--accent) px-5 py-2.5 text-[13px] font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Analyzing…</span>
        </>
      ) : (
        <>
          <span>Analyze</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </>
      )}
    </button>
  );
}
