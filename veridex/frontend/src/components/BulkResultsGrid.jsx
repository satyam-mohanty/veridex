import { motion } from 'framer-motion';
import { Globe, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

function getRiskColor(level) {
  switch (level) {
    case 'LOW':      return { dot: 'bg-[#4A6741]',  text: 'text-[#4A6741]',  bg: 'bg-[#4A6741]/5',  border: 'border-[#4A6741]/15' };
    case 'MEDIUM':   return { dot: 'bg-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-500/5', border: 'border-yellow-500/15' };
    case 'HIGH':     return { dot: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-500/5', border: 'border-orange-500/15' };
    case 'CRITICAL': return { dot: 'bg-red-500',    text: 'text-red-600',    bg: 'bg-red-500/5',    border: 'border-red-500/15' };
    default:         return { dot: 'bg-stone-400',  text: 'text-stone-500',  bg: 'bg-stone-500/5',  border: 'border-stone-500/15' };
  }
}

export default function BulkResultsGrid({ results }) {
  if (!results || results.length === 0) return null;

  const totalThreats = results.filter(r => r.result?.label === 'phishing').length;
  const totalSafe = results.filter(r => r.result?.label === 'legitimate').length;
  const totalFailed = results.filter(r => r.error).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="mx-auto w-full max-w-[1100px] px-6 pb-20 pt-8"
    >

      <div className="flex items-center gap-5 mb-5">
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-(--text-tertiary)">
          {results.length} URLs scanned
        </span>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-[12px] text-red-600 font-medium">{totalThreats} threats</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#4A6741]" />
          <span className="text-[12px] text-[#4A6741] font-medium">{totalSafe} safe</span>
        </div>
        {totalFailed > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-400" />
            <span className="text-[12px] text-zinc-400 font-medium">{totalFailed} failed</span>
          </div>
        )}
      </div>


      <div className="flex flex-col gap-2">
        {results.map((item, idx) => {
          const risk = item.result ? getRiskColor(item.result.risk_level) : null;
          const isPhishing = item.result?.label === 'phishing';

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              className={`rounded-lg border bg-(--surface) px-5 py-3.5 flex items-center justify-between gap-4 ${
                item.error
                  ? 'border-zinc-500/15'
                  : risk.border
              }`}
            >

              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Globe className="h-3.5 w-3.5 shrink-0 text-(--text-tertiary)" />
                <span className="text-[13px] text-(--text-primary) truncate font-mono">
                  {item.url}
                </span>
              </div>


              {item.error ? (
                <span className="text-[12px] text-zinc-400 shrink-0">Failed</span>
              ) : (
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${risk.dot}`} />
                    <span className={`text-[12px] font-medium ${risk.text}`}>
                      {item.result.risk_level}
                    </span>
                  </div>
                  <span className={`text-[13px] font-semibold tabular-nums ${risk.text}`}>
                    {item.result.risk_score}/100
                  </span>
                  <div className="flex items-center gap-1">
                    {isPhishing ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                    <span className={`text-[12px] font-medium ${isPhishing ? 'text-red-400' : 'text-emerald-400'}`}>
                      {isPhishing ? 'Threat' : 'Safe'}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
