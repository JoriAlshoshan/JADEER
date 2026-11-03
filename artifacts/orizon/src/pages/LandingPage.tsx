import { useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useClerk } from "@clerk/react";
import { UserButton } from "@clerk/react";
import { motion, useInView } from "framer-motion";
import { NetworkCanvas } from "../components/NetworkCanvas";
import {
  ArrowRight, Target, TrendingUp, Users, LayoutGrid,
  BarChart3, Sparkles, ChevronDown, Zap
} from "lucide-react";
import LangToggle from "../components/LangToggle";
import ThemeToggle from "../components/ThemeToggle";
import { useI18n } from "../lib/i18n";

// ─── Feature icons (titles/descriptions injected via t() inside component) ───
const FEATURE_ICONS = [Target, TrendingUp, Users, LayoutGrid, BarChart3, Sparkles];

// ─── Animated section wrapper ─────────────────────────────────────────────────
function FadeIn({
  children,
  delay = 0,
  className = "",
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-2xl p-7 transition-all duration-500 hover:bg-white/[0.04] cursor-default"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Hover gold top line */}
      <div
        className="absolute top-0 left-6 right-6 h-px rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.6), transparent)" }}
      />

      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
        style={{
          background: "rgba(201,168,76,0.08)",
          border: "1px solid rgba(201,168,76,0.18)",
        }}
      >
        <Icon className="w-5 h-5" style={{ color: "#C9A84C" }} />
      </div>

      <h3 className="text-base font-semibold text-white/90 mb-2 tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-white/40 leading-relaxed font-light">
        {description}
      </p>
    </motion.div>
  );
}

// ─── Main landing page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const [idea, setIdea] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useClerk();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { t, isRTL } = useI18n();
  const isTyping = idea.trim().length > 0;

  const features = FEATURE_ICONS.map((icon, i) => ({
    icon,
    title: t(`feature.f${i + 1}_title`),
    description: t(`feature.f${i + 1}_desc`),
  }));

  const trustLabels = ['trust.f1', 'trust.f2', 'trust.f3', 'trust.f4', 'trust.f5', 'trust.f6'];
  const canvasIntensity = isFocused ? 0.72 : 0.32;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!idea.trim()) {
      textareaRef.current?.focus();
      return;
    }
    sessionStorage.setItem("jadeer_pending_idea", idea.trim());
    setLocation(user ? "/projects/new" : "/sign-in");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative min-h-[100dvh] bg-background text-foreground overflow-x-hidden">

      {/* ── Living background (full page) ─────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <NetworkCanvas intensity={canvasIntensity} className="absolute inset-0 w-full h-full" />
        {/* Vignette */}
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, transparent 20%, rgba(7,7,12,0.65) 70%, rgba(7,7,12,0.95) 100%)" }} />
      </div>

      {/* ── Top nav ───────────────────────────────────────── */}
      <header className="relative z-50 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="Jadeer" className="w-5 h-5" />
          <span className="text-sm font-semibold tracking-widest text-white/80 uppercase">
            Jadeer
          </span>
        </div>

        <nav className="flex items-center gap-3 sm:gap-6">
          <LangToggle />
          <ThemeToggle />
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="hidden sm:block text-sm font-light text-white/40 hover:text-white/75 transition-colors tracking-wide"
              >
                {t('nav.projects')}
              </Link>
              <div className="pl-2 sm:pl-4 sm:border-l border-white/[0.08]">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-7 h-7 rounded-lg",
                      userButtonTrigger: "outline-none",
                    },
                  }}
                />
              </div>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="text-sm font-light text-white/35 hover:text-white/70 transition-colors tracking-widest uppercase"
            >
              {t('landing.sign_in')}
            </Link>
          )}
        </nav>
      </header>

      {/* ══════════════════════════════════════════════════════
          HERO — above the fold
      ══════════════════════════════════════════════════════ */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100dvh-80px)] px-6 pb-12">

        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-2 mb-8"
        >
          <div
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase"
            style={{
              background: "rgba(201,168,76,0.08)",
              border: "1px solid rgba(201,168,76,0.2)",
              color: "#C9A84C",
            }}
          >
            <Zap className="w-3 h-3" />
            {t('landing.eyebrow')}
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-center text-5xl md:text-6xl lg:text-7xl font-light tracking-tight leading-[1.08] mb-6 max-w-3xl"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {t('landing.hero_text')}{" "}
          <span
            className="font-semibold"
            style={{
              background: "linear-gradient(135deg, #C9A84C 0%, #e8c96a 50%, #C9A84C 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {t('landing.hero_highlight')}
          </span>
        </motion.h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-center text-lg md:text-xl text-white/45 font-light max-w-xl leading-relaxed mb-12"
        >
          {t('landing.hero_sub')}
        </motion.p>

        {/* ── Idea input ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl"
        >
          <form onSubmit={handleSubmit}>
            {/* Glow ring */}
            <div className="relative">
              {isFocused && (
                <div
                  className="absolute -inset-px rounded-2xl pointer-events-none transition-opacity duration-500"
                  style={{
                    boxShadow:
                      "0 0 0 1px rgba(201,168,76,0.35), 0 0 40px rgba(201,168,76,0.12), 0 0 80px rgba(201,168,76,0.05)",
                  }}
                />
              )}

              <div
                className="relative rounded-2xl overflow-hidden transition-all duration-500"
                style={{
                  background: "rgba(255,255,255,0.035)",
                  border: isFocused
                    ? "1px solid rgba(201,168,76,0.35)"
                    : "1px solid var(--_dropdown-b)",
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('landing.placeholder')}
                  rows={4}
                  className="w-full bg-transparent px-6 pt-5 pb-4 text-base md:text-lg text-white placeholder:text-white/20 focus:outline-none font-light resize-none leading-relaxed"
                  style={{ caretColor: "#C9A84C" }}
                />

                {/* Bottom bar with hint + button */}
                <div className="flex items-center justify-between px-5 pb-4">
                  <span className="text-xs text-white/20 font-light">
                    {idea.length > 0
                      ? t('landing.hint_chars', { n: String(idea.length) })
                      : t('landing.hint_detail')}
                  </span>

                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-30"
                    style={{
                      background: isTyping
                        ? "linear-gradient(135deg, #C9A84C, #b8963e)"
                        : "rgba(201,168,76,0.12)",
                      color: isTyping ? "#07070C" : "rgba(201,168,76,0.5)",
                      border: isTyping
                        ? "none"
                        : "1px solid rgba(201,168,76,0.2)",
                    }}
                  >
                    {t('landing.analyze_cta')}
                    <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Trust strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 1 }}
            className="flex items-center justify-center gap-6 mt-7 flex-wrap"
          >
            {trustLabels.map((key) => (
              <span
                key={key}
                className="text-[11px] text-white/25 font-light tracking-wider flex items-center gap-1.5"
              >
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ background: "rgba(201,168,76,0.4)" }}
                />
                {t(key)}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.button
          onClick={scrollToFeatures}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 hover:text-white/45 transition-colors group"
        >
          <span className="text-[10px] tracking-[0.25em] uppercase font-light">
            {t('landing.scroll_hint')}
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </motion.button>
      </section>

      {/* ══════════════════════════════════════════════════════
          FEATURES — what Jadeer delivers
      ══════════════════════════════════════════════════════ */}
      <section
        id="features"
        className="relative z-10 px-6 py-28 max-w-6xl mx-auto w-full"
      >
        {/* Section header */}
        <FadeIn className="text-center mb-16">
          <p
            className="text-xs tracking-[0.3em] uppercase font-light mb-4"
            style={{ color: "#C9A84C" }}
          >
            {t('landing.features_eyebrow')}
          </p>
          <h2 className="text-3xl md:text-4xl font-light tracking-tight text-white mb-4">
            {t('landing.features_title')}
          </h2>
          <p className="text-base text-white/40 font-light max-w-lg mx-auto leading-relaxed">
            {t('landing.features_sub')}
          </p>
        </FadeIn>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <FeatureCard
              key={feature.title}
              {...feature}
              delay={i * 0.07}
            />
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          HOW IT WORKS — 3 steps
      ══════════════════════════════════════════════════════ */}
      <section className="relative z-10 px-6 py-20 max-w-4xl mx-auto w-full">
        <FadeIn className="text-center mb-14">
          <h2 className="text-2xl md:text-3xl font-light tracking-tight text-white mb-3">
            {t('landing.how_title')}
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          {[
            { step: "01", titleKey: 'landing.step1_title', bodyKey: 'landing.step1_body' },
            { step: "02", titleKey: 'landing.step2_title', bodyKey: 'landing.step2_body' },
            { step: "03", titleKey: 'landing.step3_title', bodyKey: 'landing.step3_body' },
          ].map((item, i) => (
            <FadeIn
              key={item.step}
              delay={i * 0.1}
              className="px-8 py-10"
              style={{ background: "var(--_dropdown)" } as React.CSSProperties}
            >
              <div
                className="text-xs font-bold mb-5 tracking-widest"
                style={{ color: "rgba(201,168,76,0.4)" }}
              >
                {item.step}
              </div>
              <h3 className="text-base font-semibold text-white/90 mb-3 tracking-tight">
                {t(item.titleKey)}
              </h3>
              <p className="text-sm text-white/40 leading-relaxed font-light">
                {t(item.bodyKey)}
              </p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          BOTTOM CTA
      ══════════════════════════════════════════════════════ */}
      <section className="relative z-10 px-6 py-28 flex flex-col items-center text-center">
        <FadeIn>
          <div
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase mb-8"
            style={{
              background: "rgba(201,168,76,0.08)",
              border: "1px solid rgba(201,168,76,0.2)",
              color: "#C9A84C",
            }}
          >
            <Zap className="w-3 h-3" />
            {t('landing.cta_eyebrow')}
          </div>

          <h2 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-5 max-w-xl">
            {t('landing.cta_title')}
          </h2>
          <p className="text-base text-white/40 font-light mb-10 max-w-md leading-relaxed">
            {t('landing.cta_sub')}
          </p>

          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              setTimeout(() => textareaRef.current?.focus(), 600);
            }}
            className="flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-semibold transition-all duration-300 hover:scale-105 active:scale-95 mx-auto"
            style={{
              background: "linear-gradient(135deg, #C9A84C, #b8963e)",
              color: "#07070C",
              boxShadow: "0 8px 40px rgba(201,168,76,0.25)",
            }}
          >
            {t('landing.cta_btn')}
            <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
        </FadeIn>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="relative z-10 px-8 py-7 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Jadeer" className="w-4 h-4 opacity-40" />
          <span className="text-xs text-white/25 font-light tracking-widest uppercase">
            {t('landing.build')}
          </span>
        </div>
        <span className="text-[11px] font-light" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {t('footer.copyright')}
        </span>
      </footer>
    </div>
  );
}
