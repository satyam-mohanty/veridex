import { motion } from 'framer-motion';
import { Shield, AlertTriangle, FileText, Brain } from 'lucide-react';



function getRiskColor(level) {
  switch (level) {
    case 'LOW':      return { dot: 'bg-[#4A6741]',   text: 'text-[#4A6741]' };
    case 'MEDIUM':   return { dot: 'bg-yellow-500',  text: 'text-yellow-600' };
    case 'HIGH':     return { dot: 'bg-orange-500',  text: 'text-orange-600' };
    case 'CRITICAL': return { dot: 'bg-red-500',     text: 'text-red-600' };
    default:         return { dot: 'bg-stone-400',   text: 'text-stone-500' };
  }
}



function Card({ title, icon: Icon, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-xl border border-(--border) bg-(--surface) p-5 flex flex-col gap-3"
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-(--text-tertiary)" />}
        <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-(--text-tertiary)">
          {title}
        </span>
      </div>
      {children}
    </motion.div>
  );
}



export default function ResultsGrid({ result }) {
  if (!result) return null;

  const risk = getRiskColor(result.risk_level);
  const isPhishing = result.label === 'phishing';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="mx-auto w-full max-w-[1100px] px-6 pb-20 pt-8"
    >

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <Card title="Threat Score" icon={AlertTriangle} delay={0.05}>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-4xl font-bold tracking-tight ${risk.text}`}>
              {result.risk_score}
            </span>
            <span className="text-[13px] text-(--text-tertiary)">/100</span>
          </div>
        </Card>


        <Card title="Risk Level" icon={Shield} delay={0.1}>
          <div className="flex items-center gap-2.5">
            <span className={`h-2.5 w-2.5 rounded-full ${risk.dot}`} />
            <span className={`text-lg font-semibold tracking-tight ${risk.text}`}>
              {result.risk_level}
            </span>
          </div>
          <span className={`text-[13px] font-medium ${isPhishing ? 'text-red-600' : 'text-[#4A6741]'}`}>
            {isPhishing ? 'Threat Detected' : 'Verified Safe'}
          </span>
        </Card>


        <Card title="AI Confidence" icon={Brain} delay={0.15}>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tight text-(--text-primary)">
              {Math.round(result.confidence * 100)}
            </span>
            <span className="text-[13px] text-(--text-tertiary)">%</span>
          </div>
        </Card>


        <Card title="Input Type" icon={FileText} delay={0.2}>
          <span className="text-lg font-semibold capitalize text-(--text-primary)">
            {result.input_type}
          </span>
          {result.scan_timestamp && (
            <span className="text-[11px] text-(--text-tertiary)">
              {new Date(result.scan_timestamp).toLocaleString()}
            </span>
          )}
        </Card>
      </div>


      {result.reasons && result.reasons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-4 rounded-xl border border-(--border) bg-(--surface) p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-3.5 w-3.5 text-(--text-tertiary)" />
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-(--text-tertiary)">
              Detected Indicators
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {result.reasons.map((reason, idx) => (
              <motion.li
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.06 }}
                key={idx}
                className="flex items-start gap-3 rounded-lg border border-(--border) bg-(--bg) px-4 py-3"
              >
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${isPhishing ? 'bg-red-500' : 'bg-[#4A6741]'}`} />
                <span className="text-[13px] leading-relaxed text-(--text-secondary)">
                  {reason}
                </span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}


      {result.explanation && result.explanation.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="mt-4 rounded-xl border border-(--border) bg-(--surface) p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-3.5 w-3.5 text-(--text-tertiary)" />
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-(--text-tertiary)">
              Keyword Impact Analysis
            </span>
          </div>


          <div className="flex gap-6 mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-[12px] text-(--text-secondary)">
                Phishing ({result.explanation.filter(w => w.direction === 'phishing').length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#4A6741]" />
              <span className="text-[12px] text-(--text-secondary)">
                Safe ({result.explanation.filter(w => w.direction === 'legitimate').length})
              </span>
            </div>
          </div>


          <div className="flex flex-wrap gap-2">
            {result.explanation.map((item, idx) => {
              const isPhish = item.direction === 'phishing';
              return (
                <motion.span
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + idx * 0.03 }}
                  key={idx}
                  className={`rounded-md border px-2.5 py-1 text-[12px] font-medium ${
                    isPhish
                      ? 'border-red-500/25 bg-red-500/8 text-red-700'
                      : 'border-[#4A6741]/25 bg-[#4A6741]/8 text-[#4A6741]'
                  }`}
                >
                  {item.word}
                </motion.span>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
