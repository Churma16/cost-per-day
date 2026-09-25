import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  IoHomeOutline,
  IoTimeOutline,
  IoAddOutline,
  IoStatsChartOutline,
  IoSettingsOutline,
} from 'react-icons/io5';

const NAVIGATION_DESTINATIONS = [
  { key: 'home', path: '/', Icon: IoHomeOutline, labelKey: 'navHome' },
  { key: 'planning', path: '/planning', Icon: IoTimeOutline, labelKey: 'navPlanning' },
  { key: 'add', path: '/add', Icon: IoAddOutline, labelKey: 'navAdd' },
  { key: 'analytics', path: '/analytics', Icon: IoStatsChartOutline, labelKey: 'navAnalytics' },
  { key: 'settings', path: '/settings', Icon: IoSettingsOutline, labelKey: 'navSettings' },
];

function Footer() {
  const { t } = useTranslation();
  const currentLocation = useLocation();
  const navigateToRoute = useNavigate();

  const handleNavigationClick = (targetPath) => {
    navigateToRoute(targetPath);
  };

  return (
    <nav
      aria-label={t('primaryNavigation')}
      className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-md bg-[#F6F7F8]/95 border-t border-[#E6E8EC] app-footer"
    >
      <div className="max-w-lg mx-auto px-4 h-full flex justify-around items-center">
        {NAVIGATION_DESTINATIONS.map((destination) => {
          const isCurrentRouteActive =
            destination.path === '/'
              ? currentLocation.pathname === '/'
              : currentLocation.pathname.startsWith(destination.path);

          const DestinationIconComponent = destination.Icon;

          return (
            <button
              key={destination.key}
              type="button"
              onClick={() => handleNavigationClick(destination.path)}
              aria-label={t(destination.labelKey)}
              aria-current={isCurrentRouteActive ? 'page' : undefined}
              className="relative flex flex-col items-center justify-center min-w-[48px] min-h-[48px] p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7473] rounded-lg group"
            >
              <DestinationIconComponent
                className={`text-2xl transition-colors duration-150 ${
                  isCurrentRouteActive
                    ? 'text-[#2F7473]'
                    : 'text-gray-400 group-hover:text-gray-600'
                }`}
              />
              <span className="mt-1 h-1 w-full flex items-center justify-center">
                {isCurrentRouteActive && (
                  <motion.span
                    layoutId="activeNavigationIndicator"
                    data-testid={`active-indicator-${destination.key}`}
                    aria-hidden="true"
                    className="w-1 h-1 rounded-full bg-[#2F7473]"
                    transition={{ type: 'spring', stiffness: 300, damping: 35 }}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default Footer;
