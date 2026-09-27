import React, { memo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import NavigationIcon from './navigation/NavigationIcon';
import { useAuth } from '../contexts/AuthContext';

const NAVIGATION_DESTINATIONS = [
  { key: 'home', path: '/', labelKey: 'navHome' },
  { key: 'planning', path: '/planning', labelKey: 'navPlanning' },
  { key: 'add', path: '/add', labelKey: 'navAdd' },
  { key: 'analytics', path: '/analytics', labelKey: 'navAnalytics' },
  { key: 'settings', path: '/settings', labelKey: 'navSettings' },
];

const FooterNavigation = memo(function FooterNavigation({ currentPathname, onNavigate, isGuest }) {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t('primaryNavigation')}
      className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-md bg-[#F6F7F8]/95 border-t border-[#E6E8EC] app-footer"
    >
      <div className="max-w-lg mx-auto px-4 h-full flex justify-around items-center">
        {NAVIGATION_DESTINATIONS
          .filter((destination) => !(isGuest && destination.key === 'analytics'))
          .map((destination) => {
          const isCurrentRouteActive =
            destination.path === '/'
              ? currentPathname === '/'
              : currentPathname.startsWith(destination.path);

          return (
            <button
              key={destination.key}
              type="button"
              onClick={() => onNavigate(destination.path)}
              aria-label={t(destination.labelKey)}
              aria-current={isCurrentRouteActive ? 'page' : undefined}
              className={`navigation-destination relative flex flex-1 min-w-0 min-h-[48px] flex-col items-center justify-center px-1 py-1 focus:outline-none focus-visible:ring-2 rounded-lg ${
                isCurrentRouteActive ? 'navigation-destination--active' : ''
              }`}
            >
              <NavigationIcon
                name={destination.key}
                active={isCurrentRouteActive}
              />
              <span className="navigation-destination__label mt-0.5">
                {t(destination.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

function Footer() {
  const { pathname } = useLocation();
  const { isGuest = false } = useAuth() ?? {};
  const navigateToRoute = useNavigate();
  const navigateRef = useRef(navigateToRoute);
  navigateRef.current = navigateToRoute;

  const handleNavigationClick = useCallback((targetPath) => {
    navigateRef.current(targetPath);
  }, []);

  return (
    <FooterNavigation
      currentPathname={pathname}
      onNavigate={handleNavigationClick}
      isGuest={isGuest}
    />
  );
}

export default Footer;
