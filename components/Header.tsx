import React, { useState, useRef, useEffect } from 'react';
import { Recruiter, Tab, Vacancy } from '../types';
import { User, LogOut, Menu, X, Briefcase, ChevronDown, Mic, MicOff, Sun, Moon, Volume2, VolumeX } from './icons/Icons';

interface HeaderProps {
  user: Recruiter; // Now receives the active user/recruiter
  onLogout: () => void;
  onProfileClick: () => void;
  vacancies: Vacancy[];
  activeVacancy: Vacancy | null;
  onSelectVacancy: (id: string | null) => void;
  isWakeWordEnabled: boolean;
  onToggleWakeWord: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  isAssistantVoiceEnabled: boolean;
  onToggleAssistantVoice: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  user, onLogout, onProfileClick,
  vacancies, activeVacancy, onSelectVacancy, 
  isWakeWordEnabled, onToggleWakeWord,
  theme, onToggleTheme,
  isAssistantVoiceEnabled, onToggleAssistantVoice
}) => {
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

  return (
    <header className="sticky top-0 z-30 w-full aurora-panel shadow-lg border-0 border-b" ref={headerRef}>
       <style>{`
        @keyframes pulse-mic {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          50% { box-shadow: 0 0 0 5px rgba(59, 130, 246, 0); }
        }
        .animate-pulse-mic { animation: pulse-mic 1.5s infinite; }
      `}</style>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            {/* Vacancy Selector Dropdown */}
            <div className="relative" ref={vacancyDropdownRef}>
                <button 
                    onClick={() => setVacancyDropdownOpen(!vacancyDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 bg-white/20 dark:bg-slate-800/40 hover:bg-white/40 dark:hover:bg-slate-700/60 rounded-lg transition-colors"
                >
                    <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 max-w-48 truncate">
                        {activeVacancy ? activeVacancy.title : 'Активная вакансия'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-600 dark:text-slate-400 transition-transform ${vacancyDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {vacancyDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-64 bg-white/60 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 rounded-xl shadow-2xl overflow-hidden animate-fade-in-down z-40">
                       <div className="max-h-60 overflow-y-auto">
                        {vacancies.length > 0 ? vacancies.map(v => (
                            <button key={v.id} onClick={() => { onSelectVacancy(v.id); setVacancyDropdownOpen(false); }}
                                className={`w-full text-left px-4 py-2 text-sm truncate transition-colors ${activeVacancy?.id === v.id ? 'bg-blue-500/20 text-blue-800 dark:text-blue-300 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-blue-500/10 dark:hover:bg-blue-500/10'}`}
                            >
                                {v.title}
                            </button>
                        )) : (
                            <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">Нет доступных вакансий.</div>
                        )}
                       </div>
                        {activeVacancy && (
                            <div className="border-t border-white/30 dark:border-slate-700/30">
                                <button onClick={() => { onSelectVacancy(null); setVacancyDropdownOpen(false); }}
                                    className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    <X className="w-4 h-4" /> Сбросить выбор
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
                onClick={onToggleWakeWord}
                title={isWakeWordEnabled ? 'Выключить голосовую активацию' : 'Включить голосовую активацию по слову "Matthew"'}
                className={`p-2 rounded-full transition-colors ${isWakeWordEnabled ? 'bg-blue-500/20 animate-pulse-mic' : 'hover:bg-white/30 dark:hover:bg-slate-700/50'}`}
            >
                {isWakeWordEnabled ? <Mic className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : <MicOff className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
            </button>
             <button
                onClick={onToggleTheme}
                title="Переключить тему"
                className="p-2 rounded-full transition-colors hover:bg-white/30 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400"
            >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5 text-yellow-400" />}
            </button>
            <button
                onClick={onToggleAssistantVoice}
                title={isAssistantVoiceEnabled ? 'Выключить голосовые ответы' : 'Включить голосовые ответы'}
                className="p-2 rounded-full transition-colors hover:bg-white/30 dark:hover:bg-slate-700/50"
            >
                {isAssistantVoiceEnabled ? <Volume2 className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : <VolumeX className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
            </button>
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-3 p-1 rounded-full transition-colors duration-300 hover:bg-white/30 dark:hover:bg-slate-700/50"
              >
                <img src={user.avatar} alt="User Avatar" className="w-9 h-9 rounded-full object-cover border-2 border-white/50 dark:border-slate-600/50" />
                <span className="text-gray-700 dark:text-gray-300 font-medium hidden lg:inline">{user.name}</span>
              </button>
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white/60 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 rounded-xl shadow-2xl overflow-hidden animate-fade-in-down">
                  <button onClick={handleProfileClick} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-500/10 transition-colors">
                    <User className="w-5 h-5" /> Профиль
                  </button>
                  <button onClick={handleLogoutClick} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-500/10 transition-colors">
                    <LogOut className="w-5 h-5" /> Выйти
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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