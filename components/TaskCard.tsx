
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Task, Priority } from '../types';
import { MoreVertical, Edit, Trash2, Calendar } from './icons/Icons';

const formatDate = (dateString?: string) => {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
};

const getDaysString = (days: number): string => {
    // Handle overdue cases
    if (days < 0) {
        const absDays = Math.round(Math.abs(days));
        if (absDays === 0) return 'Просрочено'; // For cases like -0.4 days that round to 0

        const lastDigit = absDays % 10;
        const lastTwoDigits = absDays % 100;

        let dayWord;
        if (lastTwoDigits > 10 && lastTwoDigits < 20) dayWord = 'дней';
        else if (lastDigit === 1) dayWord = 'день';
        else if (lastDigit > 1 && lastDigit < 5) dayWord = 'дня';
        else dayWord = 'дней';

        return `Просрочено на ${absDays} ${dayWord}`;
    }

    // Handle upcoming cases
    if (days >= 0 && days < 1) return 'Срок сегодня';
    
    const d = Math.round(days);
    const lastDigit = d % 10;
    const lastTwoDigits = d % 100;
    
    let dayWord;
    if (lastTwoDigits > 10 && lastTwoDigits < 20) dayWord = 'дней';
    else if (lastDigit === 1) dayWord = 'день';
    else if (lastDigit > 1 && lastDigit < 5) dayWord = 'дня';
    else dayWord = 'дней';

    return `Осталось ${d} ${dayWord}`;
};


const priorityStyles: Record<Priority, { tag: string }> = {
  [Priority.Urgent]: { tag: 'bg-red-500 text-white' },
  [Priority.High]: { tag: 'bg-orange-500 text-white' },
  [Priority.Medium]: { tag: 'bg-yellow-500 text-yellow-900' },
  [Priority.Low]: { tag: 'bg-blue-500 text-white' },
};

const TaskCard: React.FC<{
  task: Task;
  isDone: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
}> = ({ task, isDone, onEdit, onDelete, onDragStart, onDragEnd }) => {
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
  
  const cardBackground = useMemo(() => {
    if (isDone) {
      return 'bg-slate-100/80 opacity-60';
    }
    if (task.priority === Priority.Urgent) {
      return 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20';
    }

    let background = 'bg-white/80 hover:shadow-md hover:bg-white';
    
    if (task.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(task.dueDate);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) { // Overdue
        background = 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20';
      } else if (diffDays === 0) { // Due today
        background = 'bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/20';
      } else if (diffDays <= 3) { // Due soon (1-3 days)
        background = 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20';
      }
    }
    
    return background;
  }, [task.dueDate, task.priority, isDone]);

  const timelineData = useMemo(() => {
    if (!task.dueDate || isDone) {
      return null;
    }

    const today = new Date();
    const createdAt = new Date(parseInt(task.id, 10));
    const dueDate = new Date(task.dueDate);
    
    // Set times for accurate day-based calculations
    today.setHours(23, 59, 59, 999);
    createdAt.setHours(0, 0, 0, 0);
    dueDate.setHours(23, 59, 59, 999);
    
    const totalDuration = dueDate.getTime() - createdAt.getTime();
    const elapsedDuration = today.getTime() - createdAt.getTime();
    
    let progress = 0;
    if (totalDuration > 0) {
        progress = Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
    } else if (today.getTime() >= dueDate.getTime()) {
        progress = 100;
    }

    const diffTime = dueDate.getTime() - new Date().getTime();
    const daysLeft = diffTime / (1000 * 60 * 60 * 24);

    let timelineText = getDaysString(daysLeft);
    let progressColorClass = 'bg-green-500';

    if (daysLeft < 0) {
        progressColorClass = 'bg-red-500';
        progress = 100;
    } else if (daysLeft < 1) {
        progressColorClass = 'bg-red-500';
    } else if (daysLeft <= 3) {
        progressColorClass = 'bg-yellow-500';
    }
    
    return { progress, progressColorClass, timelineText };

  }, [task.id, task.dueDate, isDone]);


  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-task-id={task.id}
      className={`p-3 rounded-lg shadow-sm flex flex-col transition-all duration-300 border cursor-grab active:cursor-grabbing ${cardBackground}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={`font-semibold text-slate-800 break-words flex-grow ${isDone ? 'line-through' : ''}`}>
          {task.title}
        </h3>
        <div className="relative flex-shrink-0" ref={menuRef}>
            <button 
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }} 
              className="p-1 rounded-full text-slate-500 hover:bg-slate-500/20 transition-colors"
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
      
      {task.description && (
          <p className={`text-sm text-slate-600 mt-1 break-words ${isDone ? 'line-through' : ''}`}>{task.description}</p>
      )}

      <div className="mt-auto pt-2 border-t border-slate-200/80">
        {timelineData ? (
          <div className="mt-1">
            <div className="flex justify-between items-center mb-1">
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${priorityStyles[task.priority].tag}`}>
                    {task.priority}
                </span>
                <div className="text-right text-xs font-medium text-slate-700">
                    {timelineData.timelineText}
                </div>
            </div>
            <div className="w-full bg-gray-200/50 rounded-full h-1.5">
                <div 
                    className={`h-1.5 rounded-full transition-colors duration-500 ${timelineData.progressColorClass}`}
                    style={{ width: `${timelineData.progress}%` }}
                ></div>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center mt-1">
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${priorityStyles[task.priority].tag}`}>
                  {task.priority}
              </span>
              {task.dueDate && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5"/>
                      <span>{formatDate(task.dueDate)}</span>
                  </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
