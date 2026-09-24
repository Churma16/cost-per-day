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
import { PRODUCT_NAME } from './constants/branding';

const applicationQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const Header = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { totalDailyCost } = useTotalCost();
  const { currencyCode } = useCurrency();
  const { user, error, signOut } = useAuth();

  const getTitle = () => {
    switch(location.pathname) {
      case '/add':
        return t('addNewItem');
      case '/edit':
        return t('editItem');
      case '/settings':
        return t('settings');
      case '/planning':
        return t('plannedPurchases');
      case '/analytics':
        return t('durabilityAndOwnership');
      default:
        return t('totalDailyCost');
    }
  };

  return (
    <div
      className="page-header relative text-white shadow-sm"
      style={{
        background: 'linear-gradient(135deg, #334A5B 0%, #32636A 55%, #2F7473 100%)',
      }}
    >
      <div className="text-center py-4 px-4 sm:px-16">
        {location.pathname === '/' ? (
          <div>
            <HeroCarousel />
            <div className="mt-4 pt-3 border-t border-white/10 inline-flex items-center justify-center gap-2 text-white/90">
              <span className="text-xs uppercase tracking-wider font-medium text-white/75">{t('totalDailyCost')}:</span>
              <span className="font-semibold text-base text-white tracking-tight tabular-nums">
                {formatCurrency(totalDailyCost, currencyCode)}<span className="text-xs font-normal text-white/75">{t('perDay')}</span>
              </span>
            </div>
          </div>
        ) : (
          <h1 className="text-2xl font-bold text-white">
            {getTitle()}
          </h1>
        )}
      </div>
      <div className="absolute right-3 top-3 text-right">
        <button
          type="button"
          onClick={signOut}
          className="text-xs text-white/90 hover:text-white"
          aria-label="Sign out"
          title={user?.displayName || user?.email || 'Sign out'}
        >
          Sign out
        </button>
        {error && (
          <p role="alert" className="mt-1 max-w-40 text-xs text-red-100">
            Sign out failed. Please try again.
          </p>
        )}
      </div>
    </div>
  );
};

const MainContent = () => (
  <div className="page-content">
    <Routes>
      <Route path="/" element={<ItemList />} />
      <Route path="/planning" element={<PlannedPurchases />} />
      <Route path="/analytics" element={<DurabilityAnalytics />} />
      <Route path="/add" element={<AddItem />} />
      <Route path="/edit" element={<AddItem />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </div>
);

function AuthenticatedApp() {
  return (
    <QueryClientProvider client={applicationQueryClient}>
      <LanguageProvider>
        <CurrencyProvider>
          <ValueEquivalentsProvider>
            <PageMetadata />
            <TotalCostProvider>
              <Router>
                <div className="mx-auto max-w-[1024px] sm:border-x sm:border-gray-200 h-full bg-gray-50 flex flex-col">
                  <Header />
                  <MainContent />
                  <Footer />
                </div>
              </Router>
            </TotalCostProvider>
          </ValueEquivalentsProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </QueryClientProvider>
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

function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

export default App;
