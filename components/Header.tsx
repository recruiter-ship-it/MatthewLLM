
import React, { useState, useRef, useEffect } from 'react';
import { User as UserType, Tab, Vacancy } from '../types';
import { User, LogOut, Menu, X, Briefcase, ChevronDown } from './icons/Icons';

interface HeaderProps {
  user: UserType;
  onLogout: () => void;
  onProfileClick: () => void;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  tabs: Tab[];
  vacancies: Vacancy[];
  activeVacancy: Vacancy | null;
  onSelectVacancy: (id: string | null) => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onProfileClick, activeTab, setActiveTab, tabs, vacancies, activeVacancy, onSelectVacancy }) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [vacancyDropdownOpen, setVacancyDropdownOpen] = useState(false);
  const [mobileVacancySelectorOpen, setMobileVacancySelectorOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const vacancyDropdownRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (vacancyDropdownRef.current && !vacancyDropdownRef.current.contains(event.target as Node)) {
        setVacancyDropdownOpen(false);
      }
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    onProfileClick();
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
  };
  
  const handleLogoutClick = () => {
    onLogout();
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white/60 backdrop-blur-xl shadow-lg border-b border-white/20" ref={headerRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="text-2xl font-bold text-slate-800 tracking-tight">MatthewLM <span className="text-blue-600">)</span><sup className="text-xs font-medium text-blue-600 ml-1">Beta</sup></div>
            </div>
            
             {/* Vacancy Selector Dropdown */}
            <div className="relative hidden md:block" ref={vacancyDropdownRef}>
                <button 
                    onClick={() => setVacancyDropdownOpen(!vacancyDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/40 rounded-lg transition-colors"
                >
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700 max-w-48 truncate">
                        {activeVacancy ? activeVacancy.title : 'Активная вакансия'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${vacancyDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {vacancyDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-64 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden animate-fade-in-down z-40">
                       <div className="max-h-60 overflow-y-auto">
                        {vacancies.length > 0 ? vacancies.map(v => (
                            <button key={v.id} onClick={() => { onSelectVacancy(v.id); setVacancyDropdownOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-sm truncate transition-colors ${activeVacancy?.id === v.id ? 'bg-blue-500/20 text-blue-800 font-semibold' : 'text-gray-700 hover:bg-blue-500/10'}`}
                            >
                                {v.title}
                            </button>
                        )) : (
                            <div className="px-4 py-3 text-sm text-gray-500">Нет доступных вакансий.</div>
                        )}
                       </div>
                        {activeVacancy && (
                            <div className="border-t border-white/30">
                                <button onClick={() => { onSelectVacancy(null); setVacancyDropdownOpen(false); }}
                                    className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-500/10 transition-colors"
                                >
                                    <X className="w-4 h-4" /> Сбросить выбор
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
          </div>
          
          <nav className="hidden md:flex md:items-center md:space-x-2 lg:space-x-4">
            {tabs.map((tab) => (
              <button key={tab} onClick={() => handleTabClick(tab)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                  activeTab === tab 
                    ? 'bg-white/50 text-blue-600 shadow-md' 
                    : 'text-gray-600 hover:bg-white/30 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="flex items-center">
            <div className="relative hidden md:block" ref={dropdownRef}>
              <button onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-3 p-1 rounded-full transition-colors duration-300 hover:bg-white/30"
              >
                <img src={user.avatar} alt="User Avatar" className="w-9 h-9 rounded-full object-cover border-2 border-white/50" />
                <span className="text-gray-700 font-medium hidden lg:inline">{user.name}</span>
              </button>
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden animate-fade-in-down">
                  <button onClick={handleProfileClick} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-500/10 transition-colors">
                    <User className="w-5 h-5" /> Профиль
                  </button>
                  <button onClick={handleLogoutClick} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-500/10 transition-colors">
                    <LogOut className="w-5 h-5" /> Выйти
                  </button>
                </div>
              )}
            </div>

            <div className="md:hidden ml-2">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-800 hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-label="Open main menu"
              >
                {mobileMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/20 bg-white/60 backdrop-blur-xl">
            <div className="px-2 pt-3 pb-2 relative">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Активная вакансия</h3>
                <button 
                    onClick={() => setMobileVacancySelectorOpen(!mobileVacancySelectorOpen)}
                    className="mt-1 w-full flex items-center justify-between gap-2 px-3 py-2 bg-white/50 hover:bg-white/70 rounded-lg transition-colors text-left"
                >
                    <span className="text-sm font-medium text-slate-700 truncate">
                        {activeVacancy ? activeVacancy.title : 'Не выбрана'}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-slate-600 transition-transform ${mobileVacancySelectorOpen ? 'rotate-180' : ''}`} />
                </button>
                {mobileVacancySelectorOpen && (
                    <div className="mt-1 bg-white/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-lg overflow-hidden animate-fade-in-down">
                       <div className="max-h-48 overflow-y-auto">
                        {vacancies.length > 0 ? vacancies.map(v => (
                            <button key={v.id} onClick={() => { onSelectVacancy(v.id); setMobileVacancySelectorOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-sm truncate transition-colors ${activeVacancy?.id === v.id ? 'bg-blue-500/20 text-blue-800 font-semibold' : 'text-gray-700 hover:bg-blue-500/10'}`}
                            >
                                {v.title}
                            </button>
                        )) : (
                            <div className="px-4 py-3 text-sm text-gray-500">Нет доступных вакансий.</div>
                        )}
                       </div>
                        {activeVacancy && (
                            <div className="border-t border-white/30">
                                <button onClick={() => { onSelectVacancy(null); setMobileVacancySelectorOpen(false); }}
                                    className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-500/10 transition-colors"
                                >
                                    <X className="w-4 h-4" /> Сбросить выбор
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

          <nav className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-white/20 mt-2">
            {tabs.map((tab) => (
              <button key={tab} onClick={() => handleTabClick(tab)}
                className={`w-full text-left block px-3 py-2 rounded-md text-base font-medium transition-all duration-300 ${
                  activeTab === tab 
                    ? 'bg-blue-100/50 text-blue-700' 
                    : 'text-gray-600 hover:bg-white/50 hover:text-gray-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
          <div className="pt-4 pb-3 border-t border-white/20">
            <div className="flex items-center px-5">
              <div className="flex-shrink-0">
                <img className="h-10 w-10 rounded-full object-cover" src={user.avatar} alt="User Avatar" />
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">{user.name}</div>
              </div>
            </div>
            <div className="mt-3 px-2 space-y-1">
              <button onClick={handleProfileClick}
                className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-white/50 transition-colors">
                Профиль
              </button>
              <button onClick={handleLogoutClick}
                className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-white/50 transition-colors">
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down { animation: fade-in-down 0.2s ease-out; }
      `}</style>
    </header>
  );
};

export default Header;
