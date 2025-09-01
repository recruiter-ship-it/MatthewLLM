
import React, { useState, useCallback, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Tab, User, Vacancy, Priority, Task, KanbanColumn, KanbanSwimlane } from './types';
import Header from './components/Header';
import Login from './components/Login';
import ProfileModal from './components/ProfileModal';
import ResumeAnalyzer from './components/ResumeAnalyzer';
import VacanciesDashboard from './components/VacanciesDashboard';
import VacancyModal from './components/VacancyModal';
import VacancyDetailView from './components/VacancyDetailView';
import InterviewAnalyzer from './components/InterviewAnalyzer';
import MSourcer from './components/MSourcer';
import RecruiterChatWidget from './components/RecruiterChatWidget';
import TasksDashboard from './components/TasksDashboard';
import TaskModal from './components/TaskModal';
import { ChatBubble, X, BotMessageSquare } from './components/icons/Icons';

declare global {
    interface Window {
        chrome?: any;
    }
}

const IS_EXTENSION = window.chrome && window.chrome.runtime && window.chrome.runtime.id;

type StoredUser = User & { password?: string };

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Vacancies);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [kanbanSwimlanes, setKanbanSwimlanes] = useState<KanbanSwimlane[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<StoredUser[]>([]);
  const [isVacancyModalOpen, setIsVacancyModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingVacancy, setEditingVacancy] = useState<Vacancy | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addingTaskLocation, setAddingTaskLocation] = useState<{columnId: string, swimlaneId: string} | null>(null);
  const [viewingVacancy, setViewingVacancy] = useState<Vacancy | null>(null);
  const [isLoadingStorage, setIsLoadingStorage] = useState<boolean>(true);
  const [isChatWidgetOpen, setIsChatWidgetOpen] = useState<boolean>(false);
  const [activeVacancyId, setActiveVacancyId] = useState<string | null>(null);


  useEffect(() => {
    // Set the PDF.js worker source based on the environment
    if (IS_EXTENSION) {
      const workerUrl = window.chrome.runtime.getURL('pdf.worker.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    } else {
      const PDF_WORKER_URL = "https://esm.sh/pdfjs-dist@^4.4.168/build/pdf.worker.mjs";
      pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
    }

    const loadData = async () => {
      let savedUser: User | null = null;
      let savedVacancies: Vacancy[] = [];
      let savedTasks: any[] = []; // Can be old or new format
      let savedRegisteredUsers: StoredUser[] = [];
      let savedActiveVacancyId: string | null = null;
      let savedColumns: KanbanColumn[] = [];
      let savedSwimlanes: KanbanSwimlane[] = [];

      if (IS_EXTENSION) {
        const data = await window.chrome.storage.local.get(['user', 'vacancies', 'tasks', 'registeredUsers', 'activeVacancyId', 'kanbanColumns', 'kanbanSwimlanes']);
        savedUser = data.user || null;
        savedVacancies = data.vacancies || [];
        savedTasks = data.tasks || [];
        savedRegisteredUsers = data.registeredUsers || [];
        savedActiveVacancyId = data.activeVacancyId || null;
        savedColumns = data.kanbanColumns || [];
        savedSwimlanes = data.kanbanSwimlanes || [];
      } else {
        try {
          const userStr = localStorage.getItem('user');
          if (userStr) savedUser = JSON.parse(userStr);
          const vacanciesStr = localStorage.getItem('vacancies');
          if (vacanciesStr) savedVacancies = JSON.parse(vacanciesStr);
          const tasksStr = localStorage.getItem('tasks');
          if (tasksStr) savedTasks = JSON.parse(tasksStr);
          const regUsersStr = localStorage.getItem('registeredUsers');
          if (regUsersStr) savedRegisteredUsers = JSON.parse(regUsersStr);
          savedActiveVacancyId = localStorage.getItem('activeVacancyId');
          const columnsStr = localStorage.getItem('kanbanColumns');
          if (columnsStr) savedColumns = JSON.parse(columnsStr);
          const swimlanesStr = localStorage.getItem('kanbanSwimlanes');
          if (swimlanesStr) savedSwimlanes = JSON.parse(swimlanesStr);
        } catch (error) {
          console.error("Could not parse data from localStorage", error);
        }
      }
      
      if (savedUser) {
        setUser(savedUser);
        setIsAuthenticated(true);
      }
      setVacancies(savedVacancies);
      setRegisteredUsers(savedRegisteredUsers);
      setActiveVacancyId(savedActiveVacancyId);

      // --- Kanban Board Setup & Migration ---
      const defaultColumns = [
        { id: 'col-todo-' + Date.now(), title: 'К выполнению' },
        { id: 'col-inprogress-' + Date.now(), title: 'В работе' },
        { id: 'col-done-' + Date.now(), title: 'Готово' },
      ];
      const defaultSwimlanes = [
        { id: savedUser?.id || 'user-swimlane-' + Date.now(), title: savedUser?.name || 'Мои задачи' },
        { id: 'general-swimlane-' + Date.now(), title: 'Общие задачи' },
      ];
      
      const columnsToSet = savedColumns.length > 0 ? savedColumns : defaultColumns;
      const swimlanesToSet = savedSwimlanes.length > 0 ? savedSwimlanes : defaultSwimlanes;

      setKanbanColumns(columnsToSet);
      setKanbanSwimlanes(swimlanesToSet);

      const needsMigration = savedTasks.length > 0 && savedTasks[0].priority === undefined;

      if (needsMigration) {
        const migratedTasks: Task[] = savedTasks.map((t: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { priority, isCompleted, ...rest } = t;
          return {
            ...rest,
            description: t.description || '',
            columnId: t.isCompleted ? columnsToSet[2].id : columnsToSet[0].id,
            swimlaneId: swimlanesToSet[0].id,
            priority: Priority.Medium, // Add default priority
          };
        });
        setTasks(migratedTasks);
      } else {
        setTasks(savedTasks as Task[]);
      }

      setIsLoadingStorage(false);
    };
    loadData();
  }, []);
  
  useEffect(() => {
    if (isLoadingStorage) return; // Don't save initial empty state
    
    const dataToSave = {
        vacancies,
        tasks,
        registeredUsers,
        activeVacancyId,
        kanbanColumns,
        kanbanSwimlanes,
    };
    
    if (IS_EXTENSION) {
      window.chrome.storage.local.set(dataToSave);
    } else {
      for (const [key, value] of Object.entries(dataToSave)) {
          if (value !== null && value !== undefined) {
             localStorage.setItem(key, JSON.stringify(value));
          } else {
             localStorage.removeItem(key);
          }
      }
    }
  }, [vacancies, tasks, registeredUsers, activeVacancyId, kanbanColumns, kanbanSwimlanes, isLoadingStorage]);

  const persistUser = (appUser: User | null) => {
    if (IS_EXTENSION) {
      if (appUser) {
        window.chrome.storage.local.set({ user: appUser });
      } else {
        window.chrome.storage.local.remove('user');
      }
    } else {
      // Persist only registered users, not guests
      if (appUser && appUser.email) {
         localStorage.setItem('user', JSON.stringify(appUser));
      } else {
         localStorage.removeItem('user');
      }
    }
  };
  
  const handleRegister = useCallback(async (name: string, email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (registeredUsers.find(u => u.email === email)) {
        reject(new Error('Пользователь с таким email уже существует.'));
        return;
      }
      const newUser: StoredUser = {
        id: new Date().getTime().toString(),
        name,
        email,
        password,
        avatar: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2NDc0OGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNi41MiAxOWMuNjQtMi4yIDEuODQtNCAzLjIyLTUuMjZD MTAuMDcgMTIuNDkgMTEuMDEgMTIgMTIgMTJzMS45My40OSAzLjI2IDEuNzRjMS4zOCAxLjI2IDIuNTggMy4wNiAzLjIyIDUuMjYiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTAiIHI9IjMiLz48L3N2Zz4=',
      };
      
      const { password: _, ...userForState } = newUser;

      setRegisteredUsers(prev => [...prev, newUser]);
      setUser(userForState);
      setIsAuthenticated(true);
      persistUser(userForState);
      resolve();
    });
  }, [registeredUsers]);
  
  const handleLocalLogin = useCallback(async (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const foundUser = registeredUsers.find(u => u.email === email);
      if (!foundUser) {
        reject(new Error('Пользователь не найден.'));
        return;
      }
      if (foundUser.password !== password) {
        reject(new Error('Неверный пароль.'));
        return;
      }

      const { password: _, ...userForState } = foundUser;
      setUser(userForState);
      setIsAuthenticated(true);
      persistUser(userForState);
      resolve();
    });
  }, [registeredUsers]);

  const handleGuestLogin = useCallback(() => {
    const guestUser: User = {
        id: new Date().getTime().toString(),
        name: 'Гость',
        avatar: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2NDc0OGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNi41MiAxOWMuNjQtMi4yIDEuODQtNCAzLjIyLTUuMjZD MTAuMDcgMTIuNDkgMTEuMDEgMTIgMTIgMTJzMS45My40OSAzLjI2IDEuNzRjMS4zOCAxLjI2IDIuNTggMy4wNiAzLjIyIDUuMjYiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTAiIHI9IjMiLz48L3N2Zz4=',
    };
    setUser(guestUser);
    setIsAuthenticated(true);
    // Do not save guest session
  }, []);

  const handleLogout = useCallback(() => {
    persistUser(null);
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const handleUpdateUser = (updatedUserInfo: Partial<User>) => {
    if (user) {
        const updatedUserForState = { ...user, ...updatedUserInfo };
        setUser(updatedUserForState);

        // Check if it's a registered user (not a guest) and update the main users list
        if (updatedUserForState.email) {
            setRegisteredUsers(prevUsers => {
                return prevUsers.map(regUser => {
                    if (regUser.email === updatedUserForState.email) {
                        return { ...regUser, ...updatedUserInfo };
                    }
                    return regUser;
                });
            });
        }
        
        persistUser(updatedUserForState);
    }
  };
  
  const handleOpenVacancyModal = (vacancy: Vacancy | null = null) => {
    setEditingVacancy(vacancy);
    setIsVacancyModalOpen(true);
  };

  const handleCloseVacancyModal = () => {
    setEditingVacancy(null);
    setIsVacancyModalOpen(false);
  };
  
  const handleViewVacancy = (vacancy: Vacancy) => {
    setViewingVacancy(vacancy);
  };

  const handleSaveVacancy = (vacancyToSave: Omit<Vacancy, 'id'> & { id?: string }) => {
    if (vacancyToSave.id) {
      // Update existing
      setVacancies(vacancies.map(v => v.id === vacancyToSave.id ? { ...v, ...vacancyToSave } as Vacancy : v));
    } else {
      // Add new
      const newVacancy: Vacancy = { 
          ...vacancyToSave, 
          id: Date.now().toString(), 
          briefText: vacancyToSave.briefText || '', 
          priority: vacancyToSave.priority || Priority.Medium,
          resumes: []
      };
      setVacancies([...vacancies, newVacancy]);
    }
    handleCloseVacancyModal();
  };
  
  const handleDeleteVacancy = (id: string) => {
    if (activeVacancyId === id) {
      setActiveVacancyId(null);
    }
    setVacancies(vacancies.filter(v => v.id !== id));
  };
  
  const handleUpdateVacancy = (updatedVacancy: Vacancy) => {
    setVacancies(vacancies.map(v => v.id === updatedVacancy.id ? updatedVacancy : v));
    // also update the viewingVacancy state to re-render the detail view with new data
    if (viewingVacancy && viewingVacancy.id === updatedVacancy.id) {
        setViewingVacancy(updatedVacancy);
    }
  };

  const handleVacancyPriorityChange = (id: string, newPriority: Priority) => {
    setVacancies(vacancies.map(v => v.id === id ? { ...v, priority: newPriority } : v));
  };

  // --- Task & Kanban Handlers ---
  const handleOpenTaskModal = (task: Task | null = null, location: {columnId: string, swimlaneId: string} | null = null) => {
    setEditingTask(task);
    setAddingTaskLocation(location);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setEditingTask(null);
    setAddingTaskLocation(null);
    setIsTaskModalOpen(false);
  };

  const handleSaveTask = (taskToSave: Omit<Task, 'id' | 'columnId' | 'swimlaneId'> & { id?: string }) => {
    if (taskToSave.id) {
      // Update existing
      setTasks(tasks.map(t => t.id === taskToSave.id ? { ...t, ...taskToSave } as Task : t));
    } else {
      if (!addingTaskLocation) {
        console.error("Cannot add task without a location on the board.");
        handleCloseTaskModal();
        return;
      }
      // Add new
      const newTask: Task = {
        ...taskToSave,
        id: Date.now().toString(),
        columnId: addingTaskLocation.columnId,
        swimlaneId: addingTaskLocation.swimlaneId,
        priority: taskToSave.priority || Priority.Medium
      };
      setTasks([...tasks, newTask]);
    }
    handleCloseTaskModal();
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleMoveTask = (taskId: string, newColumnId: string, newSwimlaneId: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, columnId: newColumnId, swimlaneId: newSwimlaneId } : t));
  };

  const handleUpdateColumnTitle = (id: string, title: string) => {
    setKanbanColumns(kanbanColumns.map(c => c.id === id ? { ...c, title } : c));
  };
  const handleAddColumn = () => {
    setKanbanColumns([...kanbanColumns, { id: `col-${Date.now()}`, title: 'Новая колонка' }]);
  };
  const handleUpdateSwimlaneTitle = (id: string, title: string) => {
    setKanbanSwimlanes(kanbanSwimlanes.map(s => s.id === id ? { ...s, title } : s));
  };
  const handleAddSwimlane = () => {
    setKanbanSwimlanes([...kanbanSwimlanes, { id: `swim-${Date.now()}`, title: 'Новая дорожка' }]);
  };


  const handleToggleChatWidget = () => {
    setIsChatWidgetOpen(prev => !prev);
  };

  const tabs = [Tab.Vacancies, Tab.Tasks, Tab.Resumes, Tab.Interviews, Tab.AISourcer];
  const activeVacancy = vacancies.find(v => v.id === activeVacancyId) || null;

  const renderContent = () => {
    switch (activeTab) {
      case Tab.Resumes:
        return <ResumeAnalyzer activeVacancy={activeVacancy} />;
      case Tab.Vacancies:
        return <VacanciesDashboard 
                  vacancies={vacancies}
                  onAddVacancy={() => handleOpenVacancyModal(null)}
                  onEditVacancy={handleOpenVacancyModal}
                  onDeleteVacancy={handleDeleteVacancy}
                  onViewVacancy={handleViewVacancy}
                  onPriorityChange={handleVacancyPriorityChange}
                />;
      case Tab.Tasks:
        return <TasksDashboard
                  tasks={tasks}
                  columns={kanbanColumns}
                  swimlanes={kanbanSwimlanes}
                  onAddTask={handleOpenTaskModal}
                  onEditTask={(task) => handleOpenTaskModal(task, null)}
                  onDeleteTask={handleDeleteTask}
                  onMoveTask={handleMoveTask}
                  onUpdateColumnTitle={handleUpdateColumnTitle}
                  onAddColumn={handleAddColumn}
                  onUpdateSwimlaneTitle={handleUpdateSwimlaneTitle}
                  onAddSwimlane={handleAddSwimlane}
                />;
      case Tab.Interviews:
         return <InterviewAnalyzer activeVacancy={activeVacancy} />;
      case Tab.AISourcer:
         return <MSourcer vacancies={vacancies} />;
      default:
        return null;
    }
  };
  
  if (isLoadingStorage) {
    const sizeClass = IS_EXTENSION ? 'h-full w-full' : 'h-screen w-screen';
    return (
        <div className={`flex items-center justify-center ${sizeClass}`}>
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onRegister={handleRegister} onLocalLogin={handleLocalLogin} onGuestLogin={handleGuestLogin} />;
  }

  return (
    <div className="text-gray-800 min-h-screen flex flex-col">
      <style>{`
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
        @keyframes pulse-slow {
          50% { transform: scale(1.05); }
        }
        .animate-pulse-slow { animation: pulse-slow 2s infinite; }
      `}</style>
      
      {user && (
          <Header 
            user={user} 
            onLogout={handleLogout} 
            onProfileClick={() => setIsProfileModalOpen(true)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            tabs={tabs}
            vacancies={vacancies}
            activeVacancy={activeVacancy}
            onSelectVacancy={setActiveVacancyId}
          />
        )}

      <div className="flex-1 flex w-full max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-hidden gap-x-6">
          <main className="flex-1 flex flex-col min-w-0">
            <div className={`bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg w-full h-full flex flex-col ${!IS_EXTENSION && 'min-h-[600px]'}`}>
              <div key={activeTab} className="animate-fade-in-up w-full h-full">
                {renderContent()}
              </div>
            </div>
          </main>

          {!IS_EXTENSION && (
            <aside
              className={`transition-all duration-300 ease-in-out flex-shrink-0 ${
                isChatWidgetOpen ? 'w-[400px]' : 'w-0'
              }`}
            >
              <div className="bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg w-full h-full flex flex-col overflow-hidden">
                {isChatWidgetOpen && (
                  <>
                    <header className="flex items-center justify-between p-4 border-b border-white/30 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <BotMessageSquare className="w-6 h-6 text-slate-800" />
                        <h3 className="font-bold text-slate-800">Мэтью Ассистент</h3>
                      </div>
                      <button onClick={handleToggleChatWidget} className="text-slate-600 hover:text-slate-900">
                        <X className="w-6 h-6" />
                      </button>
                    </header>
                    <div className="flex-grow overflow-hidden bg-transparent">
                      <RecruiterChatWidget vacancies={vacancies} />
                    </div>
                  </>
                )}
              </div>
            </aside>
          )}
      </div>
      
      {isProfileModalOpen && user && (
        <ProfileModal
          user={user}
          onClose={() => setIsProfileModalOpen(false)}
          onUpdateUser={handleUpdateUser}
        />
      )}

      {isVacancyModalOpen && (
        <VacancyModal
          isOpen={isVacancyModalOpen}
          onClose={handleCloseVacancyModal}
          onSave={handleSaveVacancy}
          vacancy={editingVacancy}
        />
      )}

      {isTaskModalOpen && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={handleCloseTaskModal}
          onSave={handleSaveTask}
          task={editingTask}
        />
      )}

      {viewingVacancy && (
        <VacancyDetailView
          vacancy={viewingVacancy}
          onClose={() => setViewingVacancy(null)}
          onUpdate={handleUpdateVacancy}
        />
      )}

      {/* CHAT FAB for web-app version */}
      {!IS_EXTENSION && (
        <div className={`fixed bottom-5 right-5 z-40 transition-transform duration-300 ease-in-out ${isChatWidgetOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}>
            <button
              onClick={handleToggleChatWidget}
              className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 animate-pulse-slow"
              aria-label="Открыть чат с ассистентом"
            >
              <ChatBubble className="w-8 h-8 text-white" />
            </button>
        </div>
      )}
    </div>
  );
};

export default App;
