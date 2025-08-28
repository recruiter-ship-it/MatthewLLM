import React, { useState } from 'react';
import { Vacancy, Priority } from '../types';
import VacancyCard from './VacancyCard';
import { FireIcon } from './icons/Icons';

interface PriorityColumnProps {
  priority: Priority;
  vacancies: Vacancy[];
  onDrop: (vacancyId: string, priority: Priority) => void;
  onEditVacancy: (vacancy: Vacancy) => void;
  onDeleteVacancy: (id: string) => void;
  onViewVacancy: (vacancy: Vacancy) => void;
}

const priorityConfig: Record<Priority, { title: string; icon?: React.ReactNode; headerColor: string }> = {
  [Priority.Urgent]: { title: 'Горит', icon: <FireIcon className="w-5 h-5 text-red-500" />, headerColor: 'border-red-500' },
  [Priority.High]: { title: 'Высокая', headerColor: 'border-orange-500' },
  [Priority.Medium]: { title: 'Средняя', headerColor: 'border-yellow-500' },
  [Priority.Low]: { title: 'Невысокая', headerColor: 'border-blue-500' },
};


const PriorityColumn: React.FC<PriorityColumnProps> = ({ 
  priority, 
  vacancies, 
  onDrop,
  onEditVacancy,
  onDeleteVacancy,
  onViewVacancy,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const vacancyId = e.dataTransfer.getData('vacancyId');
    onDrop(vacancyId, priority);
    setIsDraggingOver(false);
  };

  const config = priorityConfig[priority];

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col w-72 md:w-80 flex-shrink-0 bg-black/5 backdrop-blur-sm rounded-xl transition-colors duration-300 ${isDraggingOver ? 'bg-blue-500/10' : ''}`}
    >
      <div className={`flex items-center gap-2 p-3 border-b-4 ${config.headerColor}`}>
        {config.icon}
        <h3 className="font-bold text-slate-700">{config.title}</h3>
        <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-slate-200/70 text-slate-600 rounded-full">{vacancies.length}</span>
      </div>
      <div className="flex-grow p-3 space-y-4 overflow-y-auto">
        {vacancies.map(vacancy => (
          <VacancyCard
            key={vacancy.id}
            vacancy={vacancy}
            onView={() => onViewVacancy(vacancy)}
            onEdit={() => onEditVacancy(vacancy)}
            onDelete={() => onDeleteVacancy(vacancy.id)}
          />
        ))}
        {vacancies.length === 0 && (
          <div className="text-center text-sm text-slate-500 pt-10">
            Перетащите сюда вакансии
          </div>
        )}
      </div>
    </div>
  );
};

export default PriorityColumn;