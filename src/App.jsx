import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from './contexts/LanguageContext';
import { CurrencyProvider, useCurrency } from './contexts/CurrencyContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ValueEquivalentsProvider } from './contexts/ValueEquivalentsContext';
import ItemList from './components/ItemList';
import AddItem from './components/AddItem';
import Settings from './components/Settings';
import PlannedPurchases from './components/PlannedPurchases';
import DurabilityAnalytics from './components/DurabilityAnalytics';
import Footer from './components/Footer';
import PageMetadata from './components/PageMetadata';
import HeroCarousel from './components/HeroCarousel';
import { useTranslation } from 'react-i18next';
import { TotalCostProvider, useTotalCost } from './contexts/TotalCostContext';
import { formatCurrency } from './utils/formatters';
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

const Header = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { totalDailyCost } = useTotalCost();
  const { currencyCode } = useCurrency();

  // Non-home routes render their own dedicated headers to maintain clean, predictable page shells
  if (location.pathname !== '/') {
    return null;
  }

  return (
    <header
      className="relative z-10 shadow-sm flex-shrink-0 text-white"
      style={{
        background: 'linear-gradient(135deg, #334A5B 0%, #32636A 55%, #2F7473 100%)',
      }}
    >
      <div className="pt-3 pb-3 px-4 max-w-lg mx-auto">
        <div>
          <HeroCarousel />
          {/* Supporting Context Row: Inside hero at the bottom with thin divider */}
          <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between text-white/90 px-1">
            <span className="text-xs tracking-wide text-white/75 font-normal">{t('totalDailyCost')}</span>
            <span className="font-semibold text-base text-white tracking-tight tabular-nums">
              {formatCurrency(totalDailyCost, currencyCode)}<span className="text-xs font-normal text-white/75">{t('perDay')}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

const MainContent = () => {
  const location = useLocation();

  return (
    <div className="page-content">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="h-full w-full"
      >
        <Routes location={location}>
          <Route path="/" element={<ItemList />} />
          <Route path="/planning" element={<PlannedPurchases />} />
          <Route path="/analytics" element={<DurabilityAnalytics />} />
          <Route path="/add" element={<AddItem />} />
          <Route path="/edit" element={<AddItem />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </div>
  );
};

function AuthenticatedApp() {
  return (
    <MotionConfig reducedMotion="user">
      <LanguageProvider>
        <CurrencyProvider>
          <ValueEquivalentsProvider>
            <PageMetadata />
            <TotalCostProvider>
              <Router>
                <div className="mx-auto max-w-[1024px] sm:border-x sm:border-[#E6E8EC] h-full bg-[#F6F7F8] flex flex-col">
                  <Header />
                  <MainContent />
                  <Footer />
                </div>
              </Router>
            </TotalCostProvider>
          </ValueEquivalentsProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </MotionConfig>
  );
}

function AuthGate() {
  const { user, isLoading, error, signIn } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-purple-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
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
            Sign in to access your items and settings across devices.
          </p>
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              Unable to check your session. You can try signing in again.
            </p>
          )}
          <button
            type="button"
            onClick={signIn}
            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Sign in with Google
          </button>
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
      <AuthGate />
    </AuthProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={applicationQueryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
