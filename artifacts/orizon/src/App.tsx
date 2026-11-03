import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, useLocation, Redirect } from 'wouter';
import { useState } from "react";
import {
  ClerkProvider, Show, ClerkLoaded,
  AuthenticateWithRedirectCallback,
  useClerk, useAuth,
} from '@clerk/react';
import { I18nProvider, useI18n } from './lib/i18n';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import ProjectNew from './pages/ProjectNew';
import ProjectDetail from './pages/ProjectDetail';
import AnalysisDetail from './pages/AnalysisDetail';
import Settings from './pages/Settings';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}



const queryClient = new QueryClient();

// ─────────────────────────────────────────────────────────────────
// CUSTOM AUTH PAGE — fully custom sign-in/sign-up using Clerk hooks
// This eliminates the Clerk dev badge that appears with <SignIn />.
// ─────────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function AuthPage({ initialMode = 'sign-in' }: { initialMode?: 'sign-in' | 'sign-up' }) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up' | 'verify'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Use useClerk() + useAuth() from main @clerk/react (no duplicate-React issue).
  // clerk.client.signIn / clerk.client.signUp are the same SignInResource /
  // SignUpResource objects the legacy useSignIn/useSignUp hooks expose.
  const clerk = useClerk();
  const { isLoaded } = useAuth();
  const { t, isRTL } = useI18n();
  const [, navigate] = useLocation();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !clerk.client) return;
    setLoading(true);
    setError('');
    try {
      const result = await clerk.client.signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await clerk.setActive({ session: result.createdSessionId });
        navigate('/dashboard');
      } else {
        setError(t('auth.error_generic'));
      }
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message: string }> };
      setError(e.errors?.[0]?.message || t('auth.error_sign_in'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !clerk.client) return;
    setLoading(true);
    setError('');
    try {
      await clerk.client.signUp.create({ emailAddress: email, password });
      await clerk.client.signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setMode('verify');
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message: string }> };
      setError(e.errors?.[0]?.message || t('auth.error_sign_up'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !clerk.client) return;
    setLoading(true);
    setError('');
    try {
      const result = await clerk.client.signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await clerk.setActive({ session: result.createdSessionId });
        navigate('/dashboard');
      } else {
        setError(t('auth.error_verify'));
      }
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message: string }> };
      setError(e.errors?.[0]?.message || t('auth.error_verify'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!isLoaded || !clerk.client) {
      setError('Authentication is still loading. Please try again.');
      return;
    }
    setLoading(true);
    setError('');
    const redirectUrl = `${window.location.origin}${basePath}/sso-callback`;
    const redirectUrlComplete = `${window.location.origin}${basePath}/dashboard`;
    try {
      await clerk.client.signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl,
        redirectUrlComplete,
      });
      // authenticateWithRedirect navigates away; if we reach here the page is
      // still active (e.g. sandboxed Replit preview iframe).  Open a new tab
      // so the user can complete sign-in outside the iframe.
      if (window.self !== window.top) {
        window.open(
          `${window.location.origin}${basePath}/sign-in`,
          '_blank',
        );
      }
      setLoading(false);
    } catch (err: unknown) {
      const e = err as { errors?: Array<{ message: string }>; message?: string };
      setError(e.errors?.[0]?.message || e.message || t('auth.error_generic'));
      setLoading(false);
    }
  };

  const inputClass = [
    'w-full px-4 py-3 rounded-xl text-sm text-white placeholder:text-white/30',
    'outline-none transition-all duration-200 bg-white/[0.06] border border-white/10',
    'focus:border-[rgba(201,168,76,0.5)] focus:bg-white/[0.08]',
  ].join(' ');

  const btnPrimary = [
    'w-full py-3 rounded-xl text-sm font-semibold text-black transition-all duration-200',
    'hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait',
    'flex items-center justify-center gap-2',
  ].join(' ');

  // ── Email verification screen ──
  if (mode === 'verify') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="w-full max-w-sm">
          <div className="rounded-2xl p-8 space-y-6"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {/* Logo */}
            <div className="flex flex-col items-center text-center gap-4 pb-2">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <img src={`${basePath}/logo.svg`} alt="Jadeer" className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">{t('auth.verify_title')}</h1>
                <p className="text-sm text-white/40 mt-1">{t('auth.verify_desc')} <span className="text-white/60">{email}</span></p>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder={t('auth.code_ph')}
                className={`${inputClass} text-center text-2xl tracking-[1rem] font-mono`}
                autoFocus
                required
              />
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              <button type="submit" disabled={loading || code.length < 6}
                className={btnPrimary} style={{ background: '#C9A84C' }}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t('auth.verifying')}</> : t('auth.verify_btn')}
              </button>
            </form>

            <button
              onClick={() => { setMode('sign-up'); setCode(''); setError(''); }}
              className="w-full text-center text-xs text-white/30 hover:text-white/50 transition-colors"
            >
              {t('auth.back')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSignIn = mode === 'sign-in';

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl p-8 space-y-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

          {/* Logo + Title */}
          <div className="flex flex-col items-center text-center gap-3 pb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
              <img src={`${basePath}/logo.svg`} alt="Jadeer" className="w-6 h-6" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight text-white">Jadeer</div>
              <p className="text-sm text-white/40 font-light mt-0.5">
                {isSignIn ? t('auth.sign_in_sub') : t('auth.sign_up_sub')}
              </p>
            </div>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-medium
              bg-white text-gray-800 hover:bg-gray-50 active:scale-[0.98] transition-all duration-200
              disabled:opacity-50 disabled:cursor-wait shadow-sm"
          >
            <GoogleIcon />
            {t('auth.continue_google')}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs text-white/25 uppercase tracking-widest">{t('auth.or')}</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Email/password form */}
          <form onSubmit={isSignIn ? handleSignIn : handleSignUp} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-white/60 uppercase tracking-widest">
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('auth.email_ph')}
                className={inputClass}
                autoComplete="email"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-white/60 uppercase tracking-widest">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('auth.password_ph')}
                  className={`${inputClass} ${isRTL ? 'pl-11' : 'pr-11'}`}
                  autoComplete={isSignIn ? 'current-password' : 'new-password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'} text-white/30 hover:text-white/60 transition-colors`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-400 text-xs text-center rounded-lg py-2 px-3"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={btnPrimary}
              style={{ background: '#C9A84C' }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />{isSignIn ? t('auth.signing_in') : t('auth.creating')}</>
                : (isSignIn ? t('auth.sign_in') : t('auth.sign_up'))
              }
            </button>
          </form>

          {/* Required by Clerk bot-protection — invisible but must be in DOM */}
          <div id="clerk-captcha" className="hidden" />

          {/* Toggle mode */}
          <p className="text-center text-sm text-white/35">
            {isSignIn ? t('auth.no_account') : t('auth.have_account')}{' '}
            <button
              onClick={() => { setMode(isSignIn ? 'sign-up' : 'sign-in'); setError(''); setCode(''); }}
              className="font-medium transition-colors hover:opacity-80"
              style={{ color: '#C9A84C' }}
            >
              {isSignIn ? t('auth.switch_sign_up') : t('auth.switch_sign_in')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// APP SHELL
// ─────────────────────────────────────────────────────────────────

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  // Clerk passes full paths to routerPush/routerReplace, but wouter's
  // setLocation prepends the base — strip it to avoid doubling.
  function stripBase(path: string): string {
    return basePath && path.startsWith(basePath)
      ? path.slice(basePath.length) || '/'
      : path;
  }

  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      signInFallbackRedirectUrl={`${basePath}/dashboard`}
      signUpFallbackRedirectUrl={`${basePath}/dashboard`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <Switch>
          {/* Public routes */}
          <Route path="/" component={LandingPage} />

          {/* Auth routes — custom forms, no Clerk component → no dev badge */}
          <Route path="/sign-in">
            <Show when="signed-out"><AuthPage initialMode="sign-in" /></Show>
            <Show when="signed-in"><Redirect to="/dashboard" /></Show>
          </Route>
          <Route path="/sign-up">
            <Show when="signed-out"><AuthPage initialMode="sign-up" /></Show>
            <Show when="signed-in"><Redirect to="/dashboard" /></Show>
          </Route>

          {/* OAuth callback — handles Google / social redirects */}
          <Route path="/sso-callback">
            <ClerkLoaded>
              <AuthenticateWithRedirectCallback
                signInForceRedirectUrl={`${basePath}/dashboard`}
                signUpForceRedirectUrl={`${basePath}/dashboard`}
              />
            </ClerkLoaded>
          </Route>

          {/* Protected routes */}
          <Route path="/dashboard" component={() => (
            <>
              <Show when="signed-in"><Dashboard /></Show>
              <Show when="signed-out"><Redirect to="/sign-in" /></Show>
            </>
          )} />
          <Route path="/projects/new" component={() => (
            <>
              <Show when="signed-in"><ProjectNew /></Show>
              <Show when="signed-out"><Redirect to="/sign-in" /></Show>
            </>
          )} />
          <Route path="/projects/:projectId" component={() => (
            <>
              <Show when="signed-in"><ProjectDetail /></Show>
              <Show when="signed-out"><Redirect to="/sign-in" /></Show>
            </>
          )} />
          <Route path="/projects/:projectId/analysis/:analysisId" component={() => (
            <>
              <Show when="signed-in"><AnalysisDetail /></Show>
              <Show when="signed-out"><Redirect to="/sign-in" /></Show>
            </>
          )} />
          <Route path="/settings" component={() => (
            <>
              <Show when="signed-in"><Settings /></Show>
              <Show when="signed-out"><Redirect to="/sign-in" /></Show>
            </>
          )} />

          <Route>
            <div className="flex min-h-screen items-center justify-center text-muted-foreground">
              404 | Not Found
            </div>
          </Route>
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <I18nProvider>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </I18nProvider>
  );
}

export default App;
