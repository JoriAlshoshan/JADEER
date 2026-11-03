import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateProject, useCreateAnalysis } from "@workspace/api-client-react";
import Layout from "../components/Layout";
import { ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "../lib/i18n";

export default function ProjectNew() {
  const [, setLocation] = useLocation();
  const { mutateAsync: createProject, isPending: isCreatingProject } = useCreateProject();
  const { mutateAsync: createAnalysis, isPending: isCreatingAnalysis } = useCreateAnalysis();
  const { t, isRTL, language } = useI18n();

  const [formData, setFormData] = useState({
    title: "",
    ideaSummary: "",
    industry: "",
    targetMarket: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const pending = sessionStorage.getItem("jadeer_pending_idea");
    if (pending) {
      setFormData(prev => ({ ...prev, ideaSummary: pending }));
      sessionStorage.removeItem("jadeer_pending_idea");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!formData.title || !formData.ideaSummary) {
      setError(t('project_new.error'));
      return;
    }
    try {
      const project = await createProject({ data: formData });
      const analysis = await createAnalysis({ projectId: project.id, data: { language } });
      setLocation(`/projects/${project.id}/analysis/${analysis.id}`);
    } catch (err: any) {
      setError(err.message || t('project_new.error'));
    }
  };

  const isPending = isCreatingProject || isCreatingAnalysis;

  return (
    <Layout>
      <div
        className="max-w-2xl mx-auto w-full px-8 py-16 flex-1 flex flex-col justify-center"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-xs tracking-[0.3em] uppercase font-light mb-4"
            style={{ color: '#C9A84C' }}>
            {t('project_new.eyebrow')}
          </p>
          <h1 className="text-3xl font-light tracking-tight mb-2">
            {t('project_new.title')}
          </h1>
          <p className="text-white/35 font-light mb-12 text-sm">
            {t('project_new.subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl text-sm font-light"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(252,165,165,0.9)' }}>
                {error}
              </div>
            )}

            <Field label={t('project_new.name_label')} required hint={t('project_new.required')}>
              <input
                type="text"
                autoFocus
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('project_new.ph_name')}
                className="input-jadeer"
                disabled={isPending}
              />
            </Field>

            <Field label={t('project_new.idea_label')} required hint={t('project_new.required')}>
              <textarea
                value={formData.ideaSummary}
                onChange={e => setFormData({ ...formData, ideaSummary: e.target.value })}
                placeholder={t('project_new.ph_idea')}
                className="input-jadeer min-h-[130px] resize-none"
                disabled={isPending}
              />
            </Field>

            <div className="grid grid-cols-2 gap-5">
              <Field label={t('project_new.industry_label')} hint={t('project_new.optional')}>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={e => setFormData({ ...formData, industry: e.target.value })}
                  placeholder={t('project_new.ph_industry')}
                  className="input-jadeer"
                  disabled={isPending}
                />
              </Field>
              <Field label={t('project_new.market_label')} hint={t('project_new.optional')}>
                <input
                  type="text"
                  value={formData.targetMarket}
                  onChange={e => setFormData({ ...formData, targetMarket: e.target.value })}
                  placeholder={t('project_new.ph_market')}
                  className="input-jadeer"
                  disabled={isPending}
                />
              </Field>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isPending || !formData.title || !formData.ideaSummary}
                className="w-full group flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100"
                style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('project_new.loading')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('project_new.begin')}</span>
                    <ArrowRight className={`w-4 h-4 transition-transform ${isRTL ? 'group-hover:-translate-x-0.5 rotate-180' : 'group-hover:translate-x-0.5'}`} />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </Layout>
  );
}

function Field({
  label, required, hint, children
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-white/35 mb-2">
        {label}
        {hint && <span className="text-[10px] normal-case tracking-normal" style={{ color: 'rgba(201,168,76,0.6)' }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}
