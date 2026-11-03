import { useI18n } from '../lib/i18n';

export default function Footer() {
  const { t, isRTL } = useI18n();

  return (
    <footer
      className="w-full mt-auto border-t"
      style={{ borderColor: 'var(--_hdr-b)', background: 'var(--_hdr)' }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-6 flex items-center justify-center">
        <p className="text-[11px] font-light tracking-wide text-white/20">
          {t('footer.copyright')}
        </p>
      </div>
    </footer>
  );
}
