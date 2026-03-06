import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="mx-auto max-w-[1100px] px-6 pt-24 pb-16 text-center"
    >
      <h1 className="text-[clamp(2.25rem,5vw,3.5rem)] font-bold leading-[1.1] tracking-[-0.035em] text-(--text-primary)">
        AI Phishing Detection
      </h1>
      <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-(--text-secondary)">
        Real-time analysis of emails, SMS messages, and URLs.
        <br className="hidden sm:block" />
        Detect threats before they reach you.
      </p>
    </motion.section>
  );
}
