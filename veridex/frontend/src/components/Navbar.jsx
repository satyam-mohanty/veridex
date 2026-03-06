import { Shield } from 'lucide-react';
import { useState } from 'react';
import AboutModal from './AboutModal';

export default function Navbar() {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-(--border) bg-(--bg)/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-6">

          <div className="flex items-center gap-3">
            <Shield className="h-[26px] w-[26px] text-(--text-primary)" />
            <span className="text-[20px] font-semibold tracking-[-0.01em] text-(--text-primary)">
              Veridex
            </span>
          </div>

          <nav className="flex items-center">
            <button
              onClick={() => setAboutOpen(true)}
              className="text-[13px] font-medium text-(--text-secondary) transition-colors duration-150 hover:text-(--text-primary) cursor-pointer"
              style={{ background: 'none', border: 'none', padding: '6px 12px' }}
            >
              About
            </button>
          </nav>
        </div>
      </header>

      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  );
}
