import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Mail, MessageSquare, Globe, Chrome, Brain, Database, Users, Zap } from 'lucide-react';
import { useState } from 'react';

const overlay = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modal = {
  hidden: { opacity: 0, scale: 0.92, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 28, stiffness: 350 },
  },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
};

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
      transition={{ duration: 0.2 }}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px 16px',
        textAlign: 'center',
        cursor: 'default',
        flex: '1 1 0',
        minWidth: '140px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: color + '18',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={20} color={color} />
        </div>
      </div>
      <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
    </motion.div>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  const [hovered, setHovered] = useState(false);
  return (
    <motion.div
      variants={fadeUp}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      style={{
        background: hovered ? 'var(--surface-hover)' : 'var(--surface)',
        border: `1px solid ${hovered ? 'var(--border-hover)' : 'var(--border)'}`,
        borderRadius: '12px',
        padding: '20px',
        cursor: 'default',
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <Icon size={18} color="var(--accent)" />
        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{title}</span>
      </div>
      <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
        {description}
      </p>
    </motion.div>
  );
}

function SectionTitle({ children }) {
  return (
    <motion.h3
      variants={fadeUp}
      style={{
        fontSize: '11px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--text-tertiary)',
        marginBottom: '14px',
        marginTop: '28px',
      }}
    >
      {children}
    </motion.h3>
  );
}

export default function AboutModal({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="about-overlay"
          variants={overlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(44, 44, 36, 0.5)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <motion.div
            key="about-modal"
            variants={modal}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="no-scrollbar"
            style={{
              background: 'var(--bg)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '32px',
              position: 'relative',
              boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
            }}
          >
            <motion.button
              whileHover={{ scale: 1.1, background: 'var(--surface-hover)' }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
              }}
            >
              <X size={16} />
            </motion.button>

            <motion.div variants={stagger} initial="hidden" animate="visible">
              <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Shield size={22} color="#fff" />
                </div>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                    Veridex
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
                    AI-Powered Phishing Threat Detection
                  </p>
                </div>
              </motion.div>

              <motion.p
                variants={fadeUp}
                style={{
                  fontSize: '14px',
                  lineHeight: '1.7',
                  color: 'var(--text-secondary)',
                  marginTop: '18px',
                }}
              >
                Veridex is a comprehensive AI-powered phishing detection platform that protects users across
                <strong> emails</strong>, <strong>SMS messages</strong>, and <strong>URLs</strong> in real-time.
                Built using machine learning models trained on massive, real-world datasets, it identifies
                phishing threats with high accuracy and delivers instant risk assessments.
              </motion.p>

              <SectionTitle>Training Data — 100% Real, Zero Synthetic</SectionTitle>
              <motion.div
                variants={stagger}
                style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <StatCard icon={MessageSquare} value="5,169" label="SMS Samples" color="#b45309" />
                <StatCard icon={Mail} value="83,446" label="Email Samples" color="#4A6741" />
                <StatCard icon={Globe} value="641,119" label="URL Samples" color="#c2410c" />
              </motion.div>

              <motion.p
                variants={fadeUp}
                style={{
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  marginTop: '10px',
                  fontStyle: 'italic',
                  textAlign: 'center',
                }}
              >
              </motion.p>

              <SectionTitle>How It Works</SectionTitle>
              <motion.div
                variants={stagger}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '12px',
                }}
              >
                <FeatureCard
                  icon={Brain}
                  title="ML-Powered Analysis"
                  description="Each scan type (email, SMS, URL) runs through its own dedicated ML model, fine-tuned on real phishing data for maximum accuracy and minimal false positives."
                />
                <FeatureCard
                  icon={Zap}
                  title="Instant Risk Scoring"
                  description="Get real-time threat assessments with confidence scores, risk levels (Low / Medium / High / Critical) and detailed reasons behind every verdict."
                />
                <FeatureCard
                  icon={Database}
                  title="Multi-Threat Coverage"
                  description="Scan individual or bulk URLs, paste suspicious email bodies, or SMS text. Veridex covers every common phishing vector in one unified platform."
                />
              </motion.div>

              <SectionTitle>Browser Extension</SectionTitle>
              <motion.div
                variants={fadeUp}
                whileHover={{ y: -2 }}
                style={{
                  background: 'var(--accent-bg)',
                  border: '1px solid var(--accent-muted)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <Chrome size={20} color="var(--accent)" />
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    Veridex Chrome Extension
                  </span>
                </div>
                <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)', margin: 0 }}>
                  Our Chrome extension provides passive, always-on protection. It <strong>automatically scans every
                  URL</strong> you visit in the background and shows a real-time risk badge directly in the extension popup.
                  It also supports <strong>Gmail &amp; Outlook email scanning</strong> — injecting inline phishing
                  warning banners right into your inbox. Plus you can <strong>manually scan</strong> any URL, email, or
                  SMS from the popup itself, and view your <strong>recent scan history</strong> at a glance.
                </p>
              </motion.div>

              <SectionTitle>Developed By</SectionTitle>
              <motion.div
                variants={fadeUp}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '20px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Users size={20} color="#fff" />
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  Team ByteMe
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
