import { useState, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import {
  useGetProject, useGetAnalysis, useImproveAnalysis,
  getGetProjectQueryKey, getGetAnalysisQueryKey, useTranslateDescription
} from "@workspace/api-client-react";
import { format } from "date-fns";
import Layout from "../components/Layout";
import ProjectActionsMenu from "../components/ProjectActionsMenu";
import { NetworkCanvas } from "../components/NetworkCanvas";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, Zap, ChevronLeft, Target, ShieldAlert, BarChart3,
  Users, Briefcase, Activity, CheckCircle2, TrendingUp, AlertTriangle,
  Calendar, Loader2, Minus, Lightbulb, Map
} from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from "recharts";
import { useI18n } from "../lib/i18n";

// ─────────────────────────────────────────────
// THINKING STAGE — AI Reasoning Experience
// ─────────────────────────────────────────────

const STAGES = [
  { key: 'thinking.s1', icon: ScanIcon },
  { key: 'thinking.s2', icon: NetworkIcon },
  { key: 'thinking.s3', icon: RadarIcon },
  { key: 'thinking.s4', icon: ShieldIcon },
  { key: 'thinking.s5', icon: ChartIcon },
  { key: 'thinking.s6', icon: LayersIcon },
  { key: 'thinking.s7', icon: DiamondIcon },
  { key: 'thinking.s8', icon: SealIcon },
];

function ThinkingStage() {
  const [stage, setStage] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const { t } = useI18n();

  useEffect(() => {
    const interval = setInterval(() => {
      setStage(s => Math.min(s + 1, STAGES.length - 1));
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const target = ((stage + 1) / STAGES.length) * 100;
    const step = setInterval(() => {
      setConfidence(c => {
        const next = c + (target - c) * 0.08;
        return Math.abs(next - target) < 0.1 ? target : next;
      });
    }, 30);
    return () => clearInterval(step);
  }, [stage]);

  const StageIcon = STAGES[stage].icon;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-hidden">
      <div className="absolute inset-0">
        <NetworkCanvas intensity={0.78} className="absolute inset-0 w-full h-full" />
      </div>
      <div className="absolute inset-0 bg-radial-[ellipse_60%_60%_at_50%_50%] from-background/0 via-background/30 to-background/90 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm px-8 text-center">
        <div className="flex justify-center mb-14">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <img src="/logo.svg" alt="Jadeer" className="w-5 h-5" />
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={stage}
              initial={{ opacity: 0, scale: 0.7, filter: "blur(8px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.2, filter: "blur(8px)" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <StageIcon />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="h-8 relative mb-10">
          <AnimatePresence mode="wait">
            <motion.p
              key={stage}
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ duration: 0.45 }}
              className="absolute inset-0 flex justify-center text-base font-light text-white/70"
            >
              {t(STAGES[stage].key)}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="flex justify-center gap-1.5 mb-8">
          {STAGES.map((_, i) => (
            <motion.div
              key={i}
              animate={{ width: i === stage ? 20 : 4, opacity: i <= stage ? 1 : 0.2 }}
              transition={{ duration: 0.4 }}
              className="h-1 rounded-full"
              style={{ background: i <= stage ? '#C9A84C' : 'rgba(255,255,255,0.2)' }}
            />
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/25">
            <span>{t('thinking.confidence')}</span>
            <span style={{ color: 'rgba(201,168,76,0.7)' }}>{Math.round(confidence)}%</span>
          </div>
          <div className="h-px w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                width: `${confidence}%`,
                background: 'linear-gradient(90deg, rgba(201,168,76,0.5), #C9A84C)',
                boxShadow: '0 0 8px rgba(201,168,76,0.4)'
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STAGE ICON COMPONENTS
// ─────────────────────────────────────────────

function ScanIcon() {
  return (
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden relative"
      style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
      <motion.div
        className="absolute left-2 right-2 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)' }}
        animate={{ top: ['20%', '80%', '20%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="w-7 h-7 border rounded-sm opacity-30" style={{ borderColor: '#C9A84C' }} />
    </div>
  );
}

function NetworkIcon() {
  const nodes = [{ x: 12, y: 8 }, { x: 28, y: 12 }, { x: 8, y: 24 }, { x: 26, y: 26 }, { x: 18, y: 18 }];
  return (
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
      style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
      <svg viewBox="0 0 36 36" className="w-8 h-8">
        {nodes.map((a, i) => nodes.slice(i + 1).map((b, j) => (
          <motion.line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke="rgba(201,168,76,0.4)" strokeWidth="0.8"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
            transition={{ delay: (i + j) * 0.15, duration: 0.6 }} />
        )))}
        {nodes.map((n, i) => (
          <motion.circle key={i} cx={n.x} cy={n.y} r="2.5" fill="#C9A84C"
            initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }}
            transition={{ delay: i * 0.12, duration: 0.4 }} />
        ))}
      </svg>
    </div>
  );
}

function RadarIcon() {
  return (
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
      style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
      <svg viewBox="0 0 36 36" className="w-8 h-8">
        <circle cx="18" cy="18" r="14" stroke="rgba(201,168,76,0.2)" strokeWidth="0.8" fill="none" />
        <circle cx="18" cy="18" r="9" stroke="rgba(201,168,76,0.2)" strokeWidth="0.8" fill="none" />
        <circle cx="18" cy="18" r="4" stroke="rgba(201,168,76,0.2)" strokeWidth="0.8" fill="none" />
        <motion.line x1="18" y1="18" x2="18" y2="4"
          stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"
          style={{ transformOrigin: '18px 18px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
        <circle cx="18" cy="18" r="2" fill="#C9A84C" />
      </svg>
    </div>
  );
}

function ShieldIcon() {
  return (
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
      style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
      <svg viewBox="0 0 36 36" className="w-8 h-8">
        <path d="M18 4 L30 9 L30 20 Q30 28 18 32 Q6 28 6 20 L6 9 Z"
          stroke="rgba(201,168,76,0.3)" strokeWidth="1" fill="rgba(201,168,76,0.05)" />
        <motion.path d="M18 4 L30 9 L30 20 Q30 28 18 32 Q6 28 6 20 L6 9 Z"
          stroke="#C9A84C" strokeWidth="1.2" fill="none"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} />
        <motion.circle cx="18" cy="18" r="3" fill="#C9A84C"
          animate={{ scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity }} />
      </svg>
    </div>
  );
}

function ChartIcon() {
  const bars = [{ h: 60, delay: 0 }, { h: 85, delay: 0.1 }, { h: 45, delay: 0.2 }, { h: 72, delay: 0.3 }];
  return (
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
      style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
      <svg viewBox="0 0 36 36" className="w-8 h-8">
        {bars.map((b, i) => (
          <motion.rect key={i} x={5 + i * 7} width="5" rx="1"
            fill="rgba(201,168,76,0.7)" y={32 - b.h * 0.22}
            initial={{ height: 0, y: 32 }}
            animate={{ height: b.h * 0.22, y: 32 - b.h * 0.22 }}
            transition={{ delay: b.delay, duration: 0.6, repeat: Infinity, repeatDelay: 1.2, ease: "easeOut" }} />
        ))}
        <line x1="3" y1="32" x2="33" y2="32" stroke="rgba(201,168,76,0.3)" strokeWidth="0.8" />
      </svg>
    </div>
  );
}

function LayersIcon() {
  return (
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
      style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
      <svg viewBox="0 0 36 36" className="w-8 h-8">
        {[0, 1, 2].map(i => (
          <motion.rect key={i} x="6" width="24" height="5" rx="1.5"
            fill="rgba(201,168,76,0.65)" y={10 + i * 7}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 6, opacity: 1 }}
            transition={{ delay: i * 0.2, duration: 0.5, repeat: Infinity, repeatDelay: 1, ease: "easeOut" }} />
        ))}
      </svg>
    </div>
  );
}

function DiamondIcon() {
  return (
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
      style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
      <svg viewBox="0 0 36 36" className="w-8 h-8">
        <motion.path d="M18 4 L32 18 L18 32 L4 18 Z"
          stroke="#C9A84C" strokeWidth="1.5" fill="rgba(201,168,76,0.1)"
          style={{ transformOrigin: '18px 18px' }}
          animate={{ rotate: [0, 90, 180, 270, 360] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
        <circle cx="18" cy="18" r="2.5" fill="#C9A84C" />
      </svg>
    </div>
  );
}

function SealIcon() {
  return (
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
      style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
      <svg viewBox="0 0 36 36" className="w-8 h-8">
        <rect x="8" y="6" width="20" height="24" rx="2" stroke="rgba(201,168,76,0.3)" strokeWidth="1" fill="none" />
        <motion.path d="M13 17 L16.5 20.5 L23 14"
          stroke="#C9A84C" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.5, ease: "easeOut" }} />
        <line x1="13" y1="25" x2="23" y2="25" stroke="rgba(201,168,76,0.2)" strokeWidth="1" />
        <line x1="13" y1="10" x2="23" y2="10" stroke="rgba(201,168,76,0.2)" strokeWidth="1" />
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────

interface RiskItem {
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High';
  mitigation: string;
}

interface RoadmapPhase {
  period: string;
  label: string;
  tasks: string[];
  kpi: string;
}

interface CompetitorItem {
  name: string;
  strength: string;
  gap: string;
  differentiation: string;
}

interface Scores {
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

// ─────────────────────────────────────────────
// SAFE PARSERS
// ─────────────────────────────────────────────

function cleanRaw(raw: unknown): string {
  // JSONB columns from Postgres may arrive already-parsed (as object/array).
  // Serialise them back to a string so the JSON.parse path below works.
  if (raw === null || raw === undefined) return '';
  if (typeof raw !== 'string') return JSON.stringify(raw);
  return raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
}

function inferSeverity(text: string): 'Low' | 'Medium' | 'High' {
  const t = text.toLowerCase();
  if (/\b(high|critical|severe|significant|major|serious|extreme)\b/.test(t)) return 'High';
  if (/\b(low|minor|minimal|negligible|unlikely|small)\b/.test(t)) return 'Low';
  return 'Medium';
}

function normalizeSeverity(s: string): 'Low' | 'Medium' | 'High' {
  const l = s.toLowerCase();
  if (l.includes('high') || l.includes('critical')) return 'High';
  if (l.includes('low') || l.includes('minor')) return 'Low';
  return 'Medium';
}

function parseRiskAnalysis(raw: unknown): RiskItem[] {
  if (raw === null || raw === undefined || raw === '') return [];
  const cleaned = cleanRaw(raw);

  // Attempt JSON parse
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 6).map((r: any, i: number) => ({
        title: String(r.title || r.risk || r.name || r.category || `Risk ${i + 1}`).replace(/\*\*/g, '').trim(),
        description: String(r.description || r.details || r.risk || '').replace(/\*\*/g, '').trim(),
        severity: r.severity ? normalizeSeverity(String(r.severity)) : inferSeverity(String(r.description || r.risk || '')),
        mitigation: String(r.mitigation || r.mitigation_strategy || r.solution || r.recommendation || '').replace(/\*\*/g, '').trim(),
      }));
    }
    if (typeof parsed === 'object' && parsed !== null) {
      // Handle {risk1, mitigation1, risk2, mitigation2, ...}
      const items: RiskItem[] = [];
      for (let i = 1; i <= 8; i++) {
        const risk = (parsed as any)[`risk${i}`] || (parsed as any)[`Risk${i}`] || (parsed as any)[`risk_${i}`];
        if (!risk) break;
        const mitigation = (parsed as any)[`mitigation${i}`] || (parsed as any)[`Mitigation${i}`] || (parsed as any)[`solution${i}`] || '';
        const riskStr = String(risk).replace(/\*\*/g, '');
        const colonIdx = riskStr.indexOf(':');
        items.push({
          title: (colonIdx > 0 ? riskStr.substring(0, colonIdx) : riskStr.split('.')[0]).trim().substring(0, 80),
          description: riskStr,
          severity: inferSeverity(riskStr),
          mitigation: String(mitigation).replace(/\*\*/g, '').trim(),
        });
      }
      if (items.length > 0) return items;
    }
  } catch { /* not JSON */ }

  // Plain text: try numbered sections
  const sections = cleaned.split(/\n(?=\d+[.)]\s)/).filter(s => s.trim().length > 10);
  if (sections.length >= 2) {
    return sections.slice(0, 6).map((section, i) => {
      const lines = section.split('\n').filter(l => l.trim());
      const header = (lines[0] || '').replace(/^\d+[.)]\s*/, '').replace(/\*\*/g, '').trim();
      const colonIdx = header.indexOf(':');
      const title = colonIdx > 0 ? header.substring(0, colonIdx).trim() : header.split('–')[0].trim();
      const mitigIdx = lines.findIndex(l => /mitigation|solution|recommend|counter|address/i.test(l));
      const descLines = lines.slice(1, mitigIdx > 0 ? mitigIdx : undefined);
      const mitLines = mitigIdx > 0 ? lines.slice(mitigIdx) : [];
      const desc = [colonIdx > 0 ? header.substring(colonIdx + 1).trim() : '', ...descLines]
        .join(' ').replace(/\*\*/g, '').trim();
      const mit = mitLines.map(l => l.replace(/^[^:]+:\s*/, '').replace(/\*\*/g, '')).join(' ').trim();
      return {
        title: title || `Risk ${i + 1}`,
        description: desc || title,
        severity: inferSeverity(desc || title),
        mitigation: mit,
      };
    }).filter(r => r.title.length > 1);
  }

  // Fallback: paragraphs
  const paras = cleaned.split(/\n\n+/).filter(Boolean).slice(0, 6);
  return paras.map((para, i) => {
    const lines = para.split('\n').filter(Boolean);
    const first = lines[0].replace(/^[-*•\d.]\s*/, '').replace(/\*\*/g, '').trim();
    const mitigLine = lines.find(l => /mitigation|solution|recommend/i.test(l));
    return {
      title: `Risk ${i + 1}`,
      description: [first, ...lines.slice(1).filter(l => l !== mitigLine)].join(' ').replace(/\*\*/g, '').trim(),
      severity: inferSeverity(first),
      mitigation: mitigLine ? mitigLine.replace(/^[^:]+:\s*/, '').replace(/\*\*/g, '').trim() : '',
    };
  });
}

function extractPhaseContent(lines: string[]): { tasks: string[]; kpi: string } {
  const kpiLine = lines.find(l => /\b(kpi|metric|measure|target|outcome|goal)\b/i.test(l));
  const tasks = lines
    .filter(l => l !== kpiLine && l.trim().length > 5)
    .map(l => l.replace(/^[-*•]\s*/, '').replace(/\*\*/g, '').trim())
    .filter(Boolean)
    .slice(0, 6);
  const kpi = kpiLine ? kpiLine.replace(/^[^:]+:\s*/, '').replace(/\*\*/g, '').trim() : '';
  return { tasks, kpi };
}

function parseRoadmap(raw: string | null | undefined): RoadmapPhase[] {
  if (!raw) return [];
  const cleaned = cleanRaw(raw);

  // JSON attempt
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const periodLabels = ['Days 1–30', 'Days 31–60', 'Days 61–90', 'Beyond 90 Days'];
      const phaseLabels = ['Foundation', 'Momentum', 'Acceleration', 'Next Stage'];
      return parsed.slice(0, 4).map((p: any, i: number) => ({
        period: String(p.period || p.timeframe || p.days || periodLabels[i]),
        label: String(p.label || p.phase || p.name || phaseLabels[i]),
        tasks: Array.isArray(p.tasks) ? p.tasks.map(String) : String(p.tasks || p.objectives || p.description || '').split('\n').filter(Boolean),
        kpi: String(p.kpi || p.outcome || p.metric || ''),
      }));
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const thirtyDay = (parsed as any).thirtyDay || (parsed as any)['30'] || (parsed as any).phase1;
      const sixtyDay = (parsed as any).sixtyDay || (parsed as any)['60'] || (parsed as any).phase2;
      const ninetyDay = (parsed as any).ninetyDay || (parsed as any)['90'] || (parsed as any).phase3;
      if (thirtyDay || sixtyDay || ninetyDay) {
        const result: RoadmapPhase[] = [];
        const toArr = (v: any) => Array.isArray(v) ? v.map(String) : String(v).split('\n').filter(Boolean);
        if (thirtyDay) result.push({ period: 'Days 1–30', label: 'Foundation', tasks: toArr(thirtyDay), kpi: '' });
        if (sixtyDay) result.push({ period: 'Days 31–60', label: 'Momentum', tasks: toArr(sixtyDay), kpi: '' });
        if (ninetyDay) result.push({ period: 'Days 61–90', label: 'Acceleration', tasks: toArr(ninetyDay), kpi: '' });
        return result;
      }
    }
  } catch { /* not JSON */ }

  // Text parsing — detect phase headers
  const phaseDefs = [
    { patterns: [/days?\s*1[-–]\s*30|first\s*30|30[-–]day|month\s*1|phase\s*1/i], period: 'Days 1–30', label: 'Foundation' },
    { patterns: [/days?\s*31[-–]\s*60|second\s*30|month\s*2|phase\s*2/i], period: 'Days 31–60', label: 'Momentum' },
    { patterns: [/days?\s*61[-–]\s*90|third\s*30|month\s*3|phase\s*3/i], period: 'Days 61–90', label: 'Acceleration' },
    { patterns: [/days?\s*91|beyond\s*90|phase\s*4|next\s*stage|long[-\s]term/i], period: 'Beyond 90 Days', label: 'Next Stage' },
  ];

  const phases: RoadmapPhase[] = [];
  const lines = cleaned.split('\n');
  let current: { def: { period: string; label: string }; lines: string[] } | null = null;

  for (const line of lines) {
    const matched = phaseDefs.find(def => def.patterns.some(p => p.test(line)));
    if (matched) {
      if (current) {
        const { tasks, kpi } = extractPhaseContent(current.lines);
        phases.push({ period: current.def.period, label: current.def.label, tasks, kpi });
      }
      current = { def: matched, lines: [] };
    } else if (current && line.trim()) {
      current.lines.push(line.trim());
    }
  }
  if (current) {
    const { tasks, kpi } = extractPhaseContent(current.lines);
    phases.push({ period: current.def.period, label: current.def.label, tasks, kpi });
  }

  if (phases.length >= 2) return phases;

  // Paragraph fallback
  const paras = cleaned.split(/\n\n+/).filter(Boolean);
  const periodLabels = ['Days 1–30', 'Days 31–60', 'Days 61–90'];
  const phaseLabels = ['Foundation', 'Momentum', 'Acceleration'];
  return paras.slice(0, 3).map((para, i) => ({
    period: periodLabels[i],
    label: phaseLabels[i],
    tasks: para.split('\n').map(l => l.replace(/^[-*•\d.]\s*/, '').replace(/\*\*/g, '').trim()).filter(Boolean).slice(0, 5),
    kpi: '',
  }));
}

function parseRecommendations(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const cleaned = cleanRaw(raw);

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.slice(0, 5).map(String);
  } catch { /* not JSON */ }

  const numbered = cleaned.split(/\n(?=\d+[.)]\s)/).filter(s => s.trim().length > 10);
  if (numbered.length >= 2) {
    return numbered.slice(0, 5).map(s => s.replace(/^\d+[.)]\s*/, '').replace(/\*\*/g, '').trim()).filter(Boolean);
  }

  const bullets = cleaned.split('\n').filter(l => /^[-*•]\s/.test(l.trim()) && l.trim().length > 10);
  if (bullets.length >= 2) {
    return bullets.slice(0, 5).map(l => l.replace(/^[-*•]\s*/, '').replace(/\*\*/g, '').trim()).filter(Boolean);
  }

  return cleaned.split(/\n\n+/).filter(Boolean).slice(0, 5).map(p => p.replace(/\*\*/g, '').trim());
}

function parseCompetitors(raw: string | null | undefined): CompetitorItem[] | null {
  if (!raw) return null;
  const cleaned = cleanRaw(raw);

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length >= 2) {
      return parsed.slice(0, 5).map((c: any) => ({
        name: String(c.name || c.competitor || c.company || 'Competitor'),
        strength: String(c.strength || c.advantage || c.strengths || c.main_strength || '').replace(/\*\*/g, '').trim(),
        gap: String(c.weakness || c.gap || c.weaknesses || c.disadvantage || c.main_weakness || '').replace(/\*\*/g, '').trim(),
        differentiation: String(c.differentiation || c.opportunity || c.strategy || c.how_to_win || '').replace(/\*\*/g, '').trim(),
      }));
    }
  } catch { /* not JSON */ }

  // Text: numbered competitor sections
  const sections = cleaned.split(/\n(?=\d+[.)]\s|\*\*\d+)/).filter(s => s.trim().length > 15);
  if (sections.length >= 2) {
    const items = sections.slice(0, 5).map((section, i) => {
      const lines = section.split('\n').filter(l => l.trim().length > 3);
      const nameLine = (lines[0] || '').replace(/^\d+[.)]\s*\*?\*?/, '').replace(/\*\*/g, '').trim();
      const name = (nameLine.split(':')[0].split('(')[0].split('–')[0].split('-')[0]).trim() || `Competitor ${i + 1}`;
      const strengthLine = lines.find(l => /\b(strength|advantage|key|feature|pro)\b/i.test(l));
      const gapLine = lines.find(l => /\b(weakness|gap|limitation|disadvantage|challenge)\b/i.test(l));
      const diffLine = lines.find(l => /\b(differenti|opportunity|your|win|our startup)\b/i.test(l));
      const extract = (line?: string) => line ? line.replace(/^[^:]+:\s*/, '').replace(/\*\*/g, '').trim() : '';
      return {
        name,
        strength: extract(strengthLine) || (lines[1] || '').replace(/\*\*/g, '').trim(),
        gap: extract(gapLine) || '',
        differentiation: extract(diffLine) || '',
      };
    }).filter(c => c.name.length > 1 && c.strength.length > 3);
    if (items.length >= 2) return items;
  }

  return null;
}

// ─────────────────────────────────────────────
// SCORE HELPERS
// ─────────────────────────────────────────────

function deriveInvestmentFactors(scores: Scores, t: (key: string) => string) {
  const factors: { label: string; type: 'positive' | 'concern' | 'neutral' }[] = [];

  if (scores.innovationScore >= 70) factors.push({ label: t('analysis.factor.innovation_strong'), type: 'positive' });
  else if (scores.innovationScore < 50) factors.push({ label: t('analysis.factor.innovation_limited'), type: 'concern' });

  if (scores.marketScore >= 70) factors.push({ label: t('analysis.factor.market_strong'), type: 'positive' });
  else if (scores.marketScore < 50) factors.push({ label: t('analysis.factor.market_weak'), type: 'concern' });
  else factors.push({ label: t('analysis.factor.market_moderate'), type: 'neutral' });

  if (scores.riskScore >= 70) factors.push({ label: t('analysis.factor.risk_low'), type: 'positive' });
  else if (scores.riskScore < 50) factors.push({ label: t('analysis.factor.risk_high'), type: 'concern' });
  else factors.push({ label: t('analysis.factor.risk_moderate'), type: 'neutral' });

  if (scores.revenuePotential >= 70) factors.push({ label: t('analysis.factor.revenue_strong'), type: 'positive' });
  else if (scores.revenuePotential < 50) factors.push({ label: t('analysis.factor.revenue_weak'), type: 'concern' });

  if (scores.ventureScore >= 70) factors.push({ label: t('analysis.factor.venture_strong'), type: 'positive' });
  else if (scores.ventureScore < 50) factors.push({ label: t('analysis.factor.venture_weak'), type: 'concern' });

  return factors.slice(0, 5);
}

function getVerdict(score: number, t: (key: string) => string): { text: string; color: string } {
  if (score >= 75) return { text: t('analysis.verdict_strong'), color: '#4ade80' };
  if (score >= 55) return { text: t('analysis.verdict_promising'), color: '#C9A84C' };
  return { text: t('analysis.verdict_improve'), color: '#f87171' };
}

// ─────────────────────────────────────────────
// BILINGUAL CONTENT HELPER
// Returns the right language's content blob if available,
// falling back to the individual text columns for old analyses.
// ─────────────────────────────────────────────

interface AnalysisContent {
  executiveSummary?: string | null;
  ideaSummaryEnhanced?: string | null;
  swotAnalysis?: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] } | null;
  customerPersona?: string | null;
  businessModel?: string | null;
  marketOpportunity?: string | null;
  revenueModel?: string | null;
  riskAnalysis?: unknown;
  competitorAnalysis?: string | null;
  pricingSuggestions?: string | null;
  goToMarketStrategy?: string | null;
  startupRoadmap?: string | null;
  scores?: Scores | null;
  weaknessesExplanation?: string | null;
  improvementSuggestions?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getContent(analysis: any, language: 'en' | 'ar'): AnalysisContent {
  if (!analysis) return {};
  const blob = language === 'ar' ? analysis.contentAr : analysis.contentEn;
  if (blob && typeof blob === 'object') return blob as AnalysisContent;
  // Fallback: individual columns (analyses created before bilingual support)
  return {
    executiveSummary: analysis.executiveSummary,
    ideaSummaryEnhanced: analysis.ideaSummaryEnhanced,
    swotAnalysis: analysis.swotAnalysis,
    customerPersona: analysis.customerPersona,
    businessModel: analysis.businessModel,
    marketOpportunity: analysis.marketOpportunity,
    revenueModel: analysis.revenueModel,
    riskAnalysis: analysis.riskAnalysis,
    competitorAnalysis: analysis.competitorAnalysis,
    pricingSuggestions: analysis.pricingSuggestions,
    goToMarketStrategy: analysis.goToMarketStrategy,
    startupRoadmap: analysis.startupRoadmap,
    scores: analysis.scores as Scores,
    weaknessesExplanation: analysis.weaknessesExplanation,
    improvementSuggestions: analysis.improvementSuggestions,
  };
}

// ─────────────────────────────────────────────
// SECTION NAVIGATOR
// ─────────────────────────────────────────────

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'readiness', label: 'Readiness' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'model', label: 'Business Model' },
  { id: 'swot', label: 'SWOT' },
  { id: 'market', label: 'Market' },
  { id: 'persona', label: 'Persona' },
  { id: 'risk', label: 'Risk' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'gtm', label: 'Go-to-Market' },
  { id: 'competitive', label: 'Competitors' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'recommendations', label: 'Strategy' },
];

const STICKY_OFFSET = 168; // px — matches scrollMarginTop on sections

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

function DesktopSectionNav({ activeId }: { activeId: string }) {
  const { t } = useI18n();
  return (
    <nav className="space-y-0.5">
      <div className="text-[9px] uppercase tracking-[0.25em] text-white/20 font-medium mb-3 px-2">{t('analysis.sections_label')}</div>
      {SECTIONS.map(s => (
        <button
          key={s.id}
          onClick={() => scrollToSection(s.id)}
          className="w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all duration-200 flex items-center gap-2"
          style={{
            color: activeId === s.id ? '#C9A84C' : 'rgba(255,255,255,0.3)',
            background: activeId === s.id ? 'rgba(201,168,76,0.08)' : 'transparent',
          }}
        >
          {activeId === s.id && (
            <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#C9A84C' }} />
          )}
          <span className={activeId === s.id ? 'font-medium' : ''}>{t('section.' + s.id)}</span>
        </button>
      ))}
    </nav>
  );
}

function MobileSectionNav({ activeId }: { activeId: string }) {
  const { t } = useI18n();
  return (
    <div className="flex gap-2 min-w-max px-4 py-2.5">
      {SECTIONS.map(s => (
        <button
          key={s.id}
          onClick={() => scrollToSection(s.id)}
          className="text-[11px] px-3 py-1.5 rounded-full whitespace-nowrap transition-all flex-shrink-0"
          style={{
            background: activeId === s.id ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)',
            border: activeId === s.id ? '1px solid rgba(201,168,76,0.3)' : '1px solid rgba(255,255,255,0.07)',
            color: activeId === s.id ? '#C9A84C' : 'rgba(255,255,255,0.35)',
          }}
        >
          {t('section.' + s.id)}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function AnalysisDetail() {
  const [, params] = useRoute("/projects/:projectId/analysis/:analysisId");
  const projectId = params?.projectId ? parseInt(params.projectId, 10) : 0;
  const analysisId = params?.analysisId ? parseInt(params.analysisId, 10) : 0;

  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const { data: analysis, isLoading: isAnalysisLoading } = useGetAnalysis(projectId, analysisId, {
    query: {
      enabled: !!projectId && !!analysisId,
      queryKey: getGetAnalysisQueryKey(projectId, analysisId),
      refetchInterval: (query) => {
        const s = query.state?.data?.status;
        return (s === 'complete' || s === 'failed') ? false : 3000;
      }
    }
  });

  const { mutateAsync: improveAnalysis, isPending: isImproving } = useImproveAnalysis();
  const [activeSection, setActiveSection] = useState('overview');
  const [, navigate] = useLocation();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { language, t } = useI18n();

  // Auto-translate project description when Arabic is selected
  const { mutate: translateDescription } = useTranslateDescription(projectId);
  useEffect(() => {
    if (project && language === 'ar' && !project.ideaSummaryAr) {
      translateDescription();
    }
  }, [project?.id, language, project?.ideaSummaryAr]);

  // Track active section via scroll position — find the last section
  // whose top edge is at or above the sticky header threshold.
  useEffect(() => {
    if (!analysis || analysis.status !== 'complete') return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const threshold = STICKY_OFFSET + 48; // header + generous buffer
        let activeId = SECTIONS[0].id;
        for (const { id } of SECTIONS) {
          const el = document.getElementById(id);
          if (!el) continue;
          if (el.getBoundingClientRect().top <= threshold) activeId = id;
        }
        setActiveSection(activeId);
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // set correct tab on mount
    return () => window.removeEventListener('scroll', handleScroll);
  }, [analysis]);

  const handleDownloadPdf = async () => {
    if (!analysis || !project || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    try {
      // Lazy-load @react-pdf/renderer (large bundle) and our document component
      const [{ pdf }, { default: PdfReport }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../components/PdfReport'),
      ]);

      // Format the report date once
      const reportDate = analysis.createdAt
        ? new Date(analysis.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

      // PDF always exports in the current UI language — content is bilingual
      const pdfContent = getContent(analysis, language as 'en' | 'ar');
      const pdfScores = pdfContent.scores as Parameters<typeof PdfReport>[0]['scores'];
      const pdfSwot = pdfContent.swotAnalysis as Parameters<typeof PdfReport>[0]['swot'];
      const pdfRisks = parseRiskAnalysis(pdfContent.riskAnalysis);
      const pdfRoadmap = parseRoadmap(pdfContent.startupRoadmap);
      const pdfRecommendations = parseRecommendations(pdfContent.improvementSuggestions);
      const pdfCompetitors = parseCompetitors(pdfContent.competitorAnalysis);

      const blob = await pdf(
        PdfReport({
          project: {
            ...project,
            ideaSummary: language === 'ar'
              ? (project.ideaSummaryAr ?? pdfContent.ideaSummaryEnhanced ?? project.ideaSummary)
              : project.ideaSummary,
          },
          analysis: {
            executiveSummary: pdfContent.executiveSummary,
            businessModel: pdfContent.businessModel,
            marketOpportunity: pdfContent.marketOpportunity,
            customerPersona: pdfContent.customerPersona,
            revenueModel: pdfContent.revenueModel,
            goToMarketStrategy: pdfContent.goToMarketStrategy,
            competitorAnalysis: pdfContent.competitorAnalysis,
            startupRoadmap: pdfContent.startupRoadmap,
            improvementSuggestions: pdfContent.improvementSuggestions,
            riskAnalysis: pdfContent.riskAnalysis,
            createdAt: analysis.createdAt,
          },
          scores: pdfScores,
          swot: pdfSwot,
          risks: pdfRisks,
          roadmapPhases: pdfRoadmap,
          recommendations: pdfRecommendations,
          competitors: pdfCompetitors,
          reportDate,
          language: language as 'en' | 'ar',
        })
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title} — Jadeer Strategy Report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message
          ?? JSON.stringify(err)
          ?? String(err);
      console.error('PDF generation failed:', msg, err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleImprove = async () => {
    if (!projectId || !analysisId) return;
    try {
      const a = await improveAnalysis({ projectId, analysisId, data: { language: language as 'en' | 'ar' } });
      window.location.href = `/projects/${projectId}/analysis/${a.id}`;
    } catch (err) {
      console.error("Improve failed:", err);
    }
  };

  const isProcessing = isAnalysisLoading || !analysis || analysis.status === 'pending' || analysis.status === 'processing';
  if (isProcessing) return <ThinkingStage />;

  if (analysis?.status === 'failed') {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <div className="glass-panel rounded-2xl p-10 max-w-md w-full text-center mx-6">
            <AlertTriangle className="w-10 h-10 mx-auto mb-5" style={{ color: '#ef4444' }} />
            <h2 className="text-xl font-medium mb-2">{t('analysis.failed_title')}</h2>
            <p className="text-white/40 font-light text-sm mb-7">
              {t('analysis.failed_msg')}
            </p>
            <Link href={`/projects/${projectId}`}
              className="text-sm font-medium transition-colors" style={{ color: '#C9A84C' }}>
              {t('analysis.return_startup')}
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Bilingual content — read from the appropriate language blob
  const content = getContent(analysis, language as 'en' | 'ar');
  const scores = content.scores as Scores | undefined;
  const swot = content.swotAnalysis;
  const risks = parseRiskAnalysis(content.riskAnalysis);
  const roadmapPhases = parseRoadmap(content.startupRoadmap);
  const recommendations = parseRecommendations(content.improvementSuggestions);
  const competitors = parseCompetitors(content.competitorAnalysis);

  return (
    <Layout>
      <div className="w-full">

        {/* ── Sticky toolbar ───────────────────────────── */}
        <div className="sticky top-[60px] sm:top-[68px] z-40 no-pdf"
          style={{ background: 'var(--_hdr)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--_hdr-b)' }}>
          <div className="max-w-[88rem] mx-auto px-4 sm:px-8">
            {/* Row 1: Back + title + (desktop: action buttons) */}
            <div className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <Link href={`/projects/${projectId}`}
                  className="w-8 h-8 rounded-lg glass-panel flex items-center justify-center hover:bg-white/8 transition-colors flex-shrink-0">
                  <ChevronLeft className="w-4 h-4 text-white/50" />
                </Link>
                <div className="min-w-0">
                  <h1 className="text-sm font-medium text-white truncate">{project?.title}</h1>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest hidden sm:block">{t('analysis.ai_report')}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Three-dot menu — always visible */}
                {project && (
                  <ProjectActionsMenu
                    project={project}
                    onDeleted={() => navigate('/dashboard')}
                    triggerClassName="w-8 h-8 rounded-lg glass-panel flex items-center justify-center hover:bg-white/8 transition-colors text-white/40 hover:text-white/70 outline-none"
                  />
                )}
                {/* Export PDF — desktop only */}
                <button onClick={handleDownloadPdf} disabled={isGeneratingPdf}
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium glass-panel hover:bg-white/8 transition-colors text-white/60 hover:text-white disabled:opacity-50 disabled:cursor-wait">
                  {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  {isGeneratingPdf ? t('analysis.generating') : t('analysis.export_pdf')}
                </button>
                {/* Improve Strategy — desktop only */}
                <button onClick={handleImprove} disabled={isImproving}
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}>
                  {isImproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  {isImproving ? t('analysis.improving') : t('analysis.improve')}
                </button>
              </div>
            </div>
            {/* Row 2: mobile-only action buttons — full-width, evenly split */}
            <div className="flex gap-2 pb-3 sm:hidden">
              <button onClick={handleDownloadPdf} disabled={isGeneratingPdf}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium glass-panel text-white/60 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-wait">
                {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" /> : <Download className="w-3.5 h-3.5 flex-shrink-0" />}
                {isGeneratingPdf ? t('analysis.generating') : t('analysis.export_pdf')}
              </button>
              <button onClick={handleImprove} disabled={isImproving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}>
                {isImproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 flex-shrink-0" />}
                {isImproving ? t('analysis.improving') : t('analysis.improve')}
              </button>
            </div>
          </div>
          {/* Section nav tabs — horizontal scroll */}
          <div className="xl:hidden overflow-x-auto border-t border-white/[0.04] no-scrollbar">
            <MobileSectionNav activeId={activeSection} />
          </div>
        </div>

        {/* ── PDF Cover (hidden on screen, visible in print) ────── */}
        <div className="pdf-cover hidden px-8 pt-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)' }}>
                <img src="/logo.svg" alt="Jadeer" className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold tracking-widest text-sm uppercase" style={{ color: '#C9A84C' }}>Jadeer</div>
                <div className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.35)' }}>{t('analysis.ai_report')}</div>
              </div>
            </div>
            <div className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {analysis?.createdAt ? format(new Date(analysis.createdAt), 'MMMM d, yyyy') : ''}
            </div>
          </div>
          <h1 className="text-3xl font-light tracking-tight mb-2 text-white">{project?.title}</h1>
          <p className="text-sm font-light" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {t('analysis.confidential')}
          </p>
        </div>

        {/* ── Layout: content + sidebar ─────────────── */}
        <div className="flex max-w-[88rem] mx-auto report-layout">

          {/* Main report */}
          <div className="flex-1 min-w-0 px-4 sm:px-8 pb-16 sm:pb-28 space-y-10 sm:space-y-20 pt-8 sm:pt-12 report-content">

            {/* ── OVERVIEW: Score + Executive Summary ── */}
            <motion.section
              id="overview"
              style={{ scrollMarginTop: '160px' }}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center pb-10 sm:pb-16 border-b border-white/[0.06]"
            >
              <div className="md:col-span-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium uppercase tracking-widest mb-5"
                  style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}>
                  <CheckCircle2 className="w-3 h-3" /> {t('analysis.generated')}
                </div>
                <h2 className="text-[clamp(1.6rem,6vw,3rem)] md:text-5xl font-light tracking-tight leading-tight mb-5">
                  {t('analysis.blueprint_for')}<br />
                  <span className="font-medium">{project?.title}</span>
                </h2>
                <div className="text-base text-white/50 font-light leading-relaxed space-y-3">
                  {parseText(content.executiveSummary, t('analysis.no_data'))}
                </div>
              </div>

              {scores && (
                <div className="md:col-span-2 flex justify-center">
                  <AnimatedGauge
                    value={scores.investmentReadiness || scores.ventureScore || 0}
                    label={t('analysis.investment_readiness')}
                  />
                </div>
              )}
            </motion.section>

            {/* ── WHY THIS SCORE? ── */}
            {scores && (
              <AnimSection id="readiness" delay={0.05}>
                <InvestmentReadinessPanel scores={scores} />
              </AnimSection>
            )}

            {/* ── VENTURE SCORES ── */}
            {scores && (
              <AnimSection id="metrics" delay={0.1}>
                <SectionTitle title={t('analysis.metrics_title')} subtitle={t('analysis.metrics_sub')} icon={Activity} />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <ScoreGauge title={t('analysis.score.venture')} score={scores.ventureScore} desc={scores.ventureScoreExplanation} />
                  <ScoreGauge title={t('analysis.score.innovation')} score={scores.innovationScore} desc={scores.innovationScoreExplanation} />
                  <ScoreGauge title={t('analysis.score.market')} score={scores.marketScore} desc={scores.marketScoreExplanation} />
                  <ScoreGauge title={t('analysis.score.risk')} score={scores.riskScore} desc={scores.riskScoreExplanation} invert />
                  <ScoreGauge title={t('analysis.score.revenue')} score={scores.revenuePotential} desc={scores.revenuePotentialExplanation} />
                  <ScoreGauge title={t('analysis.score.execution')} score={Math.round((scores.ventureScore + (scores.investmentReadiness || scores.ventureScore)) / 2)} desc={t('analysis.score.desc_execution')} />
                </div>
              </AnimSection>
            )}

            {/* ── BUSINESS MODEL ── */}
            <AnimSection id="model" delay={0.1}>
              <div className="glass-panel p-5 sm:p-8 rounded-3xl">
                <h3 className="text-base sm:text-lg font-medium flex items-center gap-3 mb-5 sm:mb-6">
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,168,76,0.1)' }}>
                    <Briefcase className="w-4 h-4" style={{ color: '#C9A84C' }} />
                  </span>
                  {t('section.model')}
                </h3>
                <div className="text-white/55 font-light text-sm leading-relaxed space-y-3">
                  {parseText(content.businessModel, t('analysis.no_data'))}
                </div>
              </div>
            </AnimSection>

            {/* ── SWOT MATRIX ── */}
            <AnimSection id="swot" delay={0.05}>
              <div className="glass-panel p-5 sm:p-8 rounded-3xl">
                <h3 className="text-base sm:text-lg font-medium flex items-center gap-3 mb-5 sm:mb-6">
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.1)' }}>
                    <Target className="w-4 h-4" style={{ color: '#C9A84C' }} />
                  </span>
                  {t('analysis.swot_matrix')}
                </h3>
                {swot ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <SwotCell title={t('analysis.swot_strengths')} items={swot.strengths} positive />
                    <SwotCell title={t('analysis.swot_weaknesses')} items={swot.weaknesses} />
                    <SwotCell title={t('analysis.swot_opportunities')} items={swot.opportunities} positive />
                    <SwotCell title={t('analysis.swot_threats')} items={swot.threats} />
                  </div>
                ) : <p className="text-white/30 text-sm font-light">{t('analysis.no_swot')}</p>}
              </div>
            </AnimSection>

            {/* ── MARKET OPPORTUNITY ── */}
            <AnimSection id="market" delay={0.1}>
              <SectionTitle title={t('analysis.s_market')} icon={BarChart3} />
              <div className="glass-panel p-5 sm:p-8 rounded-3xl">
                <div className="text-white/55 font-light text-sm leading-relaxed space-y-3">
                  {parseText(content.marketOpportunity, t('analysis.no_data'))}
                </div>
              </div>
            </AnimSection>

            {/* ── CUSTOMER PERSONA ── */}
            <AnimSection id="persona" delay={0.1}>
              <SectionTitle title={t('analysis.s_persona')} icon={Users} />
              <div className="glass-panel p-5 sm:p-8 rounded-3xl">
                <div className="text-white/55 font-light text-sm leading-relaxed space-y-3">
                  {parseText(content.customerPersona, t('analysis.no_data'))}
                </div>
              </div>
            </AnimSection>

            {/* ── RISK ASSESSMENT ── */}
            <AnimSection id="risk" delay={0.1}>
              <SectionTitle title={t('analysis.s_risk')} subtitle={t('analysis.s_risk_sub')} icon={ShieldAlert} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Radar chart */}
                <div className="glass-panel p-6 rounded-3xl flex items-center justify-center min-h-[280px]">
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart cx="50%" cy="50%" outerRadius="72%" data={buildRiskData(scores, [t('radar.market'), t('radar.execution'), t('radar.financial'), t('radar.competition'), t('radar.risk_profile'), t('radar.readiness')])}>
                      <PolarGrid stroke="rgba(201,168,76,0.1)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Risk Level" dataKey="A"
                        stroke="#C9A84C" strokeWidth={1.5}
                        fill="rgba(201,168,76,0.12)" fillOpacity={1} />
                      <Tooltip contentStyle={{ background: '#0A0A0F', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', fontSize: '11px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                {/* Risk cards */}
                <div className="lg:col-span-2">
                  {risks.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {risks.map((risk, i) => <RiskCard key={i} risk={risk} />)}
                    </div>
                  ) : (
                    <div className="glass-panel p-8 rounded-3xl h-full">
                      <div className="text-white/55 font-light text-sm leading-relaxed space-y-3">
                        {parseText(typeof content.riskAnalysis === 'string' ? content.riskAnalysis : JSON.stringify(content.riskAnalysis ?? ''), t('analysis.no_data'))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </AnimSection>

            {/* ── REVENUE MODEL ── */}
            <AnimSection id="revenue" delay={0.1}>
              <SectionTitle title={t('analysis.s_revenue')} icon={TrendingUp} />
              <div className="glass-panel p-5 sm:p-8 rounded-3xl">
                <div className="text-white/55 font-light text-sm leading-relaxed space-y-3">
                  {parseText(content.revenueModel, t('analysis.no_data'))}
                </div>
              </div>
            </AnimSection>

            {/* ── GO-TO-MARKET ── */}
            <AnimSection id="gtm" delay={0.1}>
              <SectionTitle title={t('analysis.s_gtm')} icon={Map} />
              <div className="glass-panel p-5 sm:p-8 rounded-3xl">
                <div className="text-white/55 font-light text-sm leading-relaxed space-y-3">
                  {parseText(content.goToMarketStrategy, t('analysis.no_data'))}
                </div>
              </div>
            </AnimSection>

            {/* ── COMPETITIVE LANDSCAPE ── */}
            {content.competitorAnalysis && (
              <AnimSection id="competitive" delay={0.1}>
                <SectionTitle title={t('analysis.s_competitive')} subtitle={t('analysis.s_competitive_sub')} icon={Activity} />
                <CompetitorSection
                  rawText={content.competitorAnalysis ?? ''}
                  competitors={competitors}
                />
              </AnimSection>
            )}

            {/* ── EXECUTION ROADMAP ── */}
            {content.startupRoadmap && (
              <AnimSection id="roadmap" delay={0.1}>
                <SectionTitle title={t('analysis.s_roadmap')} subtitle={t('analysis.s_roadmap_sub')} icon={Calendar} />
                {roadmapPhases.length >= 2 ? (
                  <RoadmapTimeline phases={roadmapPhases} />
                ) : (
                  <div className="glass-panel p-8 rounded-3xl">
                    <div className="text-white/55 font-light text-sm leading-relaxed space-y-3">
                      {parseText(String(content.startupRoadmap ?? ''), t('analysis.no_data'))}
                    </div>
                  </div>
                )}
              </AnimSection>
            )}

            {/* ── TOP STRATEGIC RECOMMENDATIONS ── */}
            {recommendations.length > 0 && (
              <AnimSection id="recommendations" delay={0.1}>
                <SectionTitle title={t('analysis.s_recommendations')} subtitle={t('analysis.s_recommendations_sub')} icon={Lightbulb} />
                <RecommendationCards items={recommendations} />
              </AnimSection>
            )}

          </div>{/* end report */}

          {/* ── Desktop sidebar nav ─────────────────── */}
          <aside className="hidden xl:block w-52 flex-shrink-0 no-pdf">
            <div className="sticky top-[160px] pt-12 pr-6">
              <DesktopSectionNav activeId={activeSection} />
            </div>
          </aside>

        </div>{/* end flex layout */}
      </div>
    </Layout>
  );
}

// ─────────────────────────────────────────────
// HELPER COMPONENTS — existing
// ─────────────────────────────────────────────

function AnimSection({ children, delay = 0, id }: { children: React.ReactNode; delay?: number; id?: string }) {
  return (
    <motion.section
      id={id}
      style={{ scrollMarginTop: '160px' }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.section>
  );
}

function AnimatedGauge({ value, label }: { value: number; label: string }) {
  const [displayed, setDisplayed] = useState(0);
  const norm = Math.max(0, Math.min(100, value || 0));
  const circumference = 2 * Math.PI * 54;
  const dash = (norm / 100) * circumference;

  useEffect(() => {
    let frame: number;
    const animate = () => {
      setDisplayed(d => {
        const next = d + (norm - d) * 0.06;
        if (Math.abs(next - norm) < 0.3) return norm;
        frame = requestAnimationFrame(animate);
        return next;
      });
    };
    const t = setTimeout(() => { frame = requestAnimationFrame(animate); }, 400);
    return () => { clearTimeout(t); cancelAnimationFrame(frame); };
  }, [norm]);

  return (
    <div className="relative w-36 h-36 sm:w-52 sm:h-52 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
        <motion.circle
          cx="60" cy="60" r="54" fill="none"
          stroke="#C9A84C" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          initial={{ strokeDasharray: `0 ${circumference}` }}
          animate={{ strokeDasharray: `${dash} ${circumference}` }}
          transition={{ duration: 1.4, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: 'drop-shadow(0 0 6px rgba(201,168,76,0.5))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl sm:text-5xl font-light" style={{ color: '#C9A84C' }}>
          {Math.round(displayed)}
        </span>
        <span className="text-xs uppercase tracking-widest text-white/30 mt-1 text-center px-4">
          {label}
        </span>
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon?: React.ElementType }) {
  return (
    <div className="mb-5 sm:mb-7">
      <h2 className="text-[clamp(1.25rem,4vw,1.5rem)] font-light tracking-tight flex items-center gap-3">
        {Icon && (
          <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.08)' }}>
            <Icon className="w-4 h-4" style={{ color: '#C9A84C' }} />
          </span>
        )}
        {title}
      </h2>
      {subtitle && <p className="text-white/30 text-sm mt-1 font-light">{subtitle}</p>}
    </div>
  );
}

function ScoreGauge({ title, score, desc, invert = false }: {
  title: string; score: number; desc?: string | null; invert?: boolean;
}) {
  const [displayed, setDisplayed] = useState(0);
  const norm = Math.max(0, Math.min(100, score || 0));

  useEffect(() => {
    let frame: number;
    const delay = setTimeout(() => {
      const go = () => {
        setDisplayed(d => {
          const n = d + (norm - d) * 0.08;
          if (Math.abs(n - norm) < 0.3) return norm;
          frame = requestAnimationFrame(go);
          return n;
        });
      };
      frame = requestAnimationFrame(go);
    }, 300);
    return () => { clearTimeout(delay); cancelAnimationFrame(frame); };
  }, [norm]);

  const color = invert
    ? (norm < 40 ? '#4ade80' : norm < 65 ? '#C9A84C' : '#f87171')
    : (norm >= 70 ? '#C9A84C' : norm >= 45 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)');

  return (
    <div className="glass-panel p-5 rounded-2xl flex flex-col group relative overflow-hidden transition-all duration-300 hover:bg-white/[0.07]">
      <div className="text-[10px] uppercase tracking-widest text-white/30 mb-3">{title}</div>
      <div className="text-4xl font-light mb-3" style={{ color }}>
        {Math.round(displayed)}
      </div>
      <div className="w-full h-0.5 rounded-full mt-auto mb-0.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          whileInView={{ width: `${norm}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: color }}
        />
      </div>
      {desc && (
        <div className="absolute inset-0 rounded-2xl p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center"
          style={{ background: 'var(--_overlay)', backdropFilter: 'blur(12px)', border: '1px solid rgba(201,168,76,0.15)' }}>
          <p className="text-xs text-white/60 leading-relaxed font-light">{desc}</p>
        </div>
      )}
    </div>
  );
}

function SwotCell({ title, items, positive = false }: { title: string; items: string[]; positive?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="text-[10px] uppercase tracking-widest mb-2.5" style={{ color: positive ? '#C9A84C' : 'rgba(255,255,255,0.35)' }}>
        {title}
      </div>
      <ul className="space-y-1.5">
        {(items || []).slice(0, 5).map((item, i) => (
          <li key={i} className="text-xs text-white/55 font-light flex items-start gap-2 leading-snug">
            <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
              style={{ background: positive ? '#C9A84C' : 'rgba(255,255,255,0.25)' }} />
            {item}
          </li>
        ))}
        {(!items || items.length === 0) && (
          <li className="text-xs text-white/25 italic font-light">{t('analysis.no_data')}</li>
        )}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────
// NEW COMPONENTS
// ─────────────────────────────────────────────

function InvestmentReadinessPanel({ scores }: { scores: Scores }) {
  const { t } = useI18n();
  const verdict = getVerdict(scores.investmentReadiness, t);
  const factors = deriveInvestmentFactors(scores, t);

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-8">
      <div className="flex items-center gap-2 mb-5 sm:mb-6">
        <span className="text-[10px] uppercase tracking-[0.3em] font-light" style={{ color: '#C9A84C' }}>
          {t('analysis.why_score')}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Explanation + factors */}
        <div className="lg:col-span-2">
          {scores.investmentReadinessExplanation && (
            <p className="text-sm text-white/55 font-light leading-relaxed mb-7">
              {scores.investmentReadinessExplanation}
            </p>
          )}
          <div className="space-y-3">
            {factors.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                {f.type === 'positive'
                  ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} />
                  : f.type === 'concern'
                  ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#f87171' }} />
                  : <Minus className="w-4 h-4 mt-0.5 flex-shrink-0 text-white/25" />
                }
                <span className="text-sm font-light leading-relaxed"
                  style={{ color: f.type === 'positive' ? 'rgba(255,255,255,0.7)' : f.type === 'concern' ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.38)' }}>
                  {f.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Verdict */}
        <div className="flex flex-col justify-center items-center lg:items-start gap-4">
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/25 font-light">{t('analysis.verdict_label')}</div>
          <div
            className="px-5 py-3 rounded-2xl text-sm font-semibold tracking-wide text-center"
            style={{
              background: `${verdict.color}15`,
              border: `1px solid ${verdict.color}35`,
              color: verdict.color,
            }}
          >
            {verdict.text}
          </div>
          <div className="text-center lg:text-left">
            <div className="text-3xl font-light" style={{ color: verdict.color }}>
              {scores.investmentReadiness}
            </div>
            <div className="text-[10px] text-white/25 uppercase tracking-widest mt-0.5">{t('analysis.out_of_100')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SEVERITY_CONFIG = {
  Low: { color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)' },
  Medium: { color: '#C9A84C', bg: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.2)' },
  High: { color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
};

function RiskCard({ risk }: { risk: RiskItem }) {
  const { t } = useI18n();
  const cfg = SEVERITY_CONFIG[risk.severity];
  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3 h-full"
      style={{ borderTop: `2px solid ${cfg.color}30` }}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-white/85 leading-snug flex-1">{risk.title}</h4>
        <span className="text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
          {t('analysis.severity.' + risk.severity.toLowerCase())}
        </span>
      </div>
      {risk.description && risk.description !== risk.title && (
        <p className="text-xs text-white/45 font-light leading-relaxed">{risk.description}</p>
      )}
      {risk.mitigation && (
        <div className="mt-auto pt-3 border-t border-white/[0.06]">
          <div className="text-[9px] uppercase tracking-widest text-white/25 mb-1.5 font-medium">{t('analysis.mitigation')}</div>
          <p className="text-xs text-white/55 font-light leading-relaxed">{risk.mitigation}</p>
        </div>
      )}
    </div>
  );
}

const PHASE_ACCENTS = ['rgba(201,168,76,0.9)', 'rgba(255,255,255,0.65)', 'rgba(255,255,255,0.4)', 'rgba(255,255,255,0.25)'];

function RoadmapTimeline({ phases }: { phases: RoadmapPhase[] }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {phases.map((phase, i) => {
        const accent = PHASE_ACCENTS[i] || PHASE_ACCENTS[PHASE_ACCENTS.length - 1];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel p-6 rounded-2xl flex flex-col relative overflow-hidden"
          >
            {/* Phase accent top bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-full opacity-60"
              style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />

            <div className="mb-5">
              <div className="text-[9px] uppercase tracking-widest font-semibold mb-1" style={{ color: accent }}>
                {phase.label}
              </div>
              <div className="text-sm font-medium text-white/75">{phase.period}</div>
            </div>

            {phase.tasks.length > 0 && (
              <ul className="space-y-2.5 flex-1">
                {phase.tasks.slice(0, 5).map((task, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: accent, opacity: 0.7 }} />
                    <span className="text-xs text-white/50 font-light leading-relaxed">{task}</span>
                  </li>
                ))}
              </ul>
            )}

            {phase.kpi && (
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <div className="text-[9px] uppercase tracking-widest text-white/20 mb-1">{t('analysis.target_kpi')}</div>
                <p className="text-xs text-white/45 font-light leading-relaxed">{phase.kpi}</p>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function CompetitorSection({ rawText, competitors }: { rawText: string; competitors: CompetitorItem[] | null }) {
  const { t } = useI18n();
  // Summary = first paragraph of raw text (before numbered list starts)
  const summaryPara = rawText.split(/\n(?=\d+[.)]\s)/)[0]?.split('\n\n')[0]?.replace(/\*\*/g, '').trim();

  if (!competitors) {
    return (
      <div className="glass-panel p-8 rounded-3xl">
        <div className="text-white/55 font-light text-sm leading-relaxed space-y-3">
          {parseText(rawText, t('analysis.no_data'))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {summaryPara && summaryPara.length > 40 && (
        <div className="glass-panel px-7 py-5 rounded-2xl">
          <p className="text-sm text-white/50 font-light leading-relaxed">{summaryPara}</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {competitors.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel rounded-2xl p-6 flex flex-col gap-4"
          >
            <div className="text-sm font-semibold text-white/90 pb-3 border-b border-white/[0.07]">{c.name}</div>
            {c.strength && (
              <div>
                <div className="text-[9px] uppercase tracking-widest text-white/25 mb-1.5">{t('analysis.main_strength')}</div>
                <p className="text-xs text-white/55 font-light leading-relaxed">{c.strength}</p>
              </div>
            )}
            {c.gap && (
              <div>
                <div className="text-[9px] uppercase tracking-widest text-white/25 mb-1.5">{t('analysis.market_gap')}</div>
                <p className="text-xs text-white/55 font-light leading-relaxed">{c.gap}</p>
              </div>
            )}
            {c.differentiation && (
              <div className="mt-auto pt-3 border-t border-white/[0.06]">
                <div className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color: 'rgba(201,168,76,0.5)' }}>{t('analysis.how_to_win')}</div>
                <p className="text-xs font-light leading-relaxed" style={{ color: 'rgba(201,168,76,0.7)' }}>{c.differentiation}</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function RecommendationCards({ items }: { items: string[] }) {
  return (
    <div className="space-y-3">
      {items.slice(0, 5).map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass-panel rounded-2xl p-6 flex items-start gap-5 group hover:bg-white/[0.05] transition-all duration-300"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-semibold flex-shrink-0"
            style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: '#C9A84C' }}
          >
            {String(i + 1).padStart(2, '0')}
          </div>
          <p className="text-sm text-white/65 font-light leading-relaxed pt-2 group-hover:text-white/75 transition-colors">{item}</p>
        </motion.div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────

function parseText(text: string | null | undefined, noDataFallback = 'No data available.'): React.ReactNode {
  if (!text || typeof text !== 'string') {
    return <p className="text-white/25 italic">{noDataFallback}</p>;
  }

  // Protect against object/json leaking as text
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return <p className="text-white/25 italic">Data structure not renderable as text.</p>;
    } catch { /* not valid JSON, continue */ }
  }

  const paragraphs = trimmed.split(/\n\n+/).filter(Boolean);

  return paragraphs.map((para, i) => {
    const clean = para.trim();

    // Heading (### or **)
    if (clean.startsWith('### ') || clean.startsWith('## ')) {
      return (
        <p key={i} className="text-white/80 font-semibold text-sm mt-2">
          {clean.replace(/^#{1,3}\s*/, '')}
        </p>
      );
    }

    // Bullet list (lines starting with - or * or •)
    if (clean.split('\n').some(l => /^[-*•]\s/.test(l.trim()))) {
      const items = clean.split('\n').filter(l => l.trim().length > 0);
      return (
        <ul key={i} className="space-y-2">
          {items.map((item, j) => {
            const isBullet = /^[-*•]\s/.test(item.trim());
            const content = item.replace(/^[-*•]\s*/, '').replace(/\*\*/g, '').trim();
            if (!content) return null;
            return isBullet ? (
              <li key={j} className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ background: 'rgba(201,168,76,0.5)' }} />
                <span>{content}</span>
              </li>
            ) : (
              <li key={j} className="text-white/60">{content}</li>
            );
          }).filter(Boolean)}
        </ul>
      );
    }

    // Numbered list
    if (/^\d+[.)]\s/.test(clean)) {
      const items = clean.split('\n').filter(l => l.trim().length > 0);
      return (
        <ol key={i} className="space-y-2 list-none">
          {items.map((item, j) => {
            const numMatch = item.match(/^(\d+)[.)]\s*(.*)/);
            if (!numMatch) return <li key={j}>{item}</li>;
            return (
              <li key={j} className="flex items-start gap-2.5">
                <span className="text-[11px] font-semibold mt-0.5 flex-shrink-0 w-4" style={{ color: '#C9A84C' }}>{numMatch[1]}.</span>
                <span>{numMatch[2].replace(/\*\*/g, '')}</span>
              </li>
            );
          })}
        </ol>
      );
    }

    // Bold inline
    if (clean.includes('**')) {
      const parts = clean.split('**');
      return (
        <p key={i}>
          {parts.map((p, j) =>
            j % 2 === 1
              ? <strong key={j} className="text-white/80 font-medium">{p}</strong>
              : <span key={j}>{p}</span>
          )}
        </p>
      );
    }

    return <p key={i}>{clean}</p>;
  });
}

function buildRiskData(scores: Scores | undefined, subjects: string[]) {
  const [sMarket, sExecution, sFinancial, sCompetition, sRisk, sReadiness] = subjects;
  if (!scores) {
    return [
      { subject: sMarket, A: 50 },
      { subject: sExecution, A: 50 },
      { subject: sFinancial, A: 50 },
      { subject: sCompetition, A: 50 },
      { subject: sRisk, A: 50 },
      { subject: sReadiness, A: 50 },
    ];
  }
  // Higher A value = higher risk (inverse of score)
  const inv = (v: number, offset = 20) => Math.max(15, Math.min(90, 100 - v + offset));
  return [
    { subject: sMarket, A: inv(scores.marketScore) },
    { subject: sExecution, A: inv(scores.ventureScore, 15) },
    { subject: sFinancial, A: inv(scores.revenuePotential) },
    { subject: sCompetition, A: inv(scores.innovationScore) },
    { subject: sRisk, A: inv(scores.riskScore, 0) },
    { subject: sReadiness, A: inv(scores.investmentReadiness, 10) },
  ];
}
