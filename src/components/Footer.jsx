import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoHomeOutline, IoAddOutline, IoSettingsOutline, IoTimeOutline, IoStatsChartOutline } from "react-icons/io5";

function Footer() {
  const [activeIcon, setActiveIcon] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const handleIconClick = (iconName, path) => {
    setActiveIcon(iconName);
    setTimeout(() => {
      setActiveIcon(null);
    }, 1000);
    if (path) {
      setTimeout(() => {
        navigate(path);
      }, 150);
    }
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 backdrop-blur-md bg-white/95 border-t border-[#E6E8EC] app-footer">
      <div className="max-w-lg mx-auto px-6 h-full flex justify-around items-center">
        <button 
          className="relative p-3 group"
          onClick={() => handleIconClick('home', '/')}
          aria-label="Home"
        >
          <div className={`absolute inset-[4px] rounded-full transition-all duration-300 
            ${activeIcon === 'home' ? 'bg-purple-600 scale-100' : 'bg-transparent scale-50 opacity-0'}`} 
          />
          <IoHomeOutline className={`footer-icon relative z-10 transition-colors duration-300
            ${activeIcon === 'home' ? 'text-white' : location.pathname === '/' ? 'text-purple-800' : 'text-purple-600 group-hover:text-purple-800'}`} 
          />
        </button>
        <button 
          className="relative p-3 group"
          onClick={() => handleIconClick('planning', '/planning')}
          aria-label="Planning"
        >
          <div className={`absolute inset-[4px] rounded-full transition-all duration-300 
            ${activeIcon === 'planning' ? 'bg-teal-600 scale-100' : 'bg-transparent scale-50 opacity-0'}`} 
          />
          <IoTimeOutline className={`footer-icon relative z-10 transition-colors duration-300
            ${activeIcon === 'planning' ? 'text-white' : location.pathname === '/planning' ? 'text-teal-800' : 'text-teal-600 group-hover:text-teal-800'}`} 
          />
        </button>
        <button 
          className="relative p-3 group"
          onClick={() => handleIconClick('add', '/add')}
          aria-label="Add"
        >
          <div className={`absolute inset-[4px] rounded-full transition-all duration-300 
            ${activeIcon === 'add' ? 'bg-purple-600 scale-100' : 'bg-transparent scale-50 opacity-0'}`} 
          />
          <IoAddOutline className={`footer-add-icon relative z-10 transition-colors duration-300
            ${activeIcon === 'add' ? 'text-white' : location.pathname === '/add' ? 'text-purple-800' : 'text-purple-600 group-hover:text-purple-800'}`} 
          />
        </button>
        <button 
          className="relative p-3 group"
          onClick={() => handleIconClick('analytics', '/analytics')}
          aria-label="Analytics"
        >
          <div className={`absolute inset-[4px] rounded-full transition-all duration-300 
            ${activeIcon === 'analytics' ? 'bg-indigo-600 scale-100' : 'bg-transparent scale-50 opacity-0'}`} 
          />
          <IoStatsChartOutline className={`footer-icon relative z-10 transition-colors duration-300
            ${activeIcon === 'analytics' ? 'text-white' : location.pathname === '/analytics' ? 'text-indigo-800' : 'text-purple-600 group-hover:text-purple-800'}`} 
          />
        </button>
        <button 
          className="relative p-3 group"
          onClick={() => handleIconClick('settings', '/settings')}
          aria-label="Settings"
        >
          <div className={`absolute inset-[4px] rounded-full transition-all duration-300 
            ${activeIcon === 'settings' ? 'bg-purple-600 scale-100' : 'bg-transparent scale-50 opacity-0'}`} 
          />
          <IoSettingsOutline className={`footer-icon relative z-10 transition-colors duration-300
            ${activeIcon === 'settings' ? 'text-white' : location.pathname === '/settings' ? 'text-purple-800' : 'text-purple-600 group-hover:text-purple-800'}`} 
          />
        </button>
      </div>
    </div>
  );
}

export default Footer; 