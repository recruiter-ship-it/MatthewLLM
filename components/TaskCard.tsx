
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Task, Priority } from '../types';
import { MoreVertical, Edit, Trash2, Calendar } from './icons/Icons';

const priorityStyles: Record<Priority, { tag: string }> = {
  [Priority.Urgent]: { tag: 'bg-red-500 text-white' },
  [Priority.High]: { tag: 'bg-orange-500 text-white' },
  [Priority.Medium]: { tag: 'bg-yellow-500 text-yellow-900' },
  [Priority.Low]: { tag: 'bg-blue-500 text-white' },
};

const formatDate = (dateString?: string) => {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
};

const TaskCard: React.FC<{
  task: Task;
  onToggleComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ task, onToggleComplete, onEdit, onDelete }) => {
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
    e.dataTransfer.setData('taskId', task.id);
    e.currentTarget.classList.add('opacity-50', 'scale-95');
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50', 'scale-95');
  };
  
  const dueDateData = useMemo(() => {
    if (!task.dueDate) return { text: 'Нет срока', color: 'text-slate-500' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: `Просрочено`, color: 'text-red-600 font-semibold' };
    if (diffDays === 0) return { text: 'Сегодня', color: 'text-orange-600 font-semibold' };
    if (diffDays === 1) return { text: 'Завтра', color: 'text-yellow-600' };
    return { text: formatDate(task.dueDate), color: 'text-slate-600' };
  }, [task.dueDate]);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`p-4 rounded-2xl shadow-md flex flex-col transition-all duration-300 border bg-white/70 active:cursor-grabbing ${task.isCompleted ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={`font-bold text-slate-800 break-words flex-grow ${task.isCompleted ? 'line-through' : ''}`}>
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
          <p className={`text-sm text-slate-600 mt-2 break-words ${task.isCompleted ? 'line-through' : ''}`}>{task.description}</p>
      )}

      <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col gap-3">
        <div className="flex justify-between items-center">
             <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${priorityStyles[task.priority].tag}`}>
                {task.priority}
            </span>
            {task.dueDate && (
                 <div className={`flex items-center gap-1.5 text-xs ${dueDateData.color}`}>
                    <Calendar className="w-3.5 h-3.5"/>
                    <span>{dueDateData.text}</span>
                 </div>
            )}
        </div>
        
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 select-none">
            <input 
                type="checkbox"
                checked={task.isCompleted}
                onChange={(e) => { e.stopPropagation(); onToggleComplete(); }}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            {task.isCompleted ? 'Выполнено' : 'Отметить как выполненную'}
        </label>
      </div>
    </div>
  );
};

export default TaskCard;
