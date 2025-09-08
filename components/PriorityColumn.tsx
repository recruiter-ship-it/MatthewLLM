import React, { useContext, useRef } from 'react';
import { Vacancy, Priority, Recruiter } from '../types';
import VacancyCard from './VacancyCard';
import { FireIcon } from './icons/Icons';
import { VacanciesContext } from './VacanciesContext';

interface PriorityColumnProps {
  priority: Priority;
  vacancies: Vacancy[];
  recruiters: Recruiter[];
}

const priorityConfig: Record<Priority, {
  title: string;
  IconComponent?: React.FC<React.SVGProps<SVGSVGElement>>;
  headerColor: string;
  bgColor: string;
}> = {
    [Priority.Urgent]: { title: 'Горит', IconComponent: FireIcon, headerColor: 'border-red-500', bgColor: 'bg-red-500/5' },
    [Priority.High]: { title: 'Высокий', headerColor: 'border-orange-500', bgColor: 'bg-orange-500/5' },
    [Priority.Medium]: { title: 'Средний', headerColor: 'border-yellow-500', bgColor: 'bg-yellow-500/5' },
    [Priority.Low]: { title: 'Низкий', headerColor: 'border-blue-500', bgColor: 'bg-blue-500/5' },
};


const PriorityColumn: React.FC<PriorityColumnProps> = ({ priority, vacancies, recruiters }) => {
  // Get full vacancies list from context to check original priority on drop
  const { vacancies: allVacancies, dispatch } = useContext(VacanciesContext);
  const columnRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('application/vnd.matthewlm.vacancy-id')) {
        // A clever way to check if the drag originated from this column without complex state management.
        // VacancyCard adds an 'opacity-50' class on drag start.
        const isSourceColumn = !!columnRef.current?.querySelector('.opacity-50');
        if (!isSourceColumn) {
            e.currentTarget.classList.add('bg-blue-500/10', 'ring-2', 'ring-blue-500');
        }
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Use relatedTarget to prevent flickering when moving over child elements
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        e.currentTarget.classList.remove('bg-blue-500/10', 'ring-2', 'ring-blue-500');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-500/10', 'ring-2', 'ring-blue-500');
    
    const vacancyId = e.dataTransfer.getData('application/vnd.matthewlm.vacancy-id');
    if (!vacancyId) return;

    const draggedVacancy = allVacancies.find(v => v.id === vacancyId);
    
    // Only dispatch the action if the vacancy is being moved to a different priority column.
    if (draggedVacancy && draggedVacancy.priority !== priority) {
      dispatch({ type: 'CHANGE_PRIORITY', payload: { id: vacancyId, newPriority: priority } });
    }
  };

  const config = priorityConfig[priority];
  const Icon = config.IconComponent;

  return (
    <div 
      ref={columnRef}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col w-72 md:w-80 flex-shrink-0 aurora-panel shadow-md rounded-2xl transition-colors duration-300`}
    >
      <div className={`flex items-center gap-2 p-3 border-b-4 ${config.headerColor}`}>
        {Icon && <Icon className="w-5 h-5 text-red-500" />}
        <h3 className="font-bold text-slate-800 dark:text-slate-200">{config.title}</h3>
        <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-slate-200/70 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-full">{vacancies.length}</span>
      </div>
      <div className={`flex-grow p-3 space-y-4 overflow-y-auto ${config.bgColor}`}>
        {vacancies.map(vacancy => (
          <VacancyCard
            key={vacancy.id}
            vacancy={vacancy}
            recruiters={recruiters}
          />
        ))}
        {vacancies.length === 0 && (
          <div className="text-center text-sm text-slate-500 dark:text-slate-400 pt-10">
            Перетащите сюда вакансии
          </div>
        )}
      </div>
    </div>
  );
};

export default PriorityColumn;
