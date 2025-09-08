import React, { useContext, useState } from 'react';
import { Vacancy, VacancyStage, Recruiter } from '../types';
import VacancyCard from './VacancyCard';
import { VacanciesContext } from './VacanciesContext';
import { FileText, Search, Mic, CheckSquare, Archive as ArchiveIcon } from './icons/Icons';

interface KanbanColumnProps {
  stage: VacancyStage;
  vacancies: Vacancy[];
  recruiters: Recruiter[];
}

const stageConfig: Record<VacancyStage, {
  title: string;
  IconComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  headerColor: string;
  bgColor: string;
}> = {
    [VacancyStage.New]: { title: 'Новые', IconComponent: FileText, headerColor: 'border-blue-500', bgColor: 'bg-blue-500/5' },
    [VacancyStage.Sourcing]: { title: 'Сорсинг', IconComponent: Search, headerColor: 'border-purple-500', bgColor: 'bg-purple-500/5' },
    [VacancyStage.Interview]: { title: 'Собеседования', IconComponent: Mic, headerColor: 'border-yellow-500', bgColor: 'bg-yellow-500/5' },
    [VacancyStage.Offer]: { title: 'Оффер', IconComponent: CheckSquare, headerColor: 'border-green-500', bgColor: 'bg-green-500/5' },
    [VacancyStage.Archive]: { title: 'Архив', IconComponent: ArchiveIcon, headerColor: 'border-slate-500', bgColor: 'bg-slate-500/5' },
};


const KanbanColumn: React.FC<KanbanColumnProps> = ({ stage, vacancies, recruiters }) => {
  const { dispatch } = useContext(VacanciesContext);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // This is necessary to allow the onDrop event to fire.
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('application/json')) {
        try {
            const transferData = JSON.parse(e.dataTransfer.getData('application/json'));
            // Highlight only if dragging from a *different* column
            if (transferData.sourceStage && transferData.sourceStage !== stage) {
                setIsDraggingOver(true);
            }
        } catch (err) {
            // Ignore parse errors, might be from another drag source
        }
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Prevents "flickering" when dragging over child elements
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    
    const transferDataStr = e.dataTransfer.getData('application/json');
    if (!transferDataStr) return;

    try {
        const { id: vacancyId, sourceStage } = JSON.parse(transferDataStr);
        
        // Only dispatch the action if the vacancy is being moved to a different stage.
        if (vacancyId && sourceStage && sourceStage !== stage) {
          dispatch({ type: 'CHANGE_STAGE', payload: { id: vacancyId, newStage: stage } });
        }
    } catch (err) {
        console.error("Failed to parse dropped data:", err);
    }
  };

  const config = stageConfig[stage];
  const Icon = config.IconComponent;

  return (
    <div 
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col w-72 md:w-80 flex-shrink-0 aurora-panel shadow-md rounded-2xl transition-all duration-300 ${isDraggingOver ? 'ring-2 ring-blue-500 scale-[1.02]' : ''}`}
    >
      <div className={`flex items-center gap-2 p-3 border-b-4 ${config.headerColor}`}>
        <Icon className={`w-5 h-5 ${config.headerColor.replace('border-', 'text-')}`} />
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

export default KanbanColumn;