import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { LanguageProvider } from './contexts/LanguageContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PersistenceProvider } from './contexts/PersistenceContext';
import { ValueEquivalentsProvider } from './contexts/ValueEquivalentsContext';
import Home from './components/Home';
import AddItem from './components/AddItem';
import AddEntryPage from './components/AddEntryPage';
import Settings from './components/Settings';
import PlannedPurchases from './components/PlannedPurchases';
import DurabilityAnalytics from './components/DurabilityAnalytics';
import Footer from './components/Footer';
import PageMetadata from './components/PageMetadata';
import OwnershipLoader from './components/ui/OwnershipLoader';
import LegalDocumentPage from './components/LegalDocumentPage';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { PRODUCT_NAME } from './constants/branding';
import { SERVER_STATE_STALE_TIME } from './query/queryConfig';
import { useVersionCheck } from './hooks/useVersionCheck';

const applicationQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: SERVER_STATE_STALE_TIME,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
  },
});

const MotionLink = motion.create(Link);

const publicRouteTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.18, ease: 'easeOut' },
};

const GoogleLogo = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 18 18"
    className="h-5 w-5"
  >
    <path fill="#EA4335" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.797 2.715v2.258h2.909c1.702-1.567 2.684-3.878 2.684-6.613Z" />
    <path fill="#4285F4" d="M9 18c2.43 0 4.468-.806 5.956-2.182l-2.909-2.258c-.806.54-1.835.859-3.047.859-2.344 0-4.328-1.584-5.037-3.711H.956v2.332A9 9 0 0 0 9 18Z" />
    <path fill="#FBBC05" d="M3.963 10.708A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.281-1.708V4.96H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.04l3.007-2.332Z" />
    <path fill="#34A853" d="M9 3.581c1.321 0 2.507.454 3.44 1.345l2.581-2.581C13.464.891 11.426 0 9 0A9 9 0 0 0 .956 4.96l3.007 2.332C4.672 5.165 6.656 3.581 9 3.581Z" />
  </svg>
);

function AuthButtonContent({ pending, icon = null, children }) {
  return (
    <span className="relative flex h-full w-full items-center justify-center">
      <span className="auth-button__label flex items-center justify-center gap-2.5">
        {icon}
        <span>{children}</span>
      </span>
      <OwnershipLoader
        active={pending}
        className="auth-button__loader h-[26px] w-[26px]"
      />
    </span>
  );
}

const MainContent = () => {
  const location = useLocation();

  return (
    <main className="page-content">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="min-h-full w-full"
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/planning" element={<PlannedPurchases />} />
          <Route path="/analytics" element={<DurabilityAnalytics />} />
          <Route path="/add" element={<AddEntryPage />} />
          <Route path="/edit" element={<AddItem />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </main>
  );
};

function AuthenticatedApp() {
  return (
    <LanguageProvider>
      <CurrencyProvider>
        <ValueEquivalentsProvider>
          <PageMetadata />
          <div className="mx-auto max-w-[1024px] sm:border-x sm:border-[#E6E8EC] h-full bg-[#F6F7F8] flex flex-col">
            <MainContent />
            <Footer />
          </div>
        </ValueEquivalentsProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}

function AuthGate() {
  const { t } = useTranslation();
  const { user, isGuest, isLoading, error, signIn, continueAsGuest } = useAuth();
  const [pendingAction, setPendingAction] = React.useState(null);

  const startAuthAction = (action, callback) => {
    if (pendingAction) return;

    setPendingAction(action);
    window.setTimeout(callback, 480);
  };

  useEffect(() => {
    document.title = t('appTitle');
  }, [t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-purple-600">{t('loading')}</div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#E9EAEC] p-1.5 sm:p-6">
        <section className="w-full max-w-sm rounded-2xl bg-[#F8F9FA] px-6 py-7 text-center sm:px-7">
          <img
            src="/logo192.png"
            alt="Worthwhile"
            className="mx-auto mb-4 h-20 w-20"
          />
          <h1 className="text-xl font-bold tracking-[-0.02em] text-gray-950">{PRODUCT_NAME}</h1>
          <p className="mt-2 text-sm leading-5 text-gray-600">
            {t('authDescription')}
          </p>
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {t('authSessionError')}
            </p>
          )}
          <div className="mt-7 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => startAuthAction('google', signIn)}
              disabled={Boolean(pendingAction)}
              aria-busy={pendingAction === 'google'}
              className={`auth-button text-sm font-medium text-gray-950 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7473] focus-visible:ring-offset-2 disabled:cursor-wait ${
                pendingAction === 'google' ? 'collapsing' : ''
              }`}
            >
              <AuthButtonContent pending={pendingAction === 'google'} icon={<GoogleLogo />}>
                {t('signInWithGoogle')}
              </AuthButtonContent>
            </button>
            <div className="flex w-full items-center gap-3" role="separator" aria-label={t('authOr')}>
              <span className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-medium text-gray-400">{t('authOr')}</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>
            <button
              type="button"
              onClick={() => startAuthAction('guest', continueAsGuest)}
              disabled={Boolean(pendingAction)}
              aria-busy={pendingAction === 'guest'}
              className={`auth-button text-sm font-medium text-gray-950 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7473] focus-visible:ring-offset-2 disabled:cursor-wait ${
                pendingAction === 'guest' ? 'collapsing' : ''
              }`}
            >
              <AuthButtonContent pending={pendingAction === 'guest'}>
                {t('continueAsGuest')}
              </AuthButtonContent>
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-gray-500">
            {t('guestLocalOnlyNotice')}
          </p>
          <nav aria-label={t('legalNavigation')} className="mt-6 text-xs text-gray-500">
            <MotionLink
              className="inline-block rounded-sm underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7473]"
              to="/privacy"
              whileTap={{ scale: 0.97 }}
            >
              {t('privacyPolicy')}
            </MotionLink>
            <span aria-hidden="true" className="mx-2">·</span>
            <MotionLink
              className="inline-block rounded-sm underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7473]"
              to="/terms"
              whileTap={{ scale: 0.97 }}
            >
              {t('termsOfService')}
            </MotionLink>
          </nav>
        </section>
      </main>
    );
  }

  return <AuthenticatedApp />;
}

function ApplicationRoutes() {
  const location = useLocation();
  const transitionKey = ['/privacy', '/terms'].includes(location.pathname)
    ? location.pathname
    : 'application';

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        {...publicRouteTransition}
        className="min-h-full w-full"
      >
        <Routes location={location}>
          <Route path="/privacy" element={<LegalDocumentPage documentKey="privacy" />} />
          <Route path="/terms" element={<LegalDocumentPage documentKey="terms" />} />
          <Route
            path="*"
            element={(
              <PersistenceProvider>
                <AuthGate />
              </PersistenceProvider>
            )}
          />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function AppContent() {
  useVersionCheck();

  return (
    <AuthProvider>
      <MotionConfig reducedMotion="user">
        <Router>
          <ApplicationRoutes />
        </Router>
      </MotionConfig>
    </AuthProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={applicationQueryClient}>
      <AppContent />
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

export default App;
