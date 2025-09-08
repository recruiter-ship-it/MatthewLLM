

import React from 'react';
import { Tab } from '../types';
import { Briefcase, FileText, Mic, Search, Home, Cpu, Users } from './icons/Icons';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  tabs: Tab[];
}

const iconMap: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  [Tab.Home]: Home,
  [Tab.Vacancies]: Briefcase,
  [Tab.Resumes]: FileText,
  [Tab.Interviews]: Mic,
  [Tab.AISourcer]: Search,
  [Tab.AIAgent]: Cpu,
};

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, tabs }) => {
  return (
    <aside className="group fixed left-0 top-0 z-40 flex h-screen flex-col aurora-panel shadow-lg border-0 border-r transition-all duration-300 ease-in-out w-20 hover:w-64">
      {/* Logo/Header part */}
      <div className="flex h-16 items-center justify-center flex-shrink-0">
        <div className="text-3xl font-bold text-slate-800 dark:text-slate-200 tracking-tight transition-all duration-300 group-hover:opacity-0 group-hover:invisible">
            M<span className="text-blue-600 dark:text-blue-400">)</span>
        </div>
        <div className="absolute left-0 top-0 flex h-16 w-64 items-center pl-6 opacity-0 invisible transition-all duration-300 group-hover:opacity-100 group-hover:visible">
           <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">MatthewLM <span className="text-blue-600 dark:text-blue-400">)</span></div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-4">
        {tabs.map((tab) => {
          const Icon = iconMap[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              title={tab}
              className={`flex w-full items-center justify-center group-hover:justify-start rounded-lg p-2.5 text-lg font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600/20 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Icon className="h-7 w-7 flex-shrink-0 transition-transform duration-200 ease-in-out group-hover:scale-110" />
              <span className="ml-5 truncate opacity-0 hidden transition-opacity duration-200 group-hover:opacity-100 group-hover:inline">{tab}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;