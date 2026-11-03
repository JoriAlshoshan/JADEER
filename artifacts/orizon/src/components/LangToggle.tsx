import { useI18n } from '../lib/i18n';

/** Compact EN | AR pill — usable in any header. */
export default function LangToggle() {
  const { language, setLanguage } = useI18n();
  return (
    <div
      className="flex items-center rounded-lg overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
    >
      {(['en', 'ar'] as const).map((code) => (
        <button
          key={code}
          onClick={() => setLanguage(code)}
          className={`px-2.5 py-1 text-xs font-medium transition-all ${
            language === code
              ? 'bg-white/10 text-white'
              : 'text-white/30 hover:text-white/60'
          }`}
        >
          {code === 'en' ? 'EN' : 'AR'}
        </button>
      ))}
    </div>
  );
}
