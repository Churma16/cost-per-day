import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  IoHomeOutline,
  IoTimeOutline,
  IoAddOutline,
  IoStatsChartOutline,
  IoSettingsOutline,
} from 'react-icons/io5';

const NAVIGATION_DESTINATIONS = [
  { key: 'home', path: '/', Icon: IoHomeOutline, label: 'Home' },
  { key: 'planning', path: '/planning', Icon: IoTimeOutline, label: 'Planning' },
  { key: 'add', path: '/add', Icon: IoAddOutline, label: 'Add' },
  { key: 'analytics', path: '/analytics', Icon: IoStatsChartOutline, label: 'Analytics' },
  { key: 'settings', path: '/settings', Icon: IoSettingsOutline, label: 'Settings' },
];

function Footer() {
  const currentLocation = useLocation();
  const navigateToRoute = useNavigate();

  const handleNavigationClick = (targetPath) => {
    navigateToRoute(targetPath);
  };

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-md bg-white/95 border-t border-[#E6E8EC] app-footer"
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
              aria-label={destination.label}
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
              <span
                data-testid={`active-indicator-${destination.key}`}
                aria-hidden="true"
                className={`mt-1 w-1 h-1 rounded-full transition-all duration-150 ${
                  isCurrentRouteActive
                    ? 'bg-[#2F7473] opacity-100'
                    : 'bg-transparent opacity-0'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default Footer;