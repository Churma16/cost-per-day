import React from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { MotionConfig, motion } from 'motion/react';
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
    <MotionConfig reducedMotion="user">
      <LanguageProvider>
        <CurrencyProvider>
          <ValueEquivalentsProvider>
            <PageMetadata />
            <Router>
              <div className="mx-auto max-w-[1024px] sm:border-x sm:border-[#E6E8EC] h-full bg-[#F6F7F8] flex flex-col">
                <MainContent />
                <Footer />
              </div>
            </Router>
          </ValueEquivalentsProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </MotionConfig>
  );
}

function AuthGate() {
  const { t } = useTranslation();
  const { user, isGuest, isLoading, error, signIn, continueAsGuest } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-purple-600">{t('loading')}</div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <section className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg text-center">
          <img
            src="/logo192.png"
            alt="Worthwhile"
            className="w-20 h-20 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900">{PRODUCT_NAME}</h1>
          <p className="mt-3 text-sm text-gray-600">
            {t('authDescription')}
          </p>
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {t('authSessionError')}
            </p>
          )}
          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={continueAsGuest}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 font-semibold text-gray-800 hover:bg-gray-50"
            >
              {t('continueAsGuest')}
            </button>
            <button
              type="button"
              onClick={signIn}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
            >
              {t('signInWithGoogle')}
            </button>
          </div>
          <p className="mt-4 text-xs leading-5 text-gray-500">
            {t('guestLocalOnlyNotice')}
          </p>
        </section>
      </main>
    );
  }

  return <AuthenticatedApp />;
}

function AppContent() {
  useVersionCheck();

  return (
    <AuthProvider>
      <PersistenceProvider>
        <AuthGate />
      </PersistenceProvider>
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
