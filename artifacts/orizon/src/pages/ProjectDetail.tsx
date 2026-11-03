import { useRoute, Link, useLocation } from "wouter";
import { useGetProject, useListAnalyses, useCreateAnalysis, getGetProjectQueryKey, getListAnalysesQueryKey, useTranslateDescription } from "@workspace/api-client-react";
import Layout from "../components/Layout";
import ProjectActionsMenu from "../components/ProjectActionsMenu";
import { format } from "date-fns";
import { ArrowRight, Loader2, Zap, Clock, AlertTriangle, FileText, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "../lib/i18n";
import { useEffect } from "react";

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:projectId");
  const { t, language } = useI18n();
  const projectId = params?.projectId ? parseInt(params.projectId, 10) : 0;

  const { data: project, isLoading: isProjectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  // Auto-translate description when Arabic is selected and no translation is stored yet
  const { mutate: translateDescription } = useTranslateDescription(projectId);
  useEffect(() => {
    if (project && language === 'ar' && !project.ideaSummaryAr) {
      translateDescription();
    }
  }, [project?.id, language, project?.ideaSummaryAr]);

  const { data: analyses, isLoading: isAnalysesLoading } = useListAnalyses(projectId, {
    query: { enabled: !!projectId, queryKey: getListAnalysesQueryKey(projectId) }
  });

  const { mutateAsync: createAnalysis, isPending: isCreatingAnalysis } = useCreateAnalysis();
  const [, navigate] = useLocation();

  const handleNewAnalysis = async () => {
    if (!projectId) return;
    try {
      const a = await createAnalysis({ projectId, data: { language } });
      window.location.href = `/projects/${projectId}/analysis/${a.id}`;
    } catch (err) {
      console.error("Failed to start analysis:", err);
    }
  };

  const isLoading = isProjectLoading || isAnalysesLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-5xl mx-auto w-full px-5 sm:px-8 py-10 sm:py-14">
          <div className="h-8 w-1/3 bg-white/5 animate-pulse rounded mb-4" />
          <div className="h-20 w-full bg-white/5 animate-pulse rounded-xl mb-12" />
          {[1, 2, 3].map(i => <div key={i} className="h-20 w-full bg-white/5 animate-pulse rounded-2xl mb-4" />)}
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-light mb-3">{t('project.not_found')}</h2>
            <Link href="/dashboard" className="text-sm text-white/35 hover:text-white transition-colors">
              {t('project.return')}
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto w-full px-5 sm:px-8 py-10 sm:py-14">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-white/25 mb-10 tracking-wide">
          <Link href="/dashboard" className="flex items-center gap-1 hover:text-white/60 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> {t('project.back')}
          </Link>
          <span>/</span>
          <span className="text-white/50">{project.title}</span>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14"
        >
          <div className="flex items-start justify-between gap-4 mb-5">
            <h1 className="text-4xl font-light tracking-tight">{project.title}</h1>
            <ProjectActionsMenu
              project={project}
              onDeleted={() => navigate('/dashboard')}
              triggerClassName="mt-2 w-9 h-9 rounded-xl glass-panel flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.07] transition-colors outline-none flex-shrink-0"
            />
          </div>
          <p className="text-lg text-white/50 leading-relaxed font-light mb-7 max-w-3xl">
            {language === 'ar' ? (project.ideaSummaryAr || project.ideaSummary) : project.ideaSummary}
          </p>
          <div className="flex flex-wrap gap-3">
            {project.industry && (
              <Tag label={t('project.industry')} value={project.industry} />
            )}
            {project.targetMarket && (
              <Tag label={t('project.market')} value={project.targetMarket} />
            )}
          </div>
        </motion.div>

        {/* Analyses */}
        <div>
          <div className="flex items-center justify-between mb-7">
            <h2 className="text-sm font-medium uppercase tracking-widest text-white/30">
              {t('project.analyses')}
            </h2>
            <button
              onClick={handleNewAnalysis}
              disabled={isCreatingAnalysis}
              className="flex items-center gap-2 text-sm font-light transition-colors disabled:opacity-40"
              style={{ color: isCreatingAnalysis ? undefined : '#C9A84C' }}
            >
              {isCreatingAnalysis
                ? <><Loader2 className="w-4 h-4 animate-spin text-white/40" /><span className="text-white/40">{t('project.starting')}</span></>
                : <><Zap className="w-4 h-4" />{t('project.new_analysis')}</>
              }
            </button>
          </div>

          <div className="space-y-3">
            {analyses?.map((analysis, i) => {
              const processing = analysis.status === 'pending' || analysis.status === 'processing';
              const failed = analysis.status === 'failed';
              const complete = analysis.status === 'complete';

              return (
                <motion.div
                  key={analysis.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.5 }}
                >
                  <Link
                    href={`/projects/${project.id}/analysis/${analysis.id}`}
                    className="block"
                  >
                    <div className={`glass-panel rounded-2xl p-5 transition-all duration-300 hover:bg-white/[0.07] group relative overflow-hidden ${
                      processing ? 'border-gold/20' : ''
                    }`}>
                      {processing && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/[0.03] to-transparent animate-pulse" />
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            complete ? 'bg-white/8' :
                            processing ? '' : 'bg-destructive/15'
                          }`}
                            style={processing ? { background: 'rgba(201,168,76,0.1)' } : {}}>
                            {complete
                              ? <FileText className="w-4 h-4 text-white/60" />
                              : processing
                                ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#C9A84C' }} />
                                : <AlertTriangle className="w-4 h-4 text-destructive" />
                            }
                          </div>
                          <div>
                            <div className="flex items-center gap-2.5 mb-1">
                              <h3 className="text-sm font-medium text-white">
                                {t(analysis.type === 'initial' ? 'project.genesis' : 'project.improved')}
                              </h3>
                              <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold`}
                                style={
                                  complete ? { background: 'rgba(201,168,76,0.1)', color: '#C9A84C' } :
                                  processing ? { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' } :
                                  { background: 'rgba(239,68,68,0.1)', color: 'rgba(252,165,165,0.8)' }
                                }>
                                {analysis.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-white/25 font-light">
                              <Clock className="w-3 h-3" />
                              {format(new Date(analysis.createdAt), 'MMM d, yyyy · h:mm a')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-5">
                          {complete && analysis.scores?.ventureScore && (
                            <div className="text-right hidden md:block">
                              <div className="text-[10px] text-white/25 uppercase tracking-widest mb-0.5">{t('project.venture_score')}</div>
                              <div className="text-xl font-light" style={{ color: '#C9A84C' }}>
                                {Math.round(analysis.scores.ventureScore)}
                              </div>
                            </div>
                          )}
                          <div className="w-9 h-9 rounded-full glass-panel flex items-center justify-center group-hover:bg-white/10 transition-colors">
                            <ArrowRight className="w-3.5 h-3.5 text-white/40 group-hover:text-white/80 transition-colors" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}

            {(!analyses || analyses.length === 0) && (
              <div className="text-center py-14 rounded-2xl"
                style={{ border: '1px dashed rgba(201,168,76,0.12)', background: 'rgba(201,168,76,0.02)' }}>
                <p className="text-white/30 text-sm font-light">No analyses yet for this venture.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel text-sm">
      <span className="text-white/25 text-xs uppercase tracking-wider">{label}</span>
      <span className="text-white/65 font-light">{value}</span>
    </div>
  );
}
