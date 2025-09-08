import React, { useContext, useState } from 'react';
import { Vacancy, Recruiter } from '../types';
import { Plus, User } from './icons/Icons';
import VacancyCard from './VacancyCard';
import { VacanciesContext } from './VacanciesContext';

const recruiterColors = [
    { bg: 'bg-blue-500/10', border: 'border-blue-500' },
    { bg: 'bg-green-500/10', border: 'border-green-500' },
    { bg: 'bg-purple-500/10', border: 'border-purple-500' },
    { bg: 'bg-yellow-500/10', border: 'border-yellow-500' },
    { bg: 'bg-pink-500/10', border: 'border-pink-500' },
    { bg: 'bg-teal-500/10', border: 'border-teal-500' },
    { bg: 'bg-indigo-500/10', border: 'border-indigo-500' },
];

const getColorForRecruiter = (id: string) => {
  if (id === 'unassigned') {
      return { bg: 'bg-slate-500/10', border: 'border-slate-500' };
  }
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % recruiterColors.length);
  return recruiterColors[index];
};

const RecruiterColumn: React.FC<{
    recruiter: Recruiter | { id: string, name: string, avatar: string };
    vacancies: Vacancy[];
    allRecruiters: Recruiter[];
    onDrop: (e: React.DragEvent<HTMLDivElement>, targetRecruiterId: string | null) => void;
}> = ({ recruiter, vacancies, allRecruiters, onDrop }) => {
    const recruiterIdForDrop = recruiter.id === 'unassigned' ? null : recruiter.id;
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
             setIsDraggingOver(false);
        }
    };
    
    const handleColumnDrop = (e: React.DragEvent<HTMLDivElement>) => {
        onDrop(e, recruiterIdForDrop);
        setIsDraggingOver(false);
    };

    const color = getColorForRecruiter(recruiter.id);

    return (
        <div className="w-80 flex-shrink-0 flex flex-col">
            <div className={`flex items-center gap-3 p-3 border-b-4 ${color.border} flex-shrink-0`}>
                 {recruiter.id === 'unassigned' ? (
                    <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-slate-600 dark:text-slate-400"/>
                    </div>
                ) : (
                    <img src={recruiter.avatar} alt={recruiter.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                )}
                <h3 className="font-bold text-slate-800 dark:text-slate-200 truncate">{recruiter.name}</h3>
            </div>
            <div
                onDrop={handleColumnDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`min-h-[150px] space-y-4 p-2 rounded-b-lg transition-all duration-200 ${color.bg} ${
                    isDraggingOver ? 'bg-blue-500/10 ring-2 ring-blue-500/50' : ''
                }`}
            >
                {vacancies.length > 0 ? vacancies.map(vacancy => (
                    <VacancyCard key={vacancy.id} vacancy={vacancy} recruiters={allRecruiters} />
                )) : (
                     <div className="flex items-center justify-center h-full text-sm text-slate-500 dark:text-slate-400 p-4">
                        Перетащите сюда вакансии
                    </div>
                )}
            </div>
        </div>
    );
}

const VacanciesDashboard: React.FC<{ recruiters: Recruiter[] }> = ({ recruiters }) => {
    const { vacancies, dispatch, openVacancyModal } = useContext(VacanciesContext);

    const unassignedLane = {
        id: 'unassigned',
        name: 'Не назначено',
        avatar: '',
    };
    
    const recruiterColumns = [unassignedLane, ...recruiters];

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetRecruiterId: string | null) => {
        e.preventDefault();
        const transferDataStr = e.dataTransfer.getData('application/json');
        if (!transferDataStr) return;

        try {
            const { id: vacancyId, sourceRecruiterId } = JSON.parse(transferDataStr);
            
            if (vacancyId) {
                const currentRecruiterId = sourceRecruiterId === undefined ? null : sourceRecruiterId;
                if (currentRecruiterId !== targetRecruiterId) {
                    dispatch({ type: 'ASSIGN_RECRUITER', payload: { vacancyId: vacancyId, recruiterId: targetRecruiterId } });
                }
            }
        } catch (err) {
            console.error("Failed to parse dropped data:", err);
        }
    };
    
    return (
        <div className="p-4 sm:p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Воронка вакансий</h2>
                    <p className="mt-1 text-slate-600 dark:text-slate-400">Управляйте вакансиями по рекрутерам.</p>
                </div>
                <button
                    onClick={() => openVacancyModal(null)}
                    className="aurora-button-primary flex items-center gap-2 px-4 py-2 text-white font-bold rounded-lg"
                >
                    <Plus className="w-5 h-5" />
                    <span>Добавить</span>
                </button>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto">
                 {vacancies.length > 0 ? (
                    <div className="inline-flex gap-6 p-1">
                        {recruiterColumns.map(recruiter => {
                             const recruiterIdForFilter = recruiter.id === 'unassigned' ? undefined : recruiter.id;
                             const recruiterVacancies = vacancies.filter(v => v.recruiterId === recruiterIdForFilter);
                             return (
                                <RecruiterColumn
                                    key={recruiter.id}
                                    recruiter={recruiter}
                                    vacancies={recruiterVacancies}
                                    allRecruiters={recruiters}
                                    onDrop={handleDrop}
                                />
                             );
                        })}
                    </div>
                 ) : (
                    <div className="text-center h-full flex flex-col justify-center items-center">
                        <p className="text-slate-500 dark:text-slate-400">У вас пока нет добавленных вакансий.</p>
                        <p className="text-slate-500 dark:text-slate-400">Нажмите "Добавить", чтобы создать первую.</p>
                    </div>
                 )}
            </div>
        </div>
    );
};

export default VacanciesDashboard;