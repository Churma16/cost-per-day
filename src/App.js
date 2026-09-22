import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { CurrencyProvider, useCurrency } from './contexts/CurrencyContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ItemList from './components/ItemList';
import AddItem from './components/AddItem';
import Settings from './components/Settings';
import Footer from './components/Footer';
import PageMetadata from './components/PageMetadata';
import { useTranslation } from 'react-i18next';
import { TotalCostProvider, useTotalCost } from './contexts/TotalCostContext';
import { formatCurrency } from './utils/formatters';

const Header = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { totalDailyCost } = useTotalCost();
  const { currencyCode } = useCurrency();
  const { user, signOut } = useAuth();

  const getTitle = () => {
    switch(location.pathname) {
      case '/add':
        return t('addNewItem');
      case '/edit':
        return t('editItem');
      case '/settings':
        return t('settings');
      default:
        return t('totalDailyCost');
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-500 to-purple-600 page-header relative">
      <div className="text-center py-4 px-16">
        <h1 className="text-2xl font-bold text-white">
          {getTitle()}
        </h1>
        {location.pathname === '/' && (
          <p className="text-white text-4xl font-orbitron font-bold tracking-wider mt-2">
            {formatCurrency(totalDailyCost, currencyCode)}<span className="text-lg">{t('perDay')}</span>
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => signOut()}
        className="absolute right-3 top-3 text-xs text-white/90 hover:text-white"
        aria-label="Sign out"
        title={user?.displayName || user?.email || 'Sign out'}
      >
        Sign out
      </button>
    </div>
  );
};

const MainContent = () => (
  <div className="page-content">
    <Routes>
      <Route path="/" element={<ItemList />} />
      <Route path="/add" element={<AddItem />} />
      <Route path="/edit" element={<AddItem />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </div>
);

function AuthenticatedApp() {
  return (
    <LanguageProvider>
      <CurrencyProvider>
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
      </CurrencyProvider>
    </LanguageProvider>
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
          <h1 className="text-2xl font-bold text-gray-900">Cost Per Day</h1>
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
