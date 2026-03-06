import { useState } from 'react';
import { motion } from 'framer-motion';
import { List } from 'lucide-react';
import ModeSelector from './ModeSelector';
import InputArea from './InputArea';
import AnalyzeButton from './AnalyzeButton';



const DEMOS = {
  email: {
    safe: `From: sarah.johnson@acmecorp.com\nTo: engineering-team@acmecorp.com\nSubject: Q3 Performance Report — Action Items & Next Steps\n\nHi Team,\n\nI hope this message finds you well. As discussed during yesterday's all-hands meeting, I'm sharing the Q3 performance report along with the key takeaways and action items for each department.\n\nHighlights:\n- Revenue grew 12% quarter-over-quarter, exceeding our target of 9%.\n- Customer retention rate improved to 94.2%, up from 91.8% in Q2.\n- The new onboarding flow reduced time-to-value by 35%.\n\nAction items:\n1. Engineering — Please review the infrastructure cost analysis on page 14 and share optimization proposals by Friday.\n2. Product — Schedule user research sessions for the dashboard redesign initiative.\n3. Marketing — Finalize the Q4 campaign calendar and circulate for review.\n\nThe full report is attached as a PDF. If you have any questions or need clarification on any data points, feel free to reach out to me or David Chen in Analytics.\n\nLooking forward to a strong Q4.\n\nBest regards,\nSarah Johnson\nVP of Marketing | Acme Corp\nsarah.johnson@acmecorp.com | +1 (415) 555-0192`,
    phishing: `From: security-alert@paypa1-support.com\nTo: valued.customer@gmail.com\nSubject: ⚠️ URGENT: Unauthorized Login Detected — Immediate Action Required\n\nDear Valued Customer,\n\nWe have detected suspicious unauthorized access to your account from an unrecognized device in Moscow, Russia (IP: 185.233.xx.xx) on March 4, 2026 at 11:42 PM UTC.\n\nFor your protection, we have temporarily limited your account. To restore full access and secure your account, you must verify your identity immediately:\n\n→ Click here to verify: http://paypa1-secure-verify.com/auth/login?ref=security&id=8837291\n\nIf you do not verify within 24 hours, your account will be permanently suspended and all funds will be frozen.\n\nWhat happened:\n- Login attempt from unknown device\n- Multiple failed password attempts detected\n- Potential unauthorized transaction of $849.99 initiated\n\nIMPORTANT: Do not ignore this email. Failure to act will result in permanent account closure.\n\nThank you for your prompt attention to this matter.\n\nSincerely,\nAccount Security Division\nPayPal Customer Protection\nCase ID: PP-SEC-2026-8837291\n\nThis is an automated message. Please do not reply directly to this email.`,
  },
  sms: {
    safe: `[MyBank] Your one-time verification code is 482931. This code expires in 5 minutes. Never share this code with anyone, including bank employees. If you did not request this code, please call us at 1-800-555-0199. — MyBank Security`,
    phishing: `USPS ALERT: Your package #US9214800123456 could not be delivered due to an incomplete address. A re-delivery fee of $1.99 is required. Update your information and pay now to avoid return-to-sender: http://usps-redelivery-update.com/pay?tracking=US9214800123456 Text STOP to cancel. Sincerely, USPS Delivery Team.`,
  },
  url: {
    safe: `https://www.google.com`,
    phishing: `http://paypa1-secure-login.suspicious-site.xyz/account/verify?id=28371&token=abc&redirect=dashboard&session=expired`,
  },
  'bulk-url': {
    safe: `https://www.google.com\nhttps://github.com\nhttps://stackoverflow.com\nhttps://www.wikipedia.org\nhttps://www.microsoft.com`,
    phishing: `http://paypa1-secure-login.suspicious-site.xyz/verify?id=28371\nhttps://www.google.com\nhttp://amaz0n-account-verify.tk/login?session=expired\nhttp://free-iphone-winner.com/claim-prize-now\nhttps://github.com`,
  },
};

export default function AnalysisWorkspace({
  inputType,
  onModeChange,
  inputValue,
  onInputChange,
  loading,
  onAnalyze,
  error,
  isBulk,
  setIsBulk,
}) {
  const canAnalyze = inputValue.trim().length > 0 && !loading;

  const fillDemo = (variant) => {
    const key = inputType === 'url' && isBulk ? 'bulk-url' : inputType;
    onInputChange(DEMOS[key][variant]);
  };

  const effectiveInputType = inputType === 'url' && isBulk ? 'bulk-url' : inputType;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
      className="mx-auto w-full max-w-[1100px] px-6"
    >
      <div className="rounded-xl border border-(--border) bg-(--surface)">

        <div className="flex items-center gap-4 border-b border-(--border) px-5 py-3">
          <ModeSelector activeMode={inputType} onChange={onModeChange} />
          
          {inputType === 'url' && (
            <button
              onClick={() => {
                setIsBulk(!isBulk);
                onInputChange('');
              }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                isBulk 
                  ? 'bg-(--accent) text-white' 
                  : 'bg-(--bg) text-(--text-secondary) border border-(--border) hover:text-(--text-primary)'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Bulk Scan
            </button>
          )}

          <div className="ml-auto">
            <AnalyzeButton
              loading={loading}
              disabled={!canAnalyze}
              onClick={onAnalyze}
            />
          </div>
        </div>


        <div className="px-5 py-4">
          <InputArea
            inputType={effectiveInputType}
            value={inputValue}
            onChange={onInputChange}
            disabled={loading}
          />
        </div>


        <div className="flex items-center justify-between border-t border-(--border) px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-(--text-tertiary) mr-1">
              Try a demo:
            </span>
            <button
              onClick={() => fillDemo('safe')}
              disabled={loading}
              className="cursor-pointer rounded-md border border-[#4A6741] px-2.5 py-1 text-[11px] font-semibold text-[#4A6741] transition-colors duration-150 hover:bg-[#4A6741] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Safe sample
            </button>
            <button
              onClick={() => fillDemo('phishing')}
              disabled={loading}
              className="cursor-pointer rounded-md border border-red-600 px-2.5 py-1 text-[11px] font-semibold text-red-600 transition-colors duration-150 hover:bg-red-600 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Phishing sample
            </button>
          </div>

          {error && (
            <p className="text-[13px] text-red-400">{error}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
