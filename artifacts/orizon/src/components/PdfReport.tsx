/**
 * PdfReport.tsx — Professional strategy report built with @react-pdf/renderer.
 *
 * Renders a full A4 document with:
 *  - Branded dark cover page with official Jadeer vector logo
 *  - Gold top-bar + fixed page header/footer (with logo) on every content page
 *  - wrap={false} on every card so nothing splits mid-way across a page break
 *  - Consistent 40pt margins throughout
 *  - McKinsey/Deloitte-style white-page professional layout
 */
import React from 'react';
import { Document, Page, View, Text, StyleSheet, Svg, Path, Circle, G, Font } from '@react-pdf/renderer';

// ─── Arabic font (Cairo) — served from /public/fonts/ as full-coverage TTF ────
// Full Google Fonts TTF (not subset) covers Arabic + Latin glyphs in one file.
// Using local hosting avoids CDN failures during PDF generation.
{
  const _base =
    typeof window !== 'undefined'
      ? window.location.origin +
        (import.meta.env.BASE_URL as string).replace(/\/$/, '') +
        '/'
      : '/';
  Font.register({
    family: 'Cairo',
    fonts: [
      { src: `${_base}fonts/cairo-400.ttf`, fontWeight: 400 },
      { src: `${_base}fonts/cairo-700.ttf`, fontWeight: 700 },
    ],
  });
}

// ─── Exported types (mirror AnalysisDetail.tsx interfaces) ──────────────────

export interface PdfRiskItem {
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High';
  mitigation: string;
}

export interface PdfRoadmapPhase {
  period: string;
  label: string;
  tasks: string[];
  kpi: string;
}

export interface PdfCompetitor {
  name: string;
  strength: string;
  gap: string;
  differentiation: string;
}

export interface PdfScores {
  ventureScore: number;
  innovationScore: number;
  marketScore: number;
  riskScore: number;
  investmentReadiness: number;
  revenuePotential: number;
  ventureScoreExplanation?: string | null;
  innovationScoreExplanation?: string | null;
  marketScoreExplanation?: string | null;
  riskScoreExplanation?: string | null;
  investmentReadinessExplanation?: string | null;
  revenuePotentialExplanation?: string | null;
}

export interface PdfSwot {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface PdfReportProps {
  project: {
    title: string;
    ideaSummary?: string | null;
    industry?: string | null;
    targetMarket?: string | null;
  };
  analysis: {
    executiveSummary?: string | null;
    businessModel?: string | null;
    marketOpportunity?: string | null;
    customerPersona?: string | null;
    revenueModel?: string | null;
    goToMarketStrategy?: string | null;
    competitorAnalysis?: string | null;
    startupRoadmap?: string | null;
    improvementSuggestions?: string | null;
    riskAnalysis?: unknown;
    createdAt: string;
  };
  scores?: PdfScores;
  swot?: PdfSwot;
  risks: PdfRiskItem[];
  roadmapPhases: PdfRoadmapPhase[];
  recommendations: string[];
  competitors: PdfCompetitor[] | null;
  reportDate: string;
  /** Controls text direction, font family, and label language for the exported PDF. */
  language?: 'en' | 'ar';
}

// ─── PDF language context (threads isAR and l() through the tree without prop-drilling) ─
const PdfLangCtx = React.createContext<{
  isAR: boolean;
  l: (en: string, ar: string) => string;
}>({ isAR: false, l: (en: string) => en });
const usePdfLang = () => React.useContext(PdfLangCtx);

// ─── Color system ────────────────────────────────────────────────────────────

const GOLD        = '#C9A84C';
const DARK        = '#09090F';
const WHITE       = '#FFFFFF';
const INK         = '#0D0D1E';
const INK2        = '#4A4860';
const INK3        = '#8A8AAA';
const CARD        = '#F5F4FB';
const BORDER      = '#E3E1F0';
const GOLD_SOFT   = '#FDFAF2';
const GOLD_BORDER = '#DDD09A';
const GREEN       = '#1A7A47';
const RED         = '#AE2F2F';
const M           = 40; // page margin (pt)

// ─── Text utilities ──────────────────────────────────────────────────────────

const clean = (t?: string | null): string => {
  if (!t || typeof t !== 'string') return '';
  return t.replace(/\*\*/g, '').replace(/^#{1,3}\s*/gm, '').trim();
};

const paras = (t?: string | null): string[] =>
  !t ? [] : clean(t).split(/\n\n+/).map(p => p.replace(/\n/g, ' ').trim()).filter(p => p.length > 5).slice(0, 8);

function sColor(n: number, invert = false): string {
  if (invert) { return n < 40 ? GREEN : n < 65 ? GOLD : RED; }
  return n >= 70 ? GOLD : n >= 45 ? INK2 : RED;
}

function verdict(score: number, l: (en: string, ar: string) => string): { text: string; color: string } {
  if (score >= 75) return { text: l('Strong Investment Readiness', 'جاهزية استثمارية قوية'), color: GREEN };
  if (score >= 55) return { text: l('Promising — Needs Validation', 'واعد — يحتاج إلى تحقق'), color: GOLD };
  return { text: l('Requires Strategic Improvement', 'يتطلب تحسيناً استراتيجياً'), color: RED };
}

function factors(s: PdfScores, l: (en: string, ar: string) => string): { label: string; type: 'pos' | 'neg' | 'neutral' }[] {
  const f: { label: string; type: 'pos' | 'neg' | 'neutral' }[] = [];
  if (s.innovationScore >= 70)  f.push({ label: l('Strong innovation and product differentiation', 'ابتكار قوي وتمييز واضح للمنتج'), type: 'pos' });
  else if (s.innovationScore < 50) f.push({ label: l('Limited differentiation from existing solutions', 'تمييز محدود عن الحلول الموجودة'), type: 'neg' });
  if (s.marketScore >= 70)      f.push({ label: l('Attractive and growing market opportunity', 'فرصة سوقية جذابة ومتنامية'), type: 'pos' });
  else if (s.marketScore < 50)  f.push({ label: l('Uncertain or limited market demand', 'طلب سوقي غير مؤكد أو محدود'), type: 'neg' });
  else                          f.push({ label: l('Moderate market opportunity — positioning needed', 'فرصة سوقية متوسطة — تحتاج وضوحاً في التموضع'), type: 'neutral' });
  if (s.riskScore >= 70)        f.push({ label: l('Manageable risk profile with clear mitigations', 'ملف مخاطر قابل للإدارة مع تخفيفات واضحة'), type: 'pos' });
  else if (s.riskScore < 50)    f.push({ label: l('High execution risk requires strategic attention', 'مخاطر تنفيذية عالية تستوجب الاهتمام الاستراتيجي'), type: 'neg' });
  else                          f.push({ label: l('Moderate risk level — mitigation planning recommended', 'مستوى مخاطر معتدل — يُوصى بالتخطيط للتخفيف'), type: 'neutral' });
  if (s.revenuePotential >= 70) f.push({ label: l('Strong revenue potential and path to profitability', 'إمكانات إيرادية قوية ومسار واضح للربحية'), type: 'pos' });
  else if (s.revenuePotential < 50) f.push({ label: l('Revenue model needs validation and refinement', 'نموذج الإيرادات يحتاج إلى تحقق وتحسين'), type: 'neg' });
  if (s.ventureScore >= 70)     f.push({ label: l('Solid overall venture fundamentals', 'أسس قوية للمشروع بشكل عام'), type: 'pos' });
  else if (s.ventureScore < 50) f.push({ label: l('Core venture fundamentals need strengthening', 'الأسس الجوهرية للمشروع تحتاج إلى تعزيز'), type: 'neg' });
  return f.slice(0, 5);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // Cover page
  cover: { backgroundColor: DARK, flexDirection: 'column' },
  coverBody: { flex: 1, paddingHorizontal: M, paddingVertical: 52, flexDirection: 'column', justifyContent: 'space-between' },
  coverBrand: { fontSize: 10, letterSpacing: 3, color: GOLD, fontFamily: 'Helvetica-Bold' },
  coverConf: { fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'Helvetica', letterSpacing: 1 },
  coverType: { fontSize: 9, letterSpacing: 3, color: 'rgba(255,255,255,0.35)', fontFamily: 'Helvetica', marginBottom: 18 },
  coverTitle: { fontSize: 36, color: WHITE, fontFamily: 'Helvetica-Bold', lineHeight: 1.2, marginBottom: 12 },
  coverIdea: { fontSize: 11, color: 'rgba(255,255,255,0.42)', fontFamily: 'Helvetica', lineHeight: 1.5, maxWidth: 420 },
  coverDiv: { height: 1, backgroundColor: 'rgba(201,168,76,0.25)', marginVertical: 32 },
  coverMetaLabel: { fontSize: 7, letterSpacing: 2, color: 'rgba(255,255,255,0.25)', fontFamily: 'Helvetica' },
  coverMetaValue: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontFamily: 'Helvetica', marginTop: 3 },
  coverScoreLabel: { fontSize: 7, letterSpacing: 2, color: 'rgba(255,255,255,0.3)', fontFamily: 'Helvetica', textAlign: 'right' },
  coverScoreNum: { fontSize: 52, color: GOLD, fontFamily: 'Helvetica-Bold', lineHeight: 1 },
  coverScoreDen: { fontSize: 13, color: 'rgba(255,255,255,0.22)', fontFamily: 'Helvetica', alignSelf: 'flex-end', marginBottom: 7, marginLeft: 3 },

  // Content page shell — top & bottom padding leave room for fixed header/footer
  content: { backgroundColor: WHITE, paddingTop: 54, paddingBottom: 42, paddingHorizontal: M },

  // Fixed header (absolute, repeats on every page of a multi-page section)
  hdrBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: GOLD },
  hdrRow: {
    position: 'absolute', top: 3, left: M, right: M,
    paddingTop: 11, paddingBottom: 9,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 0.5, borderBottomColor: '#DDD8F4', borderBottomStyle: 'solid',
  },
  hdrLabel: { fontSize: 7, letterSpacing: 2.5, color: GOLD, fontFamily: 'Helvetica-Bold' },
  hdrRight: { fontSize: 7, color: INK3, fontFamily: 'Helvetica' },

  // Fixed footer
  ftr: { position: 'absolute', bottom: 18, left: M, right: M, flexDirection: 'row', justifyContent: 'space-between' },
  ftrTxt: { fontSize: 7, color: INK3, fontFamily: 'Helvetica' },

  // Section heading
  secTitle: { fontSize: 16, color: INK, fontFamily: 'Helvetica-Bold', lineHeight: 1.15, marginBottom: 3 },
  secSub: { fontSize: 9, color: INK3, fontFamily: 'Helvetica', marginBottom: 12 },
  secLabel: { fontSize: 7, letterSpacing: 2.5, color: GOLD, fontFamily: 'Helvetica-Bold', marginBottom: 5 },

  // Divider
  div: { height: 0.5, backgroundColor: BORDER, marginVertical: 18 },

  // Body text
  body: { fontSize: 9, color: INK2, fontFamily: 'Helvetica', lineHeight: 1.65 },

  // Cards
  card: { backgroundColor: CARD, borderRadius: 5, padding: 14, borderWidth: 0.5, borderColor: BORDER, borderStyle: 'solid' },
  goldCard: { backgroundColor: GOLD_SOFT, borderRadius: 5, padding: 14, borderWidth: 0.5, borderColor: GOLD_BORDER, borderStyle: 'solid' },

  // Labels
  lbl: { fontSize: 7, letterSpacing: 1.5, color: INK3, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  lblGold: { fontSize: 7, letterSpacing: 1.5, color: GOLD, fontFamily: 'Helvetica-Bold', marginBottom: 3 },

  // Bar
  track: { height: 3, backgroundColor: BORDER, borderRadius: 2, marginTop: 5 },
  fill: { height: 3, borderRadius: 2 },

  // Layout
  row: { flexDirection: 'row' },
  flex1: { flex: 1 },
});

// ─── Official Jadeer logo (vector, identical to /logo.svg + wordmark) ────────
//
// Geometry matches public/logo.svg exactly:
//   Outer diamond  M20 3 L37 20 L20 37 L3 20 Z   stroke #C9A84C 1.5px
//   Inner diamond  M20 11 L29 20 L20 29 L11 20 Z  fill #C9A84C 18% + stroke 1px
//   Centre dot     circle r=2.5                   fill #C9A84C

function JadeerLogoIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 40 40" width={size} height={size}>
      {/* Outer diamond */}
      <Path
        d="M20 3 L37 20 L20 37 L3 20 Z"
        stroke={GOLD}
        strokeWidth={1.5}
        fill="none"
        strokeLinejoin="round"
      />
      {/* Inner diamond — fill at 18% opacity */}
      <Path
        d="M20 11 L29 20 L20 29 L11 20 Z"
        fill={GOLD}
        fillOpacity={0.18}
      />
      {/* Inner diamond — outline */}
      <Path
        d="M20 11 L29 20 L20 29 L11 20 Z"
        stroke={GOLD}
        strokeWidth={1}
        fill="none"
      />
      {/* Centre dot */}
      <Circle cx={20} cy={20} r={2.5} fill={GOLD} />
    </Svg>
  );
}

/** Full lockup: diamond icon + JADEER wordmark. Dark variant for cover; light variant for headers. */
function JadeerLogo({ size = 18, dark = true }: { size?: number; dark?: boolean }) {
  const textColor = dark ? GOLD : GOLD;
  const spacing = Math.round(size * 0.55);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <JadeerLogoIcon size={size} />
      <Text style={{
        fontFamily: 'Helvetica-Bold',
        fontSize: Math.round(size * 0.55),
        letterSpacing: Math.round(size * 0.18),
        color: textColor,
        marginLeft: Math.round(size * 0.4),
        marginTop: Math.round(size * 0.02),
      }}>
        JADEER
      </Text>
    </View>
  );
}

// ─── Reusable sub-components ─────────────────────────────────────────────────

function GoldTopBar() {
  return <View style={S.hdrBar} fixed />;
}

function Header({ label, startup }: { label: string; startup: string }) {
  const { isAR } = usePdfLang();
  return (
    <View style={S.hdrRow} fixed>
      <Text style={[S.hdrLabel, isAR ? { fontFamily: 'Cairo', fontSize: 9, letterSpacing: 0 } : {}]}>{label}</Text>
      {/* Official logo lockup on the right of every page header */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <JadeerLogoIcon size={11} />
        <Text style={[S.hdrRight, { marginLeft: 4, fontFamily: isAR ? 'Cairo' : 'Helvetica' }]}>
          {'  ·  '}{startup}
        </Text>
      </View>
    </View>
  );
}

function Footer() {
  const { l, isAR } = usePdfLang();
  return (
    <View style={S.ftr} fixed>
      <Text style={[S.ftrTxt, isAR ? { fontFamily: 'Cairo', letterSpacing: 0, textAlign: 'right' } : {}]}>
        {l('Confidential — Jadeer AI Strategy Report', 'سري — تقرير استراتيجية جدير AI')}
      </Text>
      <Text style={[S.ftrTxt, isAR ? { fontFamily: 'Cairo', letterSpacing: 0 } : {}]}
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `${pageNumber} ${l('of', 'من')} ${totalPages}`} />
    </View>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <View style={S.track}>
      <View style={[S.fill, { width: `${Math.max(2, Math.round(value))}%`, backgroundColor: color }]} />
    </View>
  );
}

function BodyText({ text }: { text?: string | null }) {
  const { isAR, l } = usePdfLang();
  const ps = paras(text);
  const arStyle = isAR ? { fontFamily: 'Cairo', textAlign: 'right' as const, letterSpacing: 0 } : {};
  if (!ps.length) return <Text style={[S.body, { color: '#AAAACC' }, arStyle]}>{l('No data available.', 'لا توجد بيانات متاحة.')}</Text>;
  return (
    <>
      {ps.map((p, i) => <Text key={i} style={[S.body, i > 0 ? { marginTop: 8 } : {}, arStyle]}>{p}</Text>)}
    </>
  );
}

function ScoreCard({ title, score, desc, invert = false }: {
  title: string; score: number; desc?: string | null; invert?: boolean;
}) {
  const { isAR } = usePdfLang();
  const color = sColor(score, invert);
  const arT = isAR ? { fontFamily: 'Cairo', textAlign: 'right' as const, letterSpacing: 0 } : {};
  return (
    <View style={[S.card, S.flex1]} wrap={false}>
      <Text style={[S.lbl, arT]}>{title}</Text>
      <Text style={{ fontSize: 28, color, fontFamily: 'Helvetica-Bold', lineHeight: 1, marginTop: 2 }}>
        {Math.round(score)}
      </Text>
      <Text style={{ fontSize: 7, color: INK3, fontFamily: 'Helvetica' }}>/100</Text>
      <Bar value={score} color={color} />
      {desc && (
        <Text style={[S.body, { fontSize: 7.5, color: INK3, marginTop: 8 }, arT]}>{clean(desc).substring(0, 160)}</Text>
      )}
    </View>
  );
}

function SwotCell({ title, items, gold }: { title: string; items: string[]; gold: boolean }) {
  const { isAR } = usePdfLang();
  const arT = isAR ? { fontFamily: 'Cairo', textAlign: 'right' as const, letterSpacing: 0 } : {};
  const clean_items = items.map(i => clean(i)).filter(i => i.length > 2).slice(0, 5);
  return (
    <View style={[S.card, S.flex1]} wrap={false}>
      <Text style={[S.lbl, gold ? { color: GOLD } : {}, arT]}>{title}</Text>
      {clean_items.map((item, i) => (
        <View key={i} style={[S.row, { marginTop: 6, alignItems: 'flex-start', flexDirection: isAR ? 'row-reverse' : 'row' }]}>
          <Text style={{ fontSize: 7, color: gold ? GOLD : INK3, marginRight: isAR ? 0 : 5, marginLeft: isAR ? 5 : 0, marginTop: 1 }}>•</Text>
          <Text style={[S.body, { fontSize: 8, flex: 1 }, arT]}>{item}</Text>
        </View>
      ))}
      {!clean_items.length && <NoDataText />}
    </View>
  );
}

function NoDataText() {
  const { l } = usePdfLang();
  return <Text style={[S.body, { fontSize: 8, color: '#AAAACC' }]}>{l('No data.', 'لا توجد بيانات.')}</Text>;
}

function RiskCard({ risk }: { risk: PdfRiskItem }) {
  const { l, isAR } = usePdfLang();
  const arT = isAR ? { fontFamily: 'Cairo', textAlign: 'right' as const, letterSpacing: 0 } : {};
  const cfg = {
    Low:    { c: GREEN, bg: '#EBF7F1', b: '#A8D8BD' },
    Medium: { c: GOLD,  bg: '#FAF5E9', b: GOLD_BORDER },
    High:   { c: RED,   bg: '#FAE8E8', b: '#D8A0A0' },
  }[risk.severity];
  return (
    <View style={[S.card, { marginBottom: 10 }]} wrap={false}>
      <View style={{ height: 2, backgroundColor: cfg.c, borderRadius: 1, marginBottom: 10 }} />
      <View style={[S.row, { justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, flexDirection: isAR ? 'row-reverse' : 'row' }]}>
        <Text style={{ fontSize: 9, color: INK, fontFamily: isAR ? 'Cairo' : 'Helvetica-Bold', flex: 1, marginRight: isAR ? 0 : 10, marginLeft: isAR ? 10 : 0, textAlign: isAR ? 'right' : 'left' }}>
          {risk.title}
        </Text>
        <View style={{ borderRadius: 3, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: cfg.bg, borderWidth: 0.5, borderColor: cfg.b, borderStyle: 'solid' }}>
          <Text style={{ fontSize: isAR ? 8 : 7, color: cfg.c, fontFamily: isAR ? 'Cairo' : 'Helvetica-Bold', letterSpacing: 0 }}>
            {l(
              risk.severity.toUpperCase(),
              risk.severity === 'Low' ? 'منخفض' : risk.severity === 'Medium' ? 'متوسط' : 'عالٍ'
            )}
          </Text>
        </View>
      </View>
      {risk.description && risk.description !== risk.title && (
        <Text style={[S.body, { fontSize: 8.5 }, arT]}>{clean(risk.description).substring(0, 280)}</Text>
      )}
      {risk.mitigation && (
        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: BORDER, borderTopStyle: 'solid' }}>
          <Text style={[S.lblGold, arT]}>{l('Mitigation Strategy', 'استراتيجية التخفيف')}</Text>
          <Text style={[S.body, { fontSize: 8.5 }, arT]}>{risk.mitigation}</Text>
        </View>
      )}
    </View>
  );
}

function CompCard({ c }: { c: PdfCompetitor }) {
  const { l, isAR } = usePdfLang();
  const arT = isAR ? { fontFamily: 'Cairo', textAlign: 'right' as const, letterSpacing: 0 } : {};
  return (
    <View style={S.card} wrap={false}>
      <Text style={{ fontSize: 10, color: INK, fontFamily: isAR ? 'Cairo' : 'Helvetica-Bold', textAlign: isAR ? 'right' : 'left', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: BORDER, borderBottomStyle: 'solid' }}>
        {c.name}
      </Text>
      {c.strength && (
        <View style={{ marginBottom: 8 }}>
          <Text style={[S.lbl, arT]}>{l('Main Strength', 'نقطة القوة الرئيسية')}</Text>
          <Text style={[S.body, { fontSize: 8.5 }, arT]}>{c.strength}</Text>
        </View>
      )}
      {c.gap && (
        <View style={{ marginBottom: 8 }}>
          <Text style={[S.lbl, arT]}>{l('Market Gap', 'الفجوة في السوق')}</Text>
          <Text style={[S.body, { fontSize: 8.5 }, arT]}>{c.gap}</Text>
        </View>
      )}
      {c.differentiation && (
        <View>
          <Text style={[S.lblGold, arT]}>{l('How to Win', 'كيفية الفوز')}</Text>
          <Text style={[S.body, { fontSize: 8.5, color: '#7A6520' }, arT]}>{c.differentiation}</Text>
        </View>
      )}
    </View>
  );
}

function PhaseCard({ phase, accent }: { phase: PdfRoadmapPhase; accent: string }) {
  const { l, isAR } = usePdfLang();
  const arT = isAR ? { fontFamily: 'Cairo', textAlign: 'right' as const, letterSpacing: 0 } : {};
  return (
    <View style={[S.card, { marginBottom: 10 }]} wrap={false}>
      <View style={{ height: 2, backgroundColor: accent, borderRadius: 1, marginBottom: 10 }} />
      <View style={[S.row, { marginBottom: 10, alignItems: 'flex-start', flexDirection: isAR ? 'row-reverse' : 'row' }]}>
        <View style={{ flex: 1 }}>
          <Text style={[S.lbl, { color: accent === GOLD ? GOLD : INK3 }, arT]}>{phase.label}</Text>
          <Text style={{ fontSize: 12, color: INK, fontFamily: isAR ? 'Cairo' : 'Helvetica-Bold', marginTop: 1, textAlign: isAR ? 'right' : 'left' }}>{phase.period}</Text>
        </View>
        {phase.kpi && (
          <View style={{ maxWidth: 220, paddingLeft: isAR ? 0 : 16, paddingRight: isAR ? 16 : 0 }}>
            <Text style={[S.lbl, arT]}>{l('Target KPI', 'مؤشر الأداء المستهدف')}</Text>
            <Text style={[S.body, { fontSize: 8.5 }, arT]}>{phase.kpi}</Text>
          </View>
        )}
      </View>
      <View style={{ borderTopWidth: 0.5, borderTopColor: BORDER, borderTopStyle: 'solid', paddingTop: 8 }}>
        {phase.tasks.slice(0, 5).map((task, i) => (
          <View key={i} style={[S.row, { marginTop: i > 0 ? 5 : 0, alignItems: 'flex-start', flexDirection: isAR ? 'row-reverse' : 'row' }]}>
            <Text style={{ fontSize: 8, color: accent, marginRight: isAR ? 0 : 6, marginLeft: isAR ? 6 : 0, fontFamily: 'Helvetica-Bold', marginTop: 0.5 }}>›</Text>
            <Text style={[S.body, { fontSize: 8.5, flex: 1 }, arT]}>{task}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Content page wrapper ────────────────────────────────────────────────────

function ContentPage({ label, startup, children }: {
  label: string; startup: string; children: React.ReactNode;
}) {
  return (
    <Page size="A4" style={S.content}>
      <GoldTopBar />
      <Header label={label} startup={startup} />
      {children}
      <Footer />
    </Page>
  );
}

// ─── Pair-up helper for 2-column grids ──────────────────────────────────────

function pair<T>(arr: T[]): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) result.push(arr.slice(i, i + 2));
  return result;
}

// ─── Main document ───────────────────────────────────────────────────────────

export default function PdfReport({
  project, analysis, scores, swot, risks, roadmapPhases, recommendations, competitors, reportDate,
  language = 'en',
}: PdfReportProps) {
  const isAR = language === 'ar';
  const l = (en: string, ar: string) => isAR ? ar : en;
  const readiness = scores?.investmentReadiness ?? 0;
  const v = verdict(readiness, l);
  const fs = scores ? factors(scores, l) : [];
  const phaseAccents = [GOLD, '#3D6080', '#4D7090', '#5D8090'];
  // Arabic layout helpers — applied inline wherever Helvetica appears in Arabic context
  type Ar = { fontFamily?: string; textAlign?: 'right' | 'left' | 'center' | 'justify'; letterSpacing?: number };
  const arF:  Ar = isAR ? { fontFamily: 'Cairo', textAlign: 'right', letterSpacing: 0 } : {};
  const arFB: Ar = isAR ? { fontFamily: 'Cairo', textAlign: 'right', letterSpacing: 0 } : { fontFamily: 'Helvetica-Bold' };
  const arLbl: Ar = isAR ? { fontFamily: 'Cairo', textAlign: 'right', letterSpacing: 0 } : {};

  return (
    <PdfLangCtx.Provider value={{ isAR, l }}>
    <Document
      title={`${project.title} — Jadeer Strategy Report`}
      author="Jadeer AI"
      subject="Venture Strategy Analysis"
      creator="Jadeer"
      producer="Jadeer — jadeer.ai"
    >
      {/* ═══════════════════════════════════════════════════════════════
          PAGE 1 — COVER
          ═══════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.cover}>
        {/* Gold top strip */}
        <View style={{ height: 4, backgroundColor: GOLD }} />

        <View style={S.coverBody}>
          {/* Logo + confidential row */}
          <View style={[S.row, { justifyContent: 'space-between', alignItems: 'center' }]}>
            <JadeerLogo size={20} dark />
            <Text style={[S.coverConf, isAR ? { fontFamily: 'Cairo', letterSpacing: 0, fontSize: 9 } : {}]}>{l('CONFIDENTIAL', 'سري')}</Text>
          </View>

          {/* Main content */}
          <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 32 }}>
            <Text style={[S.coverType, arLbl]}>{l('VENTURE STRATEGY REPORT', 'تقرير استراتيجية المشروع')}</Text>
            <Text style={[S.coverTitle, arFB]}>{project.title}</Text>
            {project.ideaSummary && (
              <Text style={[S.coverIdea, arF]}>{clean(project.ideaSummary).substring(0, 220)}</Text>
            )}

            {(project.industry || project.targetMarket) && (
              <View style={[S.row, { marginTop: 22, flexDirection: isAR ? 'row-reverse' : 'row' }]}>
                {project.industry && (
                  <View style={{ marginRight: isAR ? 0 : 28, marginLeft: isAR ? 28 : 0 }}>
                    <Text style={[S.coverMetaLabel, arLbl]}>{l('INDUSTRY', 'القطاع')}</Text>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: isAR ? 'Cairo' : 'Helvetica', marginTop: 3, textAlign: isAR ? 'right' : 'left' }}>
                      {project.industry}
                    </Text>
                  </View>
                )}
                {project.targetMarket && (
                  <View>
                    <Text style={[S.coverMetaLabel, arLbl]}>{l('TARGET MARKET', 'السوق المستهدف')}</Text>
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: isAR ? 'Cairo' : 'Helvetica', marginTop: 3, textAlign: isAR ? 'right' : 'left' }}>
                      {project.targetMarket}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Bottom row */}
          <View>
            <View style={S.coverDiv} />
            <View style={[S.row, { justifyContent: 'space-between', alignItems: 'flex-end' }]}>
              <View>
                <Text style={[S.coverMetaLabel, arLbl]}>{l('REPORT DATE', 'تاريخ التقرير')}</Text>
                <Text style={[S.coverMetaValue, arF]}>{reportDate}</Text>
                <View style={{ marginTop: 14 }}>
                  <Text style={[S.coverMetaLabel, arLbl]}>{l('GENERATED BY', 'أُنشئ بواسطة')}</Text>
                  <Text style={[S.coverMetaValue, arF]}>Jadeer AI · jadeer.ai</Text>
                </View>
              </View>
              {scores && (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[S.coverScoreLabel, arLbl]}>{l('INVESTMENT READINESS SCORE', 'نقاط الجاهزية الاستثمارية')}</Text>
                  <View style={[S.row, { alignItems: 'flex-end', marginTop: 4 }]}>
                    <Text style={S.coverScoreNum}>{Math.round(readiness)}</Text>
                    <Text style={S.coverScoreDen}>/100</Text>
                  </View>
                  <View style={{ height: 2, backgroundColor: GOLD, borderRadius: 1, marginTop: 8, width: `${Math.round(readiness)}%`, alignSelf: 'flex-end' }} />
                  <Text style={[S.coverMetaLabel, { marginTop: 6, color: v.color }, arLbl]}>
                    {isAR ? v.text : v.text.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 2 — EXECUTIVE SUMMARY
          ═══════════════════════════════════════════════════════════════ */}
      <ContentPage label={l('Executive Summary', 'الملخص التنفيذي')} startup={project.title}>
        <Text style={[S.secTitle, arFB]}>{l('Executive Summary', 'الملخص التنفيذي')}</Text>
        <Text style={[S.secSub, arF]}>{l('AI-generated strategic overview of your venture', 'نظرة عامة استراتيجية مُنشأة بالذكاء الاصطناعي على مشروعك')}</Text>

        <View style={S.card} wrap={false}>
          <BodyText text={analysis.executiveSummary} />
        </View>

        {scores && (
          <View style={{ marginTop: 20 }}>
            <Text style={[S.secLabel, { marginBottom: 10 }, arLbl]}>{l('AT A GLANCE', 'لمحة سريعة')}</Text>
            <View style={[S.row, { flexDirection: isAR ? 'row-reverse' : 'row' }]}>
              {/* Readiness circle */}
              <View style={[S.goldCard, { width: 130, alignItems: 'center', justifyContent: 'center', paddingVertical: 22, marginRight: isAR ? 0 : 12, marginLeft: isAR ? 12 : 0 }]} wrap={false}>
                <Text style={[S.lbl, { textAlign: 'center' }, arLbl]}>{l('READINESS', 'الجاهزية')}</Text>
                <Text style={{ fontSize: 38, color: GOLD, fontFamily: 'Helvetica-Bold', lineHeight: 1, marginTop: 6 }}>
                  {Math.round(readiness)}
                </Text>
                <Text style={{ fontSize: 8, color: INK3, fontFamily: 'Helvetica', marginTop: 2 }}>/100</Text>
                <Bar value={readiness} color={GOLD} />
                <Text style={{ fontSize: 7, color: v.color, fontFamily: isAR ? 'Cairo' : 'Helvetica-Bold', marginTop: 7, textAlign: 'center', letterSpacing: 0 }}>
                  {isAR ? v.text : v.text.toUpperCase()}
                </Text>
              </View>
              {/* 3×2 score grid */}
              <View style={{ flex: 1 }}>
                <View style={[S.row, { flexDirection: isAR ? 'row-reverse' : 'row' }]}>
                  {[
                    { label: l('Venture Score', 'نقاط المشروع'), v: scores.ventureScore },
                    { label: l('Innovation', 'الابتكار'), v: scores.innovationScore },
                    { label: l('Market', 'السوق'), v: scores.marketScore },
                  ].map((item, i) => (
                    <View key={i} style={[S.card, { flex: 1, marginLeft: i > 0 ? 6 : 0, marginBottom: 6 }]} wrap={false}>
                      <Text style={[S.lbl, arLbl]}>{isAR ? item.label : item.label.toUpperCase()}</Text>
                      <Text style={{ fontSize: 20, color: sColor(item.v), fontFamily: 'Helvetica-Bold', marginTop: 2 }}>{item.v}</Text>
                      <Bar value={item.v} color={sColor(item.v)} />
                    </View>
                  ))}
                </View>
                <View style={[S.row, { flexDirection: isAR ? 'row-reverse' : 'row' }]}>
                  {[
                    { label: l('Revenue', 'الإيرادات'), v: scores.revenuePotential },
                    { label: l('Risk Profile', 'ملف المخاطر'), v: scores.riskScore, invert: true },
                    { label: l('Execution', 'التنفيذ'), v: Math.round((scores.ventureScore + readiness) / 2) },
                  ].map((item, i) => (
                    <View key={i} style={[S.card, { flex: 1, marginLeft: i > 0 ? 6 : 0 }]} wrap={false}>
                      <Text style={[S.lbl, arLbl]}>{isAR ? item.label : item.label.toUpperCase()}</Text>
                      <Text style={{ fontSize: 20, color: sColor(item.v, item.invert), fontFamily: 'Helvetica-Bold', marginTop: 2 }}>
                        {item.v}
                      </Text>
                      <Bar value={item.v} color={sColor(item.v, item.invert)} />
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}
      </ContentPage>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 3 — INVESTMENT READINESS ANALYSIS
          ═══════════════════════════════════════════════════════════════ */}
      {scores && (
        <ContentPage label={l('Investment Readiness Analysis', 'تحليل جاهزية الاستثمار')} startup={project.title}>
          <Text style={[S.secTitle, arFB]}>{l('Why This Score?', 'لماذا هذه النقاط؟')}</Text>
          <Text style={[S.secSub, arF]}>{l('Breakdown of investment readiness factors and strategic assessment', 'تفصيل عوامل الجاهزية الاستثمارية والتقييم الاستراتيجي')}</Text>

          <View style={[S.row, { flexDirection: isAR ? 'row-reverse' : 'row' }]}>
            {/* Left: explanation + factors */}
            <View style={{ flex: 2, marginRight: isAR ? 0 : 14, marginLeft: isAR ? 14 : 0 }}>
              {scores.investmentReadinessExplanation && (
                <View style={[S.card, { marginBottom: 12 }]} wrap={false}>
                  <Text style={[S.lbl, arLbl]}>{l('STRATEGIC ASSESSMENT', 'التقييم الاستراتيجي')}</Text>
                  <Text style={[S.body, { marginTop: 5 }, arF]}>{clean(scores.investmentReadinessExplanation)}</Text>
                </View>
              )}
              <View style={S.card} wrap={false}>
                <Text style={[S.lbl, { marginBottom: 12 }, arLbl]}>{l('KEY READINESS FACTORS', 'عوامل الجاهزية الرئيسية')}</Text>
                {fs.map((f, i) => (
                  <View key={i} style={[S.row, { marginTop: i > 0 ? 10 : 0, alignItems: 'flex-start', flexDirection: isAR ? 'row-reverse' : 'row' }]}>
                    <Text style={{
                      fontSize: 11, fontFamily: 'Helvetica-Bold', marginRight: isAR ? 0 : 10, marginLeft: isAR ? 10 : 0, marginTop: -1,
                      color: f.type === 'pos' ? GREEN : f.type === 'neg' ? RED : INK3,
                    }}>
                      {f.type === 'pos' ? '✓' : f.type === 'neg' ? '!' : '—'}
                    </Text>
                    <Text style={[S.body, { flex: 1 }, arF]}>{f.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Right: verdict */}
            <View style={{ width: 150 }}>
              <View style={[S.goldCard, { padding: 18, alignItems: 'center' }]} wrap={false}>
                <Text style={[S.lbl, { textAlign: 'center', marginBottom: 10 }, arLbl]}>{l('VERDICT', 'الحكم')}</Text>
                <View style={{
                  borderRadius: 4, paddingHorizontal: 10, paddingVertical: 5,
                  backgroundColor: `${v.color}18`, borderWidth: 0.5,
                  borderColor: `${v.color}50`, borderStyle: 'solid', marginBottom: 16,
                }}>
                  <Text style={{ fontSize: isAR ? 9 : 7.5, color: v.color, fontFamily: isAR ? 'Cairo' : 'Helvetica-Bold', textAlign: 'center', letterSpacing: 0 }}>
                    {isAR ? v.text : v.text.toUpperCase()}
                  </Text>
                </View>
                <Text style={{ fontSize: 46, color: v.color, fontFamily: 'Helvetica-Bold', lineHeight: 1 }}>
                  {Math.round(readiness)}
                </Text>
                <Text style={{ fontSize: 9, color: INK3, fontFamily: 'Helvetica', marginTop: 3, marginBottom: 8 }}>/100</Text>
                <Bar value={readiness} color={v.color} />
              </View>
            </View>
          </View>
        </ContentPage>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 4 — VENTURE SCORE BREAKDOWN
          ═══════════════════════════════════════════════════════════════ */}
      {scores && (
        <ContentPage label={l('Venture Score Breakdown', 'تفصيل نقاط المشروع')} startup={project.title}>
          <Text style={[S.secTitle, arFB]}>{l('Venture Score Breakdown', 'تفصيل نقاط المشروع')}</Text>
          <Text style={[S.secSub, arF]}>{l('AI-evaluated across six critical dimensions of startup performance', 'تقييم بالذكاء الاصطناعي عبر ستة أبعاد محورية لأداء المشروع')}</Text>

          <View style={[S.row, { marginTop: 4, marginBottom: 8, flexDirection: isAR ? 'row-reverse' : 'row' }]}>
            <ScoreCard title={l('Venture Score', 'نقاط المشروع')} score={scores.ventureScore} desc={scores.ventureScoreExplanation} />
            <View style={{ width: 8 }} />
            <ScoreCard title={l('Innovation', 'الابتكار')} score={scores.innovationScore} desc={scores.innovationScoreExplanation} />
            <View style={{ width: 8 }} />
            <ScoreCard title={l('Market Score', 'نقاط السوق')} score={scores.marketScore} desc={scores.marketScoreExplanation} />
          </View>
          <View style={[S.row, { flexDirection: isAR ? 'row-reverse' : 'row' }]}>
            <ScoreCard title={l('Risk Profile', 'ملف المخاطر')} score={scores.riskScore} desc={scores.riskScoreExplanation} invert />
            <View style={{ width: 8 }} />
            <ScoreCard title={l('Revenue Potential', 'إمكانات الإيرادات')} score={scores.revenuePotential} desc={scores.revenuePotentialExplanation} />
            <View style={{ width: 8 }} />
            <ScoreCard title={l('Investment Readiness', 'جاهزية الاستثمار')} score={scores.investmentReadiness} desc={scores.investmentReadinessExplanation} />
          </View>

          <View style={[S.card, { marginTop: 14 }]} wrap={false}>
            <Text style={[S.lbl, arLbl]}>{l('HOW TO READ THESE SCORES', 'كيفية قراءة هذه النقاط')}</Text>
            <Text style={[S.body, { marginTop: 6 }, arF]}>
              {l(
                'Scores ≥ 70 indicate strong performance. Scores 45–70 represent areas with potential requiring focused execution. Scores below 45 need strategic attention before seeking investment. Risk Profile is inverted — a lower Risk Profile score indicates higher risk exposure to the venture.',
                'النقاط ≥ 70 تشير إلى أداء قوي. النقاط 45–70 تمثل مجالات ذات إمكانات تتطلب تنفيذاً مركّزاً. النقاط أقل من 45 تحتاج اهتماماً استراتيجياً قبل طلب الاستثمار. ملف المخاطر مقلوب — نقاط أقل تعني مخاطر أعلى.'
              )}
            </Text>
          </View>
        </ContentPage>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 5 — BUSINESS MODEL
          ═══════════════════════════════════════════════════════════════ */}
      <ContentPage label={l('Business Model', 'نموذج العمل')} startup={project.title}>
        <Text style={[S.secTitle, arFB]}>{l('Business Model', 'نموذج العمل')}</Text>
        <Text style={[S.secSub, arF]}>{l('How your startup creates, delivers, and captures value', 'كيف تُنشئ شركتك القيمة وتُوصلها وتُحققها')}</Text>
        <View style={S.card}>
          <BodyText text={analysis.businessModel} />
        </View>
      </ContentPage>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 6 — SWOT ANALYSIS
          ═══════════════════════════════════════════════════════════════ */}
      <ContentPage label={l('SWOT Analysis', 'تحليل SWOT')} startup={project.title}>
        <Text style={[S.secTitle, arFB]}>{l('SWOT Matrix', 'مصفوفة SWOT')}</Text>
        <Text style={[S.secSub, arF]}>{l("Strategic assessment of your venture's internal and external position", 'تقييم استراتيجي للوضع الداخلي والخارجي للمشروع')}</Text>
        {swot ? (
          <View style={{ marginTop: 4 }}>
            <View style={[S.row, { marginBottom: 8, flexDirection: isAR ? 'row-reverse' : 'row' }]}>
              <SwotCell title={l('Strengths', 'نقاط القوة')}     items={swot.strengths    ?? []} gold />
              <View style={{ width: 8 }} />
              <SwotCell title={l('Weaknesses', 'نقاط الضعف')}    items={swot.weaknesses   ?? []} gold={false} />
            </View>
            <View style={[S.row, { flexDirection: isAR ? 'row-reverse' : 'row' }]}>
              <SwotCell title={l('Opportunities', 'الفرص')} items={swot.opportunities ?? []} gold />
              <View style={{ width: 8 }} />
              <SwotCell title={l('Threats', 'التهديدات')}       items={swot.threats      ?? []} gold={false} />
            </View>
          </View>
        ) : (
          <View style={[S.card, { marginTop: 4 }]}>
            <Text style={[S.body, { color: '#AAAACC' }]}>{l('SWOT data not available.', 'بيانات SWOT غير متاحة.')}</Text>
          </View>
        )}
      </ContentPage>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 7 — MARKET & CUSTOMER ANALYSIS
          ═══════════════════════════════════════════════════════════════ */}
      <ContentPage label={l('Market & Customer Analysis', 'تحليل السوق والعملاء')} startup={project.title}>
        <Text style={[S.secTitle, arFB]}>{l('Market Opportunity', 'فرص السوق')}</Text>
        <Text style={[S.secSub, arF]}>{l('Total addressable market, growth drivers, and competitive dynamics', 'إجمالي السوق القابل للاستهداف ومحركات النمو والديناميكيات التنافسية')}</Text>
        <View style={S.card} wrap={false}>
          <BodyText text={analysis.marketOpportunity} />
        </View>

        <View style={[S.div, { marginVertical: 20 }]} />

        <Text style={[S.secTitle, arFB]}>{l('Customer Persona', 'ملف العميل')}</Text>
        <Text style={[S.secSub, arF]}>{l('Primary customer profile, behaviors, and unmet needs', 'الملف الأساسي للعميل وسلوكياته واحتياجاته غير الملباة')}</Text>
        <View style={S.card} wrap={false}>
          <BodyText text={analysis.customerPersona} />
        </View>
      </ContentPage>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 8 — RISK ASSESSMENT
          ═══════════════════════════════════════════════════════════════ */}
      <ContentPage label={l('Risk Assessment', 'تقييم المخاطر')} startup={project.title}>
        <Text style={[S.secTitle, arFB]}>{l('Risk Assessment', 'تقييم المخاطر')}</Text>
        <Text style={[S.secSub, arF]}>{l('Key risks with severity ratings and recommended mitigation strategies', 'المخاطر الرئيسية مع تقييمات الخطورة واستراتيجيات التخفيف الموصى بها')}</Text>
        <View style={{ marginTop: 6 }}>
          {risks.length > 0
            ? risks.slice(0, 5).map((r, i) => <RiskCard key={i} risk={r} />)
            : (
              <View style={S.card}>
                <BodyText text={typeof analysis.riskAnalysis === 'string' ? analysis.riskAnalysis : null} />
              </View>
            )
          }
        </View>
      </ContentPage>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 9 — REVENUE MODEL & GO-TO-MARKET
          ═══════════════════════════════════════════════════════════════ */}
      <ContentPage label={l('Revenue Model & Go-to-Market', 'نموذج الإيرادات والدخول للسوق')} startup={project.title}>
        <Text style={[S.secTitle, arFB]}>{l('Revenue Model', 'نموذج الإيرادات')}</Text>
        <Text style={[S.secSub, arF]}>{l('Revenue streams, pricing strategy, and path to profitability', 'مصادر الإيرادات واستراتيجية التسعير ومسار الربحية')}</Text>
        <View style={S.card} wrap={false}>
          <BodyText text={analysis.revenueModel} />
        </View>

        <View style={[S.div, { marginVertical: 20 }]} />

        <Text style={[S.secTitle, arFB]}>{l('Go-to-Market Strategy', 'استراتيجية الدخول للسوق')}</Text>
        <Text style={[S.secSub, arF]}>{l('Customer acquisition approach, channels, and market entry plan', 'نهج اكتساب العملاء والقنوات وخطة دخول السوق')}</Text>
        <View style={S.card} wrap={false}>
          <BodyText text={analysis.goToMarketStrategy} />
        </View>
      </ContentPage>

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 10 — COMPETITIVE LANDSCAPE
          ═══════════════════════════════════════════════════════════════ */}
      {analysis.competitorAnalysis && (
        <ContentPage label={l('Competitive Landscape', 'المشهد التنافسي')} startup={project.title}>
          <Text style={[S.secTitle, arFB]}>{l('Competitive Landscape', 'المشهد التنافسي')}</Text>
          <Text style={[S.secSub, arF]}>{l('Key players in the market and your differentiation strategy', 'اللاعبون الرئيسيون في السوق واستراتيجية تميّزك')}</Text>

          {competitors && competitors.length >= 2 ? (
            <View style={{ marginTop: 6 }}>
              {pair(competitors).map((row, ri) => (
                <View key={ri} style={[S.row, { marginBottom: 8, flexDirection: isAR ? 'row-reverse' : 'row' }]}>
                  <View style={S.flex1}><CompCard c={row[0]} /></View>
                  {row[1] ? (
                    <><View style={{ width: 8 }} /><View style={S.flex1}><CompCard c={row[1]} /></View></>
                  ) : (
                    <View style={S.flex1} />
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={[S.card, { marginTop: 6 }]}>
              <BodyText text={analysis.competitorAnalysis} />
            </View>
          )}
        </ContentPage>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 11 — EXECUTION ROADMAP
          ═══════════════════════════════════════════════════════════════ */}
      {analysis.startupRoadmap && (
        <ContentPage label={l('Execution Roadmap', 'خارطة طريق التنفيذ')} startup={project.title}>
          <Text style={[S.secTitle, arFB]}>{l('Execution Roadmap', 'خارطة طريق التنفيذ')}</Text>
          <Text style={[S.secSub, arF]}>{l('Your 90-day action plan with milestones, tasks, and KPIs', 'خطة عمل 90 يوماً بالمراحل والمهام ومؤشرات الأداء')}</Text>
          <View style={{ marginTop: 6 }}>
            {roadmapPhases.length >= 2
              ? roadmapPhases.map((ph, i) => <PhaseCard key={i} phase={ph} accent={phaseAccents[i] ?? phaseAccents[phaseAccents.length - 1]} />)
              : <View style={S.card}><BodyText text={analysis.startupRoadmap} /></View>
            }
          </View>
        </ContentPage>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          PAGE 12 — STRATEGIC RECOMMENDATIONS
          ═══════════════════════════════════════════════════════════════ */}
      {recommendations.length > 0 && (
        <ContentPage label={l('Strategic Recommendations', 'التوصيات الاستراتيجية')} startup={project.title}>
          <Text style={[S.secTitle, arFB]}>{l('Top Strategic Recommendations', 'التوصيات الاستراتيجية العليا')}</Text>
          <Text style={[S.secSub, arF]}>{l('Highest-priority next actions to accelerate your venture', 'أولى الخطوات ذات الأولوية لتسريع نمو مشروعك')}</Text>
          <View style={{ marginTop: 8 }}>
            {recommendations.slice(0, 5).map((rec, i) => (
              <View key={i} style={[S.row, { marginBottom: 10, alignItems: 'flex-start', flexDirection: isAR ? 'row-reverse' : 'row' }]} wrap={false}>
                <View style={{
                  width: 28, height: 28, borderRadius: 5,
                  backgroundColor: GOLD_SOFT, borderWidth: 0.5, borderColor: GOLD_BORDER, borderStyle: 'solid',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  marginRight: isAR ? 0 : 12, marginLeft: isAR ? 12 : 0,
                }}>
                  <Text style={{ fontSize: 10, color: GOLD, fontFamily: 'Helvetica-Bold' }}>
                    {String(i + 1).padStart(2, '0')}
                  </Text>
                </View>
                <View style={[S.card, { flex: 1, paddingVertical: 10 }]}>
                  <Text style={[S.body, arF]}>{clean(rec)}</Text>
                </View>
              </View>
            ))}
          </View>
        </ContentPage>
      )}
    </Document>
    </PdfLangCtx.Provider>
  );
}
