import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { Menu, X, ChevronDown } from "lucide-react";
import { useI18n } from "../lib/i18n";
import Footer from "./Footer";
import LangToggle from "./LangToggle";
// ── User avatar dropdown ──────────────────────────────────────────────────────
function UserMenu() {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { t, isRTL } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.firstName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? '?';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 outline-none group"
        aria-label="User menu"
      >
        <div className="w-7 h-7 rounded-lg overflow-hidden ring-1 ring-white/10 group-hover:ring-white/25 transition-all flex-shrink-0">
          {user?.imageUrl
            ? <img src={user.imageUrl} alt={user.fullName ?? ''} className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-white/10 flex items-center justify-center text-xs font-medium text-white/70">{initials}</div>
          }
        </div>
        <ChevronDown className={`w-3 h-3 text-white/25 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className={`absolute top-full mt-2 w-52 rounded-xl overflow-hidden py-1 z-50 ${isRTL ? 'left-0' : 'right-0'}`}
          style={{ background: 'var(--_overlay)', backdropFilter: 'blur(24px)', border: '1px solid var(--_dropdown-b)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
        >
          {/* User info header */}
          {user && (
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <p className="text-xs font-medium text-white/80 truncate">{user.fullName || user.username}</p>
              <p className="text-[10px] text-white/30 truncate mt-0.5">{user.emailAddresses?.[0]?.emailAddress}</p>
            </div>
          )}

          {/* Links */}
          <div className="py-1">
            <button
              onClick={() => { navigate('/settings'); setOpen(false); }}
              className="w-full text-start px-4 py-2.5 text-sm font-light text-white/55 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              {t('nav.settings')}
            </button>
            <button
              onClick={() => { openUserProfile(); setOpen(false); }}
              className="w-full text-start px-4 py-2.5 text-sm font-light text-white/55 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              {t('nav.manage_account')}
            </button>
          </div>

          <div className="border-t border-white/[0.06] py-1">
            <button
              onClick={() => signOut({ redirectUrl: '/' })}
              className="w-full text-start px-4 py-2.5 text-sm font-light transition-colors"
              style={{ color: 'rgba(248,113,113,0.75)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgb(248,113,113)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.75)')}
            >
              {t('nav.sign_out')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────
export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, isRTL } = useI18n();

  const isActive = (href: string) => location === href || location.startsWith(href + '/');

  const navItems = [
    { href: '/dashboard',    label: t('nav.projects') },
    { href: '/projects/new', label: t('nav.new_analysis') },
  ];

  const desktopLink = (href: string, label: string) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        className={`text-sm font-light tracking-wide transition-colors outline-none relative group whitespace-nowrap ${
          active ? 'text-white' : 'text-white/35 hover:text-white/70'
        }`}
      >
        {label}
        {active && (
          <span
            className="absolute -bottom-1 left-0 w-full h-px rounded-full"
            style={{ background: 'linear-gradient(90deg, #C9A84C, rgba(201,168,76,0.3))' }}
          />
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      {/* ── Fixed header ─────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 w-full z-50 flex items-center justify-between px-5 sm:px-8 py-4 gap-4"
        style={{ background: 'var(--_hdr)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--_hdr-b)' }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group outline-none flex-shrink-0">
          <img src="/logo.svg" alt="Jadeer" className="w-5 h-5 transition-opacity group-hover:opacity-70" />
          <span className="font-semibold tracking-widest text-sm text-white/90 uppercase">Jadeer</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 flex-1 px-8">
          {navItems.map(({ href, label }) => desktopLink(href, label))}
        </nav>

        {/* Desktop controls */}
        <div className="hidden md:flex items-center gap-2">
          <LangToggle />
          <div className="w-px h-5 mx-1 bg-white/[0.08]" />
          <UserMenu />
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <LangToggle />
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed top-[61px] left-0 right-0 z-40 md:hidden"
          style={{ background: 'var(--_drawer)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--_hdr-b)' }}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <nav className="flex flex-col px-5 py-4 gap-1">
            {navItems.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-xl text-sm font-light transition-colors ${
                    active ? 'text-white bg-white/[0.06]' : 'text-white/45 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {active && (
                    <span className="w-1 h-1 rounded-full me-2.5 flex-shrink-0" style={{ background: '#C9A84C' }} />
                  )}
                  {label}
                </Link>
              );
            })}

            {/* Mobile user actions */}
            <div className="border-t border-white/[0.06] mt-3 pt-3 space-y-1">
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className="flex items-center px-4 py-3 rounded-xl text-sm font-light text-white/45 hover:text-white hover:bg-white/[0.04] transition-colors"
              >
                {t('nav.settings')}
              </Link>
            </div>
          </nav>
        </div>
      )}

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <main className="flex-1 pt-[61px] sm:pt-[69px] pb-6 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        {children}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
