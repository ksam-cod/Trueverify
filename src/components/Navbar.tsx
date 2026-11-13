import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export type ActiveView = 'verify' | 'registry' | 'audit';

interface NavbarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView, sectionId?: string) => void;
  onOpenIssueModal: () => void;
}

export function Navbar({ activeView, onNavigate, onOpenIssueModal }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view: ActiveView, sectionId?: string) => {
    setMobileMenuOpen(false);
    onNavigate(view, sectionId);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#CFE4E1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('verify', 'top');
          }}
          className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded-sm"
        >
          TrueVerify
        </a>

        {/* Zone 2: 4 single-line text nav links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <button
            type="button"
            onClick={() => handleNavClick('verify', 'top')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
              activeView === 'verify'
                ? 'border-teal-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Verify
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('registry')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
              activeView === 'registry'
                ? 'border-teal-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Registry
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('audit')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${
              activeView === 'audit'
                ? 'border-teal-700 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Audit Log
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('verify', 'how-it-works')}
            className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:text-slate-900 hover:border-slate-300 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            How It Works
          </button>
        </nav>

        {/* Zone 3: 1 primary CTA button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenIssueModal();
            }}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-700"
          >
            Issue Serial
          </button>
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          <button
            type="button"
            onClick={() => handleNavClick('verify', 'top')}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Verify Product
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('registry')}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Product Registry
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('audit')}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Audit Log
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('verify', 'how-it-works')}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            How It Works
          </button>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenIssueModal();
              }}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              Issue Serial
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
