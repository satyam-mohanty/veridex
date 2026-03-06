import { motion } from 'framer-motion';

const modes = [
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
  { key: 'url', label: 'URL' },
];

export default function ModeSelector({ activeMode, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-(--border) bg-(--bg) p-1">
      {modes.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className="relative z-10 cursor-pointer rounded-md px-5 py-1.5 text-[13px] font-medium transition-colors duration-150"
          style={{
            color: activeMode === key
              ? 'var(--text-primary)'
              : 'var(--text-tertiary)',
          }}
        >
          {activeMode === key && (
            <motion.div
              layoutId="mode-indicator"
              className="absolute inset-0 rounded-md bg-(--surface-hover) border border-(--border)"
              transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
            />
          )}
          <span className="relative z-20">{label}</span>
        </button>
      ))}
    </div>
  );
}
