
import React, { useState, useCallback, useEffect, useRef, useReducer } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Tab, CompanyProfile, Vacancy, Priority, Recruiter, VacancyStage, WidgetLink } from './types';
import Header from './components/Header';
import Login from './components/Login';
import ProfileModal from './components/ProfileModal';
import ResumeAnalyzer from './components/ResumeAnalyzer';
import VacanciesDashboard from './components/VacanciesDashboard';
import VacancyModal from './components/VacancyModal';
import VacancyDetailView from './components/VacancyDetailView';
import InterviewAnalyzer from './components/InterviewAnalyzer';
import MSourcer from './components/MSourcer';
import RecruiterChatWidget, { ChatWidgetHandle } from './components/RecruiterChatWidget';
import { X, MatthewLogoIcon } from './components/icons/Icons';
import Sidebar from './components/Sidebar';
import HomeDashboard from './components/HomeDashboard';
import AIAgentDashboard from './components/AIAgentDashboard';
import { VacanciesContext } from './components/VacanciesContext';
import ExtensionHost from './components/ExtensionHost';


declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
    const chrome: any;
}

const IS_EXTENSION = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

type StoredUser = CompanyProfile & { password?: string };

// --- Reducer for Vacancies State Management ---

type VacancyAction =
  | { type: 'SET_ALL', payload: Vacancy[] }
  | { type: 'ADD_OR_UPDATE', payload: Omit<Vacancy, 'id'> & { id?: string } }
  | { type: 'DELETE', payload: { id: string } }
  | { type: 'CHANGE_PRIORITY', payload: { id: string, newPriority: Priority } }
  | { type: 'CHANGE_STAGE', payload: { id: string, newStage: VacancyStage } }
  | { type: 'ASSIGN_RECRUITER', payload: { vacancyId: string, recruiterId: string | null } }
  | { type: 'UPDATE_DETAILS', payload: Vacancy | ((prev: Vacancy) => Vacancy), meta: { id: string } };

const vacanciesReducer = (state: Vacancy[], action: VacancyAction): Vacancy[] => {
  switch (action.type) {
    case 'SET_ALL':
      return action.payload;

    case 'ADD_OR_UPDATE': {
      const vacancyData = action.payload;
      const existingIndex = vacancyData.id ? state.findIndex(v => v.id === vacancyData.id) : -1;
      
      if (existingIndex > -1) {
        // Update existing
        const newState = [...state];
        newState[existingIndex] = { ...state[existingIndex], ...vacancyData };
        return newState;
      } else {
        // Add new
        const newVacancy: Vacancy = {
            id: Date.now().toString(),
            ...vacancyData,
            resumes: [], // Ensure new vacancies have default empty arrays
        };
        return [...state, newVacancy];
      }
    }
      
    case 'DELETE':
      return state.filter(v => v.id !== action.payload.id);

    case 'CHANGE_PRIORITY':
      return state.map(v => v.id === action.payload.id ? { ...v, priority: action.payload.newPriority } : v);

    case 'CHANGE_STAGE':
        return state.map(v => v.id === action.payload.id ? { ...v, stage: action.payload.newStage } : v);
      
    case 'ASSIGN_RECRUITER':
      return state.map(v => v.id === action.payload.vacancyId ? { ...v, recruiterId: action.payload.recruiterId ?? undefined } : v);

    case 'UPDATE_DETAILS': {
        const index = state.findIndex(v => v.id === action.meta.id);
        if (index === -1) return state;
        
        const newState = [...state];
        const currentVacancy = state[index];
        const updatedVacancy = typeof action.payload === 'function' 
            ? action.payload(currentVacancy) 
            : action.payload;
            
        newState[index] = updatedVacancy;
        return newState;
    }
      
    default:
      return state;
  }
};


const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [activeRecruiterId, setActiveRecruiterId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Home);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  
  // Use reducer for all vacancy state logic
  const [vacancies, dispatchVacancies] = useReducer(vacanciesReducer, []);
  
  const [registeredUsers, setRegisteredUsers] = useState<StoredUser[]>([]);
  const [isVacancyModalOpen, setIsVacancyModalOpen] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null);
  const [viewingVacancy, setViewingVacancy] = useState<Vacancy | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState<boolean>(true);
  const [isChatWidgetOpen, setIsChatWidgetOpen] = useState<boolean>(false);
  const [activeVacancyByRecruiter, setActiveVacancyByRecruiter] = useState<{ [key: string]: string | null }>({});
  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isAssistantVoiceEnabled, setIsAssistantVoiceEnabled] = useState(true);

  // --- NEW: Personalized Widgets State ---
  const [userWidgets, setUserWidgets] = useState<{ [recruiterId: string]: WidgetLink[] }>({});
  
  const chatWidgetRef = useRef<ChatWidgetHandle>(null);
  const wakeWordRecognizerRef = useRef<any>(null);
  
  const storage = IS_EXTENSION ? chrome.storage.local : localStorage;
  
  const getItem = async (key: string) => {
    if (IS_EXTENSION) {
        const result = await storage.get(key);
        return result[key] ? JSON.parse(result[key]) : null;
    }
    const item = storage.getItem(key);
    return item ? JSON.parse(item) : null;
  };
  
  const setItem = async (key: string, value: any) => {
     const stringValue = JSON.stringify(value);
     if (IS_EXTENSION) {
        await storage.set({ [key]: stringValue });
     } else {
        storage.setItem(key, stringValue);
     }
  };

  const removeItem = async (key: string) => {
      if (IS_EXTENSION) {
          await storage.remove(key);
      } else {
          storage.removeItem(key);
      }
  };


  // Load theme on startup
  useEffect(() => {
    const loadThemePreference = async () => {
      let storedTheme = IS_EXTENSION ? (await storage.get('theme')).theme : localStorage.getItem('theme');

      if (storedTheme === 'dark' || storedTheme === 'light') {
        setTheme(storedTheme);
      } else {
        setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      }
    };
    loadThemePreference();
  }, []);

  // Apply and save theme when state changes
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    try {
        if (IS_EXTENSION) {
            storage.set({ theme });
        } else {
            localStorage.setItem('theme', theme);
        }
    } catch(e) {
        console.error("Could not save theme", e)
    }
  }, [theme]);


  useEffect(() => {
    // Set the PDF.js worker source
    const PDF_WORKER_URL = "https://esm.sh/pdfjs-dist@^4.4.168/build/pdf.worker.mjs";
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

    const loadData = async () => {
      let savedUser: CompanyProfile | null = await getItem('user');
      let savedVacancies: Vacancy[] = await getItem('vacancies') || [];
      let savedRegisteredUsers: StoredUser[] = await getItem('registeredUsers') || [];
      let savedActiveRecruiterId: string | null = (IS_EXTENSION ? (await storage.get('activeRecruiterId')).activeRecruiterId : localStorage.getItem('activeRecruiterId')) || null;
      let savedActiveVacancyByRecruiter: { [key: string]: string | null } = await getItem('activeVacancyByRecruiter') || {};
      const savedUserWidgets = await getItem('userWidgets') || {};
      const savedVoiceEnabled = await getItem('isAssistantVoiceEnabled');


      if (savedUser) {
        savedUser.recruiters = savedUser.recruiters || [];
        setCompanyProfile(savedUser);
        setIsAuthenticated(true);
        setActiveRecruiterId(savedActiveRecruiterId || savedUser.id);
      }
      
      const migratedVacancies = savedVacancies.map(v => ({ ...v, stage: v.stage || VacancyStage.Sourcing }));
      dispatchVacancies({ type: 'SET_ALL', payload: migratedVacancies });
      setRegisteredUsers(savedRegisteredUsers);
      setActiveVacancyByRecruiter(savedActiveVacancyByRecruiter);
      
      setUserWidgets(savedUserWidgets);

      if (savedVoiceEnabled !== null) {
        setIsAssistantVoiceEnabled(savedVoiceEnabled);
      }
      setIsLoadingStorage(false);
    };
    loadData();
  }, []);
  
  // Wake Word Listener Effect
  useEffect(() => {
    if (IS_EXTENSION) return; // Disable wake word in extension

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if(isWakeWordEnabled) alert("Голосовая активация не поддерживается в вашем браузере.");
      return;
    }

    if (isWakeWordEnabled && !wakeWordRecognizerRef.current) {
        const recognizer = new SpeechRecognition();
        recognizer.lang = 'ru-RU';
        recognizer.continuous = true;
        recognizer.interimResults = false;

        recognizer.onresult = (event: any) => {
            const lastTranscript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
            if (lastTranscript.includes('мэтью') || lastTranscript.includes('matthew')) {
                console.log('Wake word "Matthew" detected!');
                setIsChatWidgetOpen(true);
                setTimeout(() => chatWidgetRef.current?.triggerVoiceInput(), 300);
                setIsWakeWordEnabled(false);
            }
        };

        recognizer.onend = () => {
            if (wakeWordRecognizerRef.current) {
                setTimeout(() => { try { wakeWordRecognizerRef.current?.start(); } catch (e) { console.log("Recognizer stopped.", e); } }, 250);
            }
        };
        
        recognizer.onerror = (event: any) => {
            console.error("Wake word recognizer error:", event.error);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setIsWakeWordEnabled(false);
                alert("Доступ к микрофону не предоставлен. Голосовая активация отключена.");
            }
        };
        
        wakeWordRecognizerRef.current = recognizer;
        try { recognizer.start(); } catch (e) {
            console.error("Could not start wake word recognizer:", e);
            setIsWakeWordEnabled(false);
        }
    } else if (!isWakeWordEnabled && wakeWordRecognizerRef.current) {
        wakeWordRecognizerRef.current.stop();
        wakeWordRecognizerRef.current = null;
    }

    return () => {
        if (wakeWordRecognizerRef.current) {
            wakeWordRecognizerRef.current.stop();
            wakeWordRecognizerRef.current = null;
        }
    };
  }, [isWakeWordEnabled]);


  useEffect(() => {
    if (isLoadingStorage) return;
    
    setItem('vacancies', vacancies);
    setItem('registeredUsers', registeredUsers);
    if (activeRecruiterId) {
        if (IS_EXTENSION) storage.set({ activeRecruiterId }); else localStorage.setItem('activeRecruiterId', activeRecruiterId);
    } else {
        if (IS_EXTENSION) storage.remove('activeRecruiterId'); else localStorage.removeItem('activeRecruiterId');
    }
    setItem('activeVacancyByRecruiter', activeVacancyByRecruiter);
    setItem('userWidgets', userWidgets);
    setItem('isAssistantVoiceEnabled', isAssistantVoiceEnabled);
  }, [vacancies, registeredUsers, activeRecruiterId, activeVacancyByRecruiter, isLoadingStorage, userWidgets, isAssistantVoiceEnabled]);

  // Hotkeys for chat widget
  useEffect(() => {
    if (IS_EXTENSION) return; // Disable hotkeys in extension context

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsChatWidgetOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isChatWidgetOpen) {
        e.preventDefault();
        setIsChatWidgetOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChatWidgetOpen]);

  const persistUser = (profile: CompanyProfile | null) => {
    if (profile && profile.email) {
       setItem('user', profile);
    } else {
       removeItem('user');
    }
  };
  
  const handleRegister = useCallback(async (name: string, email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (registeredUsers.find(u => u.email === email)) {
        reject(new Error('Пользователь с таким email уже существует.'));
        return;
      }
      const newUser: StoredUser = {
        id: new Date().getTime().toString(), name, email, password,
        avatar: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2NDc0OGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNi41MiAxOWMuNjQtMi4yIDEuODQtNCAzLjIyLTUuMjZD MTAuMDcgMTIuNDkgMTEuMDEgMTIgMTIgMTJzMS45My40OSAzLjI2IDEuNzRjMS4zOCAxLjI2IDIuNTggMy4wNiAzLjIyIDUuMjYiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTAiIHI9IjMiLz48L3N2Zz4=',
        recruiters: [],
      };
      
      const { password: _, ...userForState } = newUser;

      setRegisteredUsers(prev => [...prev, newUser]);
      setCompanyProfile(userForState);
      setActiveRecruiterId(userForState.id);
      setIsAuthenticated(true);
      persistUser(userForState);
      resolve();
    });
  }, [registeredUsers]);
  
  const handleLocalLogin = useCallback(async (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const foundUser = registeredUsers.find(u => u.email === email);
      if (!foundUser) {
        reject(new Error('Пользователь не найден.')); return;
      }
      if (foundUser.password !== password) {
        reject(new Error('Неверный пароль.')); return;
      }

      const { password: _, ...userForState } = foundUser;
      userForState.recruiters = userForState.recruiters || [];
      setCompanyProfile(userForState);
      setActiveRecruiterId(userForState.id);
      setIsAuthenticated(true);
      persistUser(userForState);
      resolve();
    });
  }, [registeredUsers]);

  const handleGuestLogin = useCallback(() => {
    const guestUser: CompanyProfile = {
        id: new Date().getTime().toString(), name: 'Гость',
        avatar: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2NDc0OGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNi41MiAxOWMuNjQtMi4yIDEuODQtNCAzLjIyLTUuMjZD MTAuMDcgMTIuNDkgMTEuMDEgMTIgMTIgMTJzMS45My40OSAzLjI2IDEuNzRjMS4zOCAxLjI2IDIuNTggMy4wNiAzLjIyIDUuMjYiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTAiIHI9IjMiLz48L3N2Zz4=',
        recruiters: [],
    };
    setCompanyProfile(guestUser);
    setActiveRecruiterId(guestUser.id);
    setIsAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    persistUser(null);
    setIsAuthenticated(false);
    setCompanyProfile(null);
    setActiveRecruiterId(null);
    setActiveVacancyByRecruiter({});
    removeItem('activeRecruiterId');
    removeItem('activeVacancyByRecruiter');
  }, []);

  const handleUpdateCompanyProfile = (updatedUserInfo: Partial<CompanyProfile>) => {
    if (companyProfile) {
        const updatedProfile = { ...companyProfile, ...updatedUserInfo };
        setCompanyProfile(updatedProfile);
        if (updatedProfile.email) {
            setRegisteredUsers(prevUsers => prevUsers.map(regUser => regUser.email === updatedProfile.email ? { ...regUser, ...updatedUserInfo } : regUser));
        }
        persistUser(updatedProfile);
    }
  };
  
  const handleUpdateRecruiters = (updatedRecruiters: Recruiter[]) => {
    if (companyProfile) {
        handleUpdateCompanyProfile({ ...companyProfile, recruiters: updatedRecruiters });
    }
  };

  const handleOpenVacancyModal = useCallback((vacancy: Vacancy | null = null) => {
    setEditingVacancy(vacancy);
    setIsVacancyModalOpen(true);
  }, []);

  const handleCloseVacancyModal = useCallback(() => {
    setEditingVacancy(null);
    setIsVacancyModalOpen(false);
  }, []);
  
  const handleViewVacancy = useCallback((vacancy: Vacancy) => {
    setViewingVacancy(vacancy);
  }, []);

  const handleSaveVacancy = useCallback((vacancyData: Omit<Vacancy, 'id'> & { id?: string }) => {
    dispatchVacancies({ type: 'ADD_OR_UPDATE', payload: vacancyData });
    handleCloseVacancyModal();
  }, [handleCloseVacancyModal]);
  
  const handleUpdateVacancy = useCallback((update: Vacancy | ((prev: Vacancy) => Vacancy)) => {
    setViewingVacancy(prevViewing => {
        if (!prevViewing) return null;
        dispatchVacancies({ type: 'UPDATE_DETAILS', payload: update, meta: { id: prevViewing.id } });
        const updated = typeof update === 'function' ? update(prevViewing) : update;
        return updated;
    });
  }, []);

  useEffect(() => {
    if (viewingVacancy) {
        const freshVacancy = vacancies.find(v => v.id === viewingVacancy.id);
        if (freshVacancy) {
            setViewingVacancy(freshVacancy);
        } else {
            setViewingVacancy(null);
        }
    }
  }, [vacancies, viewingVacancy]);

  const handleSelectVacancyForRecruiter = (vacancyId: string | null) => {
    if (activeRecruiterId) {
        setActiveVacancyByRecruiter(prev => ({ ...prev, [activeRecruiterId]: vacancyId }));
    }
  };

  // --- User Widgets Handlers ---
  const handleSaveUserWidgets = useCallback((widgets: { [recruiterId: string]: WidgetLink[] }) => {
    setUserWidgets(widgets);
  }, []);

  const handleToggleChatWidget = () => {
    if (isChatWidgetOpen && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    setIsChatWidgetOpen(prev => !prev);
  };
  const handleToggleWakeWord = () => { setIsWakeWordEnabled(prev => !prev); };
  const handleToggleTheme = () => { setTheme(prev => (prev === 'light' ? 'dark' : 'light')); };
  const handleToggleAssistantVoice = () => {
    if (isAssistantVoiceEnabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    setIsAssistantVoiceEnabled(prev => !prev);
  };

  const tabs = [Tab.Home, Tab.Vacancies, Tab.Resumes, Tab.Interviews, Tab.AISourcer, Tab.AIAgent];
  
  const recruiters = companyProfile?.recruiters || [];
  const allUsers = companyProfile ? [ {id: companyProfile.id, name: companyProfile.name, avatar: companyProfile.avatar}, ...recruiters] : [];
  const activeRecruiter = allUsers.find(u => u.id === activeRecruiterId) || companyProfile;
  const activeVacancyIdForRecruiter = activeRecruiterId ? activeVacancyByRecruiter[activeRecruiterId] : null;
  const activeVacancy = vacancies.find(v => v.id === activeVacancyIdForRecruiter) || null;

  if (IS_EXTENSION) {
      return (
          <ExtensionHost
            vacancies={vacancies}
            activeRecruiter={activeRecruiter}
            activeVacancy={activeVacancy}
            companyProfile={companyProfile}
            onSelectVacancy={handleSelectVacancyForRecruiter}
            onUpdateVacancy={handleUpdateVacancy}
            dispatchVacancies={dispatchVacancies}
          />
      );
  }

  const renderContent = () => {
    switch (activeTab) {
      case Tab.Home: return <HomeDashboard vacancies={vacancies} userWidgets={userWidgets} onSaveUserWidgets={handleSaveUserWidgets} activeRecruiterId={activeRecruiterId} />;
      case Tab.Resumes: return <ResumeAnalyzer activeVacancy={activeVacancy} />;
      case Tab.Vacancies: return <VacanciesDashboard recruiters={recruiters} />;
      case Tab.Interviews: return <InterviewAnalyzer activeVacancy={activeVacancy} />;
      case Tab.AISourcer: return <MSourcer vacancies={vacancies} activeVacancy={activeVacancy} />;
      case Tab.AIAgent: return <AIAgentDashboard vacancies={vacancies} />;
      default: return null;
    }
  };
  
  if (isLoadingStorage) {
    const sizeClass = 'h-screen w-screen';
    return <div className={`flex items-center justify-center ${sizeClass}`}><div className="w-8 h-8 border-4 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!isAuthenticated) {
    return <Login onRegister={handleRegister} onLocalLogin={handleLocalLogin} onGuestLogin={handleGuestLogin} />;
  }
  
  const contextValue = { vacancies, dispatch: dispatchVacancies, viewVacancy: handleViewVacancy, openVacancyModal: handleOpenVacancyModal };

  return (
    <div className="text-gray-800 dark:text-gray-200 min-h-screen flex">
      <style>{`.animate-fade-in { animation: fade-in 0.3s ease-out forwards; } .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; } .animate-pulse-slow { animation: pulse-slow 2s infinite; } @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } } @keyframes fade-in-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } @keyframes pulse-slow { 50% { transform: scale(1.05); } }`}</style>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
      <div className="flex-1 flex flex-col pl-20 transition-all duration-300 ease-in-out">
        {companyProfile && activeRecruiter && (
            <Header user={activeRecruiter} onLogout={handleLogout} onProfileClick={() => setIsProfileModalOpen(true)} vacancies={vacancies} activeVacancy={activeVacancy} onSelectVacancy={handleSelectVacancyForRecruiter} isWakeWordEnabled={isWakeWordEnabled} onToggleWakeWord={handleToggleWakeWord} theme={theme} onToggleTheme={handleToggleTheme} isAssistantVoiceEnabled={isAssistantVoiceEnabled} onToggleAssistantVoice={handleToggleAssistantVoice} />
        )}
        <div className="flex-1 w-full max-w-full mx-auto px-2 sm:px-6 lg:px-8 py-6 sm:py-8 min-h-0">
            <main className="w-full h-full"><div className="aurora-panel rounded-2xl shadow-lg w-full h-full flex flex-col min-h-[600px]"><VacanciesContext.Provider value={contextValue}><div key={activeTab} className="animate-fade-in-up w-full h-full">{renderContent()}</div></VacanciesContext.Provider></div></main>
        </div>
      </div>
      <aside className={`fixed top-5 bottom-5 right-5 transition-transform duration-300 ease-in-out transform ${isChatWidgetOpen ? 'translate-x-0' : 'translate-x-[calc(100%+1.25rem)]'} w-[calc(100%-2.5rem)] max-w-[400px] z-30`}>
          <div className="aurora-panel rounded-2xl shadow-lg w-full h-full flex flex-col overflow-hidden">
          {isChatWidgetOpen && (<>
              <header className="flex items-center justify-between p-4 border-b border-white/30 dark:border-slate-700/30 flex-shrink-0">
                  <div className="flex items-center gap-2"><MatthewLogoIcon className="w-6 h-6 text-slate-800 dark:text-slate-200" /><h3 className="font-bold text-slate-800 dark:text-slate-200">Мэтью Ассистент</h3></div>
                  <button onClick={handleToggleChatWidget} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"><X className="w-6 h-6" /></button>
              </header>
              <div className="flex-grow min-h-0 bg-transparent animate-fade-in"><RecruiterChatWidget ref={chatWidgetRef} vacancies={vacancies} activeRecruiter={activeRecruiter} activeVacancy={activeVacancy} isVoiceEnabled={isAssistantVoiceEnabled} /></div>
          </>)}
          </div>
      </aside>
      {isProfileModalOpen && companyProfile && ( <ProfileModal companyProfile={companyProfile} activeRecruiterId={activeRecruiterId} onClose={() => setIsProfileModalOpen(false)} onUpdateCompanyProfile={handleUpdateCompanyProfile} onUpdateRecruiters={handleUpdateRecruiters} onSetActiveRecruiter={setActiveRecruiterId} /> )}
      {isVacancyModalOpen && ( <VacancyModal isOpen={isVacancyModalOpen} onClose={handleCloseVacancyModal} onSave={handleSaveVacancy} vacancy={editingVacancy} recruiters={recruiters} /> )}
      {viewingVacancy && ( <VacancyDetailView vacancy={viewingVacancy} onClose={() => setViewingVacancy(null)} onUpdate={handleUpdateVacancy} /> )}
      <div className={`fixed bottom-5 right-5 z-40 transition-transform duration-300 ease-in-out ${isChatWidgetOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}>
          <button onClick={handleToggleChatWidget} className="aurora-button-primary w-14 h-14 sm:w-16 sm:h-16 text-white rounded-full flex items-center justify-center shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 animate-pulse-slow" aria-label="Открыть чат с ассистентом (Ctrl+K)"><MatthewLogoIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white" /></button>
      </div>
    </div>
  );
};

export default App;