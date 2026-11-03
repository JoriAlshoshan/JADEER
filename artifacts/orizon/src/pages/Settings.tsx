import { useGetMe, useUpdateMe } from "@workspace/api-client-react";
import Layout from "../components/Layout";
import { useClerk } from "@clerk/react";
import { Loader2, Globe, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useI18n } from "../lib/i18n";

export default function Settings() {
  const { data: user, isLoading } = useGetMe();
  const { mutate: updateMe, isPending: isUpdating } = useUpdateMe();
  const { openUserProfile, signOut } = useClerk();
  const { language, setLanguage, t, isRTL } = useI18n();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (user?.name) setName(user.name); }, [user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateMe({ data: { name } }, {
      onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2500); },
    });
  };

  const SectionHeading = ({ label }: { label: string }) => (
    <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-white/30 mb-5">{label}</h2>
  );

  return (
    <Layout>
      <div
        className="max-w-xl mx-auto w-full px-6 sm:px-8 py-14"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Page title */}
        <div className="mb-12">
          <p className="text-xs tracking-[0.3em] uppercase font-light mb-3" style={{ color: '#C9A84C' }}>
            {t('settings.eyebrow')}
          </p>
          <h1 className="text-3xl font-light tracking-tight">{t('settings.title')}</h1>
        </div>

        <div className="space-y-10">

          {/* ── Profile ─────────────────────────────────────────────── */}
          <section>
            <SectionHeading label={t('settings.profile')} />
            <div className="glass-panel rounded-2xl p-6">
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs text-white/35 mb-2 uppercase tracking-widest">
                    {t('settings.display_name')}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="input-jadeer text-sm w-full"
                    disabled={isLoading || isUpdating}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isUpdating || !name.trim() || name === user?.name}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-35 disabled:pointer-events-none"
                  style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: '#C9A84C' }}
                >
                  {isUpdating
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : saved
                      ? <><CheckCircle2 className="w-4 h-4" /> {t('settings.saved')}</>
                      : t('settings.save')
                  }
                </button>
              </form>
            </div>
          </section>

          {/* ── Preferences ─────────────────────────────────────────── */}
          <section>
            <SectionHeading label={t('settings.preferences')} />
            <div className="glass-panel rounded-2xl p-6 space-y-7">

              {/* Language */}
              <div>
                <p className="text-xs text-white/35 mb-3 uppercase tracking-widest flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                  {t('settings.language')}
                </p>
                <div
                  className="flex rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {([['en', 'English'], ['ar', 'العربية']] as const).map(([code, label]) => (
                    <button
                      key={code}
                      onClick={() => setLanguage(code)}
                      className={`flex-1 py-2.5 text-sm transition-all ${
                        language === code
                          ? 'bg-white/[0.08] text-white font-medium'
                          : 'text-white/35 hover:text-white/60 hover:bg-white/[0.03]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </section>

          {/* ── Account ─────────────────────────────────────────────── */}
          <section>
            <SectionHeading label={t('settings.account')} />
            <div className="glass-panel rounded-2xl p-6 space-y-3">
              <button
                onClick={() => openUserProfile()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/[0.05] active:scale-95"
                style={{ border: '1px solid var(--_dropdown-b)', color: 'rgba(255,255,255,0.65)' }}
              >
                {t('settings.manage_account')}
              </button>
              <button
                onClick={() => signOut({ redirectUrl: '/' })}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-red-400/[0.06] active:scale-95"
                style={{ border: '1px solid rgba(239,68,68,0.18)', color: 'rgba(248,113,113,0.75)' }}
              >
                {t('settings.sign_out')}
              </button>
            </div>
          </section>

        </div>
      </div>
    </Layout>
  );
}
