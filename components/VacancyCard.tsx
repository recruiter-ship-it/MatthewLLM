import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Vacancy, Priority } from '../types';
import { MoreVertical, Edit, Trash2 } from './icons/Icons';

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


const VacancyCard: React.FC<{
  vacancy: Vacancy;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ vacancy, onView, onEdit, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.dataTransfer.setData('vacancyId', vacancy.id);
    e.currentTarget.classList.add('opacity-50', 'scale-95');
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50', 'scale-95');
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
      
      cardBgClass = 'bg-slate-200/40 border-slate-400/30';
      statusText = 'Закрыта';
      progressElement = <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>;
      timelineText = `за ${getDaysString(duration)}`;

    } else {
      const duration = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const daysInWork = Math.max(0, duration);
      
      if (daysInWork > 30) cardBgClass = 'bg-red-500/10 border-red-500/20';
      else if (daysInWork >= 10) cardBgClass = 'bg-yellow-500/10 border-yellow-500/20';
      else cardBgClass = 'bg-green-500/10 border-green-500/20';

      statusText = 'В работе';
      progressElement = <div className="bg-gradient-to-r from-blue-400 to-purple-500 h-1.5 rounded-full animate-pulse"></div>;
      timelineText = getDaysString(daysInWork);
    }
    
    return { cardBgClass, statusText, progressElement, timelineText };

  }, [vacancy.startDate, vacancy.endDate]);


  const handleCardClick = (e: React.MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
          return;
      }
      onView();
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleCardClick}
      className={`rounded-2xl shadow-md overflow-hidden flex flex-col transition-all duration-300 cursor-pointer active:cursor-grabbing border ${timelineData.cardBgClass}`}
    >
      <div className="relative h-32 bg-gray-200">
        <img src={vacancy.imageUrl} alt={vacancy.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <h3 className="absolute bottom-2 left-3 text-white text-lg font-bold break-words pr-12">{vacancy.title}</h3>
         <div className="absolute top-2 right-2" ref={menuRef}>
            <button 
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }} 
              className="p-1.5 rounded-full text-white bg-black/30 hover:bg-black/50 transition-colors"
            >
                <MoreVertical className="w-5 h-5"/>
            </button>
            {menuOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-white/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden z-10 animate-fade-in-down">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit(); setMenuOpen(false); }} 
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-500/10 transition-colors"
                    >
                        <Edit className="w-4 h-4"/> Редактировать
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(); setMenuOpen(false); }} 
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-500/10 transition-colors"
                    >
                        <Trash2 className="w-4 h-4"/> Удалить
                    </button>
                </div>
            )}
        </div>
      </div>
      
      <div className="p-3 flex-grow flex flex-col justify-between">
          <div>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${priorityStyles[vacancy.priority].tag}`}>
                {vacancy.priority}
            </span>
          </div>
          
          <div className="mt-4">
              <div className="text-xs text-slate-600 mb-1">
                  {timelineData.statusText}
              </div>
              <div className="w-full bg-gray-200/50 rounded-full h-1.5">
                  {timelineData.progressElement}
              </div>
              <div className="text-right text-xs font-medium text-slate-700 mt-1">
                  {timelineData.timelineText}
              </div>
          </div>
      </div>
    </div>
  );
};

export default VacancyCard;
