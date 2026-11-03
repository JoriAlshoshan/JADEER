import { useGetDashboardStats, useListProjects, getListProjectsQueryKey, useTranslateDescription } from "@workspace/api-client-react";
import type { Project } from "@workspace/api-client-react";
import Layout from "../components/Layout";
import ProjectActionsMenu from "../components/ProjectActionsMenu";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Plus, Activity, Zap, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "../lib/i18n";
import { useEffect } from "react";

// ─── Per-card sub-component so the hook runs unconditionally per card ───
function ProjectCard({
  project,
  index,
  isRTL,
  navigate,
  qc,
  t,
}: {
  project: Project;
  index: number;
  isRTL: boolean;
  navigate: (to: string) => void;
  qc: ReturnType<typeof useQueryClient>;
  t: (key: string) => string;
}) {
  const { mutate: translateDescription } = useTranslateDescription(project.id);

  // Auto-translate when Arabic is active and no translation is stored
  useEffect(() => {
    if (isRTL && !project.ideaSummaryAr) {
      translateDescription();
    }
  }, [project.id, isRTL, project.ideaSummaryAr]);

  const description = isRTL ? (project.ideaSummaryAr || project.ideaSummary) : project.ideaSummary;

  return (
    <motion.div
      key={project.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative group"
    >
      {/* Clickable card body */}
      <div
        onClick={() => navigate(`/projects/${project.id}`)}
        className="cursor-pointer block"
      >
        <div className="glass-panel rounded-2xl p-6 transition-all duration-400 hover:bg-white/[0.07] hover:border-white/15 relative overflow-hidden flex flex-col">
          {/* Gold accent top bar */}
          <div
            className="absolute top-0 left-0 w-0 h-px group-hover:w-full transition-all duration-700 rounded-full"
            style={{ background: 'linear-gradient(90deg, #C9A84C, rgba(201,168,76,0.2))' }}
          />
          {/* Status badge */}
          <div className={`flex items-start mb-3 ${isRTL ? 'pl-8' : 'pr-8'}`}>
            <div
              className="px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-widest font-medium"
              style={{
                background: project.status === 'complete'
                  ? 'rgba(201,168,76,0.1)' : 'rgba(255,255,255,0.05)',
                color: project.status === 'complete'
                  ? '#C9A84C' : 'rgba(255,255,255,0.35)',
                border: project.status === 'complete'
                  ? '1px solid rgba(201,168,76,0.2)' : '1px solid rgba(255,255,255,0.06)'
              }}
            >
              {t('status.' + project.status)}
            </div>
          </div>
          {/* Main content */}
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white mb-2 group-hover:text-white/90 transition-colors leading-snug">
              {project.title}
            </h3>
            <p className="text-sm text-white/40 line-clamp-2 leading-relaxed font-light">
              {description}
            </p>
          </div>
          {/* Footer */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[0.06]">
            <div className="text-xs text-white/25 font-light tabular-nums">
              {isRTL
                ? new Date(project.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })
                : format(new Date(project.createdAt), 'MMMM d, yyyy')}
            </div>
            {project.industry && (
              <div className="text-xs text-white/25 font-light">{project.industry}</div>
            )}
          </div>
        </div>
      </div>

      {/* Three-dot menu — positioned over the card, prevents navigation */}
      <div className={`absolute top-5 z-10 ${isRTL ? 'left-5' : 'right-5'}`}>
        <ProjectActionsMenu
          project={project}
          onDeleted={() => qc.invalidateQueries({ queryKey: getListProjectsQueryKey() })}
          onUpdated={() => qc.invalidateQueries({ queryKey: getListProjectsQueryKey() })}
        />
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: isStatsLoading } = useGetDashboardStats();
  const { data: projects, isLoading: isProjectsLoading } = useListProjects({
    query: { queryKey: getListProjectsQueryKey() }
  });
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { t, isRTL } = useI18n();

  const isLoading = isStatsLoading || isProjectsLoading;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto w-full px-5 sm:px-8 py-10 sm:py-14" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 sm:mb-16"
        >
          <div>
            <p className="text-xs tracking-[0.3em] uppercase mb-3 font-light" style={{ color: '#C9A84C' }}>
              {t('dashboard.eyebrow')}
            </p>
            <h1 className="text-4xl font-light tracking-tight text-white">
              {t('dashboard.title')}
            </h1>
          </div>
          <Link
            href="/projects/new"
            className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95"
            style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}
          >
            <Plus className="w-4 h-4" />
            {t('dashboard.new_analysis')}
          </Link>
        </motion.div>

        {/* Stats */}
        {isStatsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 glass-panel rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16"
          >
            <StatCard title={t('dashboard.stat_startups')} value={stats?.totalProjects ?? 0} icon={Activity} />
            <StatCard title={t('dashboard.stat_analyses')} value={stats?.completedAnalyses ?? 0} icon={Zap} />
            <StatCard
              title={t('dashboard.stat_score')}
              value={stats?.avgVentureScore ? `${Math.round(stats.avgVentureScore)}/100` : "—"}
              icon={TrendingUp}
              isScore
            />
          </motion.div>
        )}

        {/* Projects */}
        <div>
          <h2 className="text-base font-medium tracking-widest uppercase text-white/40 mb-8">
            {t('dashboard.all_projects')}
          </h2>

          {isProjectsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2].map(i => <div key={i} className="h-40 glass-panel rounded-2xl animate-pulse" />)}
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {projects.map((project, i) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  index={i}
                  isRTL={isRTL}
                  navigate={navigate}
                  qc={qc}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center py-20 rounded-2xl"
              style={{ border: '1px dashed rgba(201,168,76,0.15)', background: 'rgba(201,168,76,0.02)' }}
            >
              <div className="w-12 h-12 mx-auto mb-5 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)' }}>
                <img src="/logo.svg" alt="" className="w-5 h-5" />
              </div>
              <p className="text-white/35 mb-5 font-light text-sm">{t('dashboard.no_projects')}</p>
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
                style={{ color: '#C9A84C' }}
              >
                {t('dashboard.start_first')}
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function StatCard({
  title, value, icon: Icon, isScore = false
}: {
  title: string; value: string | number; icon: any; isScore?: boolean;
}) {
  return (
    <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group transition-all duration-300 hover:bg-white/[0.06]">
      <div className="absolute top-0 right-0 p-5 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className="w-14 h-14" style={isScore ? { color: '#C9A84C' } : {}} />
      </div>
      <p className="text-xs font-medium text-white/35 mb-3 uppercase tracking-widest">{title}</p>
      <p className="text-4xl font-light tracking-tight" style={isScore ? { color: '#C9A84C' } : {}}>
        {value}
      </p>
    </div>
  );
}
