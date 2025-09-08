import React, { useState, useRef, useEffect, useMemo, useCallback, useContext } from 'react';
import { Vacancy, Priority, Recruiter } from '../types';
import { MoreVertical, Edit, Trash2, X } from './icons/Icons';
import { VacanciesContext } from './VacanciesContext';

// This is for the priority TAG, which is different from the card background
const priorityStyles: Record<Priority, { tag: string }> = {
  [Priority.Urgent]: { tag: 'bg-red-500 text-white' },
  [Priority.High]: { tag: 'bg-orange-500 text-white' },
  [Priority.Medium]: { tag: 'bg-yellow-500 text-yellow-900' },
  [Priority.Low]: { tag: 'bg-blue-500 text-white' },
};

const getDaysString = (days: number): string => {
    const d = Math.max(0, Math.round(days));
    if (d === 0 && days > 0) return '< 1 дня';
    
    const lastDigit = d % 10;
    const lastTwoDigits = d % 100;

    if (lastTwoDigits > 10 && lastTwoDigits < 20) return `${d} дней`;
    if (lastDigit === 1) return `${d} день`;
    if (lastDigit > 1 && lastDigit < 5) return `${d} дня`;
    return `${d} дней`;
};


interface VacancyCardProps {
  vacancy: Vacancy;
  recruiters: Recruiter[];
}

const VacancyCard: React.FC<VacancyCardProps> = ({ vacancy, recruiters }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { dispatch, viewVacancy, openVacancyModal } = useContext(VacanciesContext);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEditClick = useCallback(() => {
    openVacancyModal(vacancy);
    setMenuOpen(false);
  }, [openVacancyModal, vacancy]);

  const handleDeleteClick = useCallback(() => {
    if (window.confirm(`Вы уверены, что хотите удалить вакансию "${vacancy.title}"?`)) {
      dispatch({ type: 'DELETE', payload: { id: vacancy.id } });
      setMenuOpen(false);
    }
  }, [dispatch, vacancy.id, vacancy.title]);

  const handleAssign = useCallback((recruiterId: string | null) => {
      dispatch({ type: 'ASSIGN_RECRUITER', payload: { vacancyId: vacancy.id, recruiterId } });
      setMenuOpen(false);
  }, [dispatch, vacancy.id]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const transferData = JSON.stringify({ 
        id: vacancy.id, 
        sourceStage: vacancy.stage,
        sourceRecruiterId: vacancy.recruiterId || null
    });
    e.dataTransfer.setData('application/json', transferData);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('opacity-50', 'scale-95', 'shadow-2xl');
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50', 'scale-95', 'shadow-2xl');
  };
  
  const timelineData = useMemo(() => {
    const today = new Date();
    const startDate = new Date(vacancy.startDate);
    const isClosed = !!vacancy.endDate;

    let cardBgClass: string;
    let statusText: string;
    let progressElement: React.ReactNode;
    let timelineText: string;

    if (isClosed) {
      const endDate = new Date(vacancy.endDate!);
      const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      
      cardBgClass = 'bg-slate-200/40 dark:bg-slate-700/30 border-slate-400/30 dark:border-slate-600/30';
      statusText = 'Закрыта';
      progressElement = <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>;
      timelineText = `за ${getDaysString(duration)}`;

    } else {
      const duration = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const daysInWork = Math.max(0, duration);
      
      if (daysInWork > 30) cardBgClass = 'bg-red-500/10 dark:bg-red-500/20 border-red-500/20 dark:border-red-500/30';
      else if (daysInWork >= 10) cardBgClass = 'bg-yellow-500/10 dark:bg-yellow-500/20 border-yellow-500/20 dark:border-yellow-500/30';
      else cardBgClass = 'bg-green-500/10 dark:bg-green-500/20 border-green-500/20 dark:border-green-500/30';

      statusText = 'В работе';
      progressElement = <div className="bg-gradient-to-r from-blue-400 to-purple-500 h-1.5 rounded-full animate-pulse"></div>;
      timelineText = getDaysString(daysInWork);
    }
    
    return { cardBgClass, statusText, progressElement, timelineText };

  }, [vacancy.startDate, vacancy.endDate]);


  const handleCardClick = (e: React.MouseEvent) => {
      // Prevent detail view from opening when interacting with the menu
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
          return;
      }
      viewVacancy(vacancy);
  };
  

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleCardClick}
      className={`aurora-card rounded-xl shadow-lg border p-3 flex flex-col gap-3 transition-all duration-300 cursor-grab active:cursor-grabbing ${timelineData.cardBgClass}`}
    >
      <div className="flex justify-between items-start gap-2">
        <h4 className="font-bold text-slate-800 dark:text-slate-200 leading-tight flex-grow pr-2">{vacancy.title}</h4>
        <div className="relative flex-shrink-0" ref={menuRef}>
            <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }} className="p-1.5 text-slate-500 dark:text-slate-400 rounded-full hover:bg-slate-500/10 dark:hover:bg-slate-700/50 transition-colors">
                <MoreVertical className="w-5 h-5"/>
            </button>
            {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 rounded-xl shadow-2xl overflow-hidden z-10 animate-fade-in-down" onClick={e => e.stopPropagation()}>
                <button onClick={handleEditClick} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-500/10 transition-colors">
                    <Edit className="w-5 h-5" /> Редактировать
                </button>
                <div className="border-t border-white/30 dark:border-slate-700/30 my-1"></div>
                <div className="px-4 pt-2 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">Назначить</div>
                {recruiters.map(recruiter => (
                        <button key={recruiter.id} onClick={() => handleAssign(recruiter.id)} className={`w-full text-left flex items-center gap-3 px-4 py-2 text-sm truncate ${vacancy.recruiterId === recruiter.id ? 'bg-blue-500/20 text-blue-800 dark:text-blue-300 font-semibold' : 'text-gray-700 dark:text-gray-300 hover:bg-blue-500/10'}`}>
                        <img src={recruiter.avatar} alt={recruiter.name} className="w-5 h-5 rounded-full object-cover"/>
                        <span className="truncate">{recruiter.name}</span>
                        </button>
                ))}
                {vacancy.recruiterId && (
                        <button onClick={() => handleAssign(null)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-500/10">
                        <X className="w-5 h-5 text-red-500" /> <span>Снять</span>
                        </button>
                )}
                <div className="border-t border-white/30 dark:border-slate-700/30 my-1"></div>
                    <button onClick={handleDeleteClick} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-5 h-5" /> Удалить
                </button>
            </div>
            )}
        </div>
      </div>
      
      <div>
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${priorityStyles[vacancy.priority].tag}`}>{vacancy.priority}</span>
      </div>
      
      <div className="pt-2 border-t border-slate-300/30 dark:border-slate-600/30">
        <div className="flex justify-between items-center text-xs mb-1">
            <div className="font-medium text-slate-500 dark:text-slate-400">{timelineData.statusText}</div>
            <div className="font-bold text-slate-700 dark:text-slate-200">{timelineData.timelineText}</div>
        </div>
        <div className="w-full bg-slate-200/50 dark:bg-slate-600/50 rounded-full h-1.5">
            {timelineData.progressElement}
        </div>
      </div>
    </div>
  );
};

export default VacancyCard;