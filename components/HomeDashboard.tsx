import React, { useState, useEffect } from 'react';
import { Vacancy, WidgetLink } from '../types';
import { Home, Briefcase, Link } from './icons/Icons';
import { generateContentWithFallback } from '../utils/gemini';
import SharedBoard from './SharedBoard';

declare const chrome: any;

interface HomeDashboardProps {
    vacancies: Vacancy[];
    userWidgets: { [recruiterId: string]: WidgetLink[] };
    onSaveUserWidgets: (widgets: { [recruiterId: string]: WidgetLink[] }) => void;
    activeRecruiterId: string | null;
}


// Fix: check for chrome API in a way that is compatible with TypeScript.
const IS_EXTENSION = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;

const HomeDashboard: React.FC<HomeDashboardProps> = ({ 
    vacancies, 
    userWidgets,
    onSaveUserWidgets,
    activeRecruiterId
}) => {
    const [summary, setSummary] = useState<string | null>(null);
    const [isSummaryLoading, setIsSummaryLoading] = useState(false);

    // Effect for generating the vacancy summary
    useEffect(() => {
        const generateSummary = async () => {
            if (vacancies.length === 0) {
                setSummary("У вас пока нет активных вакансий. Создайте первую, чтобы увидеть здесь сводку от AI.");
                return;
            }

            const SUMMARY_CACHE_KEY = 'summaryCache';
            const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour cache
            const vacanciesSignature = JSON.stringify(vacancies.map(v => ({ id: v.id, priority: v.priority, resumes: v.resumes?.length })));

            // Check cache
            try {
                let cachedItem = null;
                if (IS_EXTENSION) {
                    const data = await chrome.storage.local.get(SUMMARY_CACHE_KEY);
                    cachedItem = data[SUMMARY_CACHE_KEY];
                } else {
                    const cachedStr = localStorage.getItem(SUMMARY_CACHE_KEY);
                    if (cachedStr) cachedItem = JSON.parse(cachedStr);
                }

                if (cachedItem && cachedItem.signature === vacanciesSignature && (Date.now() - cachedItem.timestamp < CACHE_DURATION_MS)) {
                    setSummary(cachedItem.summary);
                    return; // Use cached summary and exit
                }
            } catch (e) {
                console.warn("Could not read summary cache:", e);
            }
            
            setIsSummaryLoading(true);
            try {
                const vacanciesData = vacancies.map(v => ({
                    title: v.title,
                    priority: v.priority,
                    daysInWork: Math.round((new Date().getTime() - new Date(v.startDate).getTime()) / (1000 * 60 * 60 * 24)),
                    candidates: v.resumes?.length || 0,
                }));

                const prompt = `Ты — AI-ассистент рекрутера. Проанализируй следующий JSON с данными о текущих вакансиях. Напиши краткую, дружелюбную и полезную сводку (2-3 абзаца) о текущем положении дел. Отметь, какие вакансии требуют наибольшего внимания (например, "горящие" или те, что давно в работе), и похвали за прогресс, если он есть.

                Данные о вакансиях:
                ${JSON.stringify(vacanciesData, null, 2)}`;

                const response = await generateContentWithFallback({ contents: prompt });
                const newSummary = response.text;
                setSummary(newSummary);

                // Save to cache
                const cacheValue = { summary: newSummary, timestamp: Date.now(), signature: vacanciesSignature };
                try {
                    if (IS_EXTENSION) {
                        await chrome.storage.local.set({ [SUMMARY_CACHE_KEY]: cacheValue });
                    } else {
                        localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(cacheValue));
                    }
                } catch(e) {
                    console.warn("Could not save summary cache:", e);
                }

            } catch (err: any) {
                console.error("Error generating summary:", err);
                let errorMessage = "Не удалось сгенерировать сводку. Пожалуйста, попробуйте обновить страницу.";
                if (err.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED'))) {
                    errorMessage = "Вы превысили лимит запросов к AI. Сводка будет доступна позже.";
                }
                setSummary(errorMessage);
            } finally {
                setIsSummaryLoading(false);
            }
        };
        generateSummary();
    }, [vacancies]);
    
    const myWidgets = (activeRecruiterId && userWidgets[activeRecruiterId]) || [];

    const handleSaveMyWidgets = (widgets: WidgetLink[]) => {
        if (activeRecruiterId) {
            const newAllWidgets = {
                ...userWidgets,
                [activeRecruiterId]: widgets
            };
            onSaveUserWidgets(newAllWidgets);
        }
    };

    const renderSkeleton = () => (
        <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-slate-300/50 dark:bg-slate-600/50 rounded w-3/4"></div>
            <div className="h-4 bg-slate-300/50 dark:bg-slate-600/50 rounded w-full"></div>
            <div className="h-4 bg-slate-300/50 dark:bg-slate-600/50 rounded w-5/6"></div>
        </div>
    );

    return (
        <div className="p-4 sm:p-8 h-full grid grid-rows-[auto_minmax(0,1fr)] gap-y-8">
            <div className="flex-shrink-0">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3"><Home/>Главная</h2>
                <p className="mt-1 text-slate-600 dark:text-slate-400">Ваша персональная сводка и панель быстрых ссылок.</p>
            </div>

            <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
                {/* AI Summary Column */}
                <div className="bg-white/40 dark:bg-slate-800/20 p-6 rounded-2xl shadow-md flex flex-col min-h-0">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 flex-shrink-0"><Briefcase/>Сводка по вакансиям</h3>
                    <div className="flex-grow overflow-y-auto">
                        {isSummaryLoading ? renderSkeleton() : (
                            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{summary}</p>
                        )}
                    </div>
                </div>

                {/* Personalized Widgets Column */}
                <SharedBoard
                    widgets={myWidgets}
                    onSave={handleSaveMyWidgets}
                />
            </div>
        </div>
    );
};

export default HomeDashboard;