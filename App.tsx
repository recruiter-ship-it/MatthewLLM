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
import { VacanciesContext } from './components/VacanciesContext';
import AIAgentDashboard from './components/AIAgentDashboard';


declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

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
  
  const storage = localStorage;
  
  const getItem = (key: string) => {
    const item = storage.getItem(key);
    return item ? JSON.parse(item) : null;
  };
  
  const setItem = (key: string, value: any) => {
     const stringValue = JSON.stringify(value);
     storage.setItem(key, stringValue);
  };

  const removeItem = (key: string) => {
      storage.removeItem(key);
  };


  // Load theme on startup
  useEffect(() => {
    const loadThemePreference = () => {
      let storedTheme = localStorage.getItem('theme');

      if (storedTheme === 'dark' || storedTheme === 'light') {
        setTheme(storedTheme as 'light' | 'dark');
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
        localStorage.setItem('theme', theme);
    } catch(e) {
        console.error("Could not save theme", e)
    }
  }, [theme]);


  useEffect(() => {
    // Set the PDF.js worker source
    const PDF_WORKER_URL = "https://esm.sh/pdfjs-dist@^4.4.168/build/pdf.worker.mjs";
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

    const loadData = () => {
      let savedUser: CompanyProfile | null = getItem('user');
      let savedVacancies: Vacancy[] = getItem('vacancies') || [];
      let savedRegisteredUsers: StoredUser[] = getItem('registeredUsers') || [];
      let savedActiveRecruiterId: string | null = localStorage.getItem('activeRecruiterId') || null;
      let savedActiveVacancyByRecruiter: { [key: string]: string | null } = getItem('activeVacancyByRecruiter') || {};
      const savedUserWidgets = getItem('userWidgets') || {};
      const savedVoiceEnabled = getItem('isAssistantVoiceEnabled');


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
        localStorage.setItem('activeRecruiterId', activeRecruiterId);
    } else {
        localStorage.removeItem('activeRecruiterId');
    }
    setItem('activeVacancyByRecruiter', activeVacancyByRecruiter);
    setItem('userWidgets', userWidgets);
    setItem('isAssistantVoiceEnabled', isAssistantVoiceEnabled);
  }, [vacancies, registeredUsers, activeRecruiterId, activeVacancyByRecruiter, isLoadingStorage, userWidgets, isAssistantVoiceEnabled]);

  // Hotkeys for chat widget
  useEffect(() => {
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
        avatar: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2NDc0OGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNi41MiAxOWMuNjQtMi4yIDEuODQtNCAzLjIyLTUuMjZD MTAuMDcgMTIuNDkgMTEuMDEgMTIgMTIgMTJzMS45My40OSAzLjI2IDEuNzRjMS4zOCAxLjI2IDIuNTggMy4wNiAzLjIyIDUuMjYiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTAiIHI9IjMiLz48L3N2Zz4=', // Default avatar
        recruiters: []
      };
      setRegisteredUsers(prev => [...prev, newUser]);
      setCompanyProfile(newUser);
      setActiveRecruiterId(newUser.id);
      setIsAuthenticated(true);
      persistUser(newUser);
      resolve();
    });
  }, [registeredUsers]);
  
  const handleLogin = useCallback(async (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const user = registeredUsers.find(u => u.email === email && u.password === password);
      if (user) {
        setCompanyProfile(user);
        setActiveRecruiterId(user.id);
        setIsAuthenticated(true);
        persistUser(user);
        resolve();
      } else {
        reject(new Error('Неверный email или пароль.'));
      }
    });
  }, [registeredUsers]);
  
  const handleGuestLogin = useCallback(() => {
    const guestUser: CompanyProfile = {
      id: 'guest',
      name: 'Гость',
      avatar: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2NDc0OGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNi41MiAxOWMuNjQtMi4yIDEuODQtNCAzLjIyLTUuMjZD MTAuMDcgMTIuNDkgMTEuMDEgMTIgMTIgMTJzMS45My40OSAzLjI2IDEuNzRjMS4zOCAxLjI2IDIuNTggMy4wNiAzLjIyIDUuMjYiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTAiIHI9IjMiLz48L3N2Zz4=',
      recruiters: [],
    };
    setCompanyProfile(guestUser);
    setActiveRecruiterId(guestUser.id);
    setIsAuthenticated(true);
    persistUser(guestUser);
  }, []);
  
  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setCompanyProfile(null);
    setActiveRecruiterId(null);
    persistUser(null);
  }, []);

  const handleUpdateCompanyProfile = useCallback((updatedProfile: Partial<CompanyProfile>) => {
    setCompanyProfile(prev => {
        if (!prev) return null;
        const newProfile = { ...prev, ...updatedProfile };
        persistUser(newProfile);
        
        // Also update in registered users list if it's not a guest
        if(newProfile.email) {
            setRegisteredUsers(users => users.map(u => u.id === newProfile.id ? { ...u, ...newProfile } : u));
        }
        
        return newProfile;
    });
  }, []);
  
  const handleUpdateRecruiters = useCallback((updatedRecruiters: Recruiter[]) => {
      setCompanyProfile(prev => {
          if (!prev) return null;
          const newProfile = {...prev, recruiters: updatedRecruiters};
          persistUser(newProfile);
          if (newProfile.email) {
              setRegisteredUsers(users => users.map(u => u.id === newProfile.id ? { ...u, recruiters: updatedRecruiters } : u));
          }
          return newProfile;
      });
  }, []);

  const handleSetActiveRecruiter = useCallback((recruiterId: string | null) => {
    if (recruiterId && companyProfile) {
        const isValidId = recruiterId === companyProfile.id || companyProfile.recruiters.some(r => r.id === recruiterId);
        if (isValidId) {
            setActiveRecruiterId(recruiterId);
        }
    }
  }, [companyProfile]);

  const handleSaveVacancy = useCallback((vacancyData: Omit<Vacancy, 'id'> & { id?: string }) => {
    dispatchVacancies({ type: 'ADD_OR_UPDATE', payload: vacancyData });
    setIsVacancyModalOpen(false);
    setEditingVacancy(null);
  }, []);
  
  const openVacancyModal = useCallback((vacancy: Vacancy | null) => {
    setEditingVacancy(vacancy);
    setIsVacancyModalOpen(true);
  }, []);
  
  const viewVacancyDetails = useCallback((vacancy: Vacancy) => {
    setViewingVacancy(vacancy);
  }, []);
  
  const handleUpdateVacancyDetails = useCallback((updateFn: (prev: Vacancy) => Vacancy) => {
      if (viewingVacancy?.id) {
          dispatchVacancies({ type: 'UPDATE_DETAILS', payload: updateFn, meta: { id: viewingVacancy.id } });
          // Also update the state for the detail view immediately
          setViewingVacancy(prev => prev ? updateFn(prev) : null);
      }
  }, [viewingVacancy?.id]);
  
  const handleSelectActiveVacancy = useCallback((vacancyId: string | null) => {
    if (activeRecruiterId) {
        setActiveVacancyByRecruiter(prev => ({ ...prev, [activeRecruiterId]: vacancyId }));
    }
  }, [activeRecruiterId]);
  
  const handleToggleWakeWord = () => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      setIsWakeWordEnabled(prev => !prev);
    } else {
      alert("Голосовая активация не поддерживается в вашем браузере.");
    }
  };

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  const handleSaveUserWidgets = useCallback((widgets: { [recruiterId: string]: WidgetLink[] }) => {
    setUserWidgets(widgets);
  }, []);

  const handleToggleAssistantVoice = () => {
    setIsAssistantVoiceEnabled(prev => !prev);
  };
  
  const activeRecruiter = companyProfile?.id === activeRecruiterId
    ? companyProfile
    : companyProfile?.recruiters.find(r => r.id === activeRecruiterId) || companyProfile;

  const activeVacancy = activeRecruiterId && activeVacancyByRecruiter[activeRecruiterId]
    ? vacancies.find(v => v.id === activeVacancyByRecruiter[activeRecruiterId]) || null
    : null;
    
  // --- RENDER LOGIC ---

  if (isLoadingStorage) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated || !companyProfile || !activeRecruiter) {
    return (
      <Login
        onRegister={handleRegister}
        onLocalLogin={handleLogin}
        onGuestLogin={handleGuestLogin}
      />
    );
  }

  const tabs = [
    Tab.Home,
    Tab.Vacancies,
    Tab.Resumes,
    Tab.Interviews,
    Tab.AISourcer,
    Tab.AIAgent,
  ];
  
  const renderContent = () => {
    switch (activeTab) {
      case Tab.Home:
        return <HomeDashboard 
          vacancies={vacancies}
          userWidgets={userWidgets}
          onSaveUserWidgets={handleSaveUserWidgets}
          activeRecruiterId={activeRecruiterId}
        />;
      case Tab.Vacancies:
        return <VacanciesDashboard recruiters={companyProfile.recruiters} />;
      case Tab.Resumes:
        return <ResumeAnalyzer activeVacancy={activeVacancy} />;
      case Tab.Interviews:
        return <InterviewAnalyzer activeVacancy={activeVacancy} />;
      case Tab.AISourcer:
        return <MSourcer vacancies={vacancies} activeVacancy={activeVacancy} />;
      case Tab.AIAgent:
         return <AIAgentDashboard vacancies={vacancies} />;
      default:
        return <HomeDashboard 
          vacancies={vacancies}
          userWidgets={userWidgets}
          onSaveUserWidgets={handleSaveUserWidgets}
          activeRecruiterId={activeRecruiterId}
        />;
    }
  };

  return (
    <VacanciesContext.Provider value={{ vacancies, dispatch: dispatchVacancies, viewVacancy: viewVacancyDetails, openVacancyModal }}>
      <div className="flex h-screen text-slate-800 dark:text-slate-200">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
        
        <main className="flex-1 flex flex-col overflow-hidden pl-20 transition-all duration-300 ease-in-out">
          <Header
            user={activeRecruiter}
            onLogout={handleLogout}
            onProfileClick={() => setIsProfileModalOpen(true)}
            vacancies={vacancies}
            activeVacancy={activeVacancy}
            onSelectVacancy={handleSelectActiveVacancy}
            isWakeWordEnabled={isWakeWordEnabled}
            onToggleWakeWord={handleToggleWakeWord}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            isAssistantVoiceEnabled={isAssistantVoiceEnabled}
            onToggleAssistantVoice={handleToggleAssistantVoice}
          />
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {renderContent()}
          </div>
        </main>
        
        {isProfileModalOpen && (
            <ProfileModal
                companyProfile={companyProfile}
                activeRecruiterId={activeRecruiterId}
                onClose={() => setIsProfileModalOpen(false)}
                onUpdateCompanyProfile={handleUpdateCompanyProfile}
                onUpdateRecruiters={handleUpdateRecruiters}
                onSetActiveRecruiter={handleSetActiveRecruiter}
            />
        )}
        
        <VacancyModal
            isOpen={isVacancyModalOpen}
            onClose={() => { setIsVacancyModalOpen(false); setEditingVacancy(null); }}
            onSave={handleSaveVacancy}
            vacancy={editingVacancy}
            recruiters={companyProfile.recruiters}
        />

        {viewingVacancy && (
            <VacancyDetailView 
                vacancy={viewingVacancy}
                onClose={() => setViewingVacancy(null)}
                onUpdate={handleUpdateVacancyDetails}
            />
        )}
        
        {/* Floating Chat Widget */}
        <button
          onClick={() => setIsChatWidgetOpen(prev => !prev)}
          className="fixed bottom-8 right-8 z-40 w-16 h-16 rounded-full aurora-button-primary shadow-lg flex items-center justify-center transition-transform transform hover:scale-110"
          aria-label="Открыть AI-ассистента"
          style={{ transform: isChatWidgetOpen ? 'scale(0)' : 'scale(1)', transition: 'transform 0.3s ease' }}
        >
          <MatthewLogoIcon className="w-8 h-8 text-white"/>
        </button>

        <div className={`fixed bottom-8 right-8 z-50 transition-all duration-500 ease-in-out ${isChatWidgetOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-16 pointer-events-none'}`}>
          <div className="w-[450px] h-[70vh] max-h-[700px] aurora-panel rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="p-3 border-b border-white/20 dark:border-slate-700/50 flex justify-between items-center flex-shrink-0">
                  <h3 className="font-bold">Мэтью Ассистент</h3>
                  <button onClick={() => setIsChatWidgetOpen(false)} className="p-1 rounded-full hover:bg-slate-500/10">
                      <X className="w-5 h-5"/>
                  </button>
              </div>
            <RecruiterChatWidget 
              ref={chatWidgetRef}
              vacancies={vacancies}
              activeRecruiter={activeRecruiter}
              activeVacancy={activeVacancy}
              isVoiceEnabled={isAssistantVoiceEnabled}
            />
          </div>
        </div>
        
      </div>
    </VacanciesContext.Provider>
  );
};

export default App;
