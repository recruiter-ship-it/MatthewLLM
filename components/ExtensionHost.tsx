

import React, { useState, useEffect } from 'react';
import { Vacancy } from '../types';
import RecruiterChatWidget from './RecruiterChatWidget';
import PageAnalyzer from './PageAnalyzer';
import { X, AiChat } from './icons/Icons';

declare const chrome: any;

type ActiveTab = 'chat' | 'analyzer';

const ExtensionHost: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('analyzer');
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load data from chrome storage
    const loadData = async () => {
      try {
        const data = await chrome.storage.local.get(['vacancies']);
        setVacancies(data.vacancies || []);
      } catch (e) {
        console.error("Error loading data from storage:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    
    // Listen for storage changes to keep vacancies up-to-date
    const storageListener = (changes: any, areaName: string) => {
        if (areaName === 'local' && changes.vacancies) {
            setVacancies(changes.vacancies.newValue || []);
        }
    };
    chrome.storage.onChanged.addListener(storageListener);

    // Listen for messages from the content script
    const messageListener = (event: MessageEvent) => {
        if (event.data.type === 'toggle_widget_window') {
            setIsVisible(event.data.visible);
        }
    };
    window.addEventListener('message', messageListener);

    return () => {
        window.removeEventListener('message', messageListener);
        chrome.storage.onChanged.removeListener(storageListener);
    };

  }, []);

  const handleToggleWidget = () => {
    // This will message the content script, which will then message us back
    // For now, we just update our state, but a better approach would be
    // to have the content script be the source of truth.
    // For this simple toggle, we can just ask the background to toggle.
    // The easiest is to just re-click the action. But we can't do that.
    // So we just hide ourselves. The user can reopen with the action icon.
    setIsVisible(false);
  }
  
  if (!isVisible) {
      return null;
  }
  
  if (isLoading) {
      return (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin pointer-events-auto"></div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 pointer-events-none bg-black/10">
      <div
        className={`fixed bottom-5 right-5 z-40 w-[calc(100%-2.5rem)] max-w-sm h-[70vh] max-h-[600px] bg-indigo-100/50 backdrop-blur-2xl border border-white/30 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-in-out pointer-events-auto animate-fade-in-up`}
      >
        <header className="flex items-center justify-between p-4 border-b border-white/30 flex-shrink-0 bg-white/20">
          <div className="flex items-center gap-2">
            <AiChat className="w-6 h-6 text-slate-800" />
            <h3 className="font-bold text-slate-800">Мэтью Ассистент</h3>
          </div>
          <button onClick={handleToggleWidget} className="text-slate-600 hover:text-slate-900">
            <X className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-shrink-0 border-b border-white/30 px-2 pt-2 bg-white/20">
            <div className="flex gap-2">
                <button 
                    onClick={() => setActiveTab('analyzer')}
                    className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === 'analyzer' ? 'bg-white/40 text-blue-700' : 'text-slate-600 hover:bg-white/20'}`}
                >
                    Анализ страницы
                </button>
                <button 
                    onClick={() => setActiveTab('chat')}
                    className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === 'chat' ? 'bg-white/40 text-blue-700' : 'text-slate-600 hover:bg-white/20'}`}
                >
                    Чат
                </button>
            </div>
        </div>

        <div className="flex-grow overflow-hidden bg-white/10">
            {activeTab === 'chat' && <RecruiterChatWidget vacancies={vacancies} />}
            {activeTab === 'analyzer' && <PageAnalyzer vacancies={vacancies} />}
        </div>
      </div>
       <style>{`
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default ExtensionHost;
