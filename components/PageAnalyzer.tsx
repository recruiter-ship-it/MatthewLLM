
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Vacancy, AnalysisResult } from '../types';
// FIX: Removed BotMessageSquare as it is not an exported member of './icons/Icons' and was not used in this component.
import { Sparkles, ThumbsUp, ThumbsDown, HelpCircle, MailIcon, PhoneIcon, LinkedinIcon, Paperclip } from './icons/Icons';

declare const chrome: any;

// --- SUB-COMPONENT: AnalysisResultDisplay ---
// Shows the result of the page analysis
const AnalysisResultDisplay: React.FC<{ analysis: AnalysisResult }> = ({ analysis }) => {
    useEffect(() => {
        // When analysis is ready, tell content script to highlight contacts
        if (analysis.contactInfo) {
            chrome.runtime.sendMessage({ type: 'highlight_contacts_from_cs', contacts: analysis.contactInfo });
        }
    }, [analysis]);

    const getProgressBarProps = (percentage: number) => {
        let colorClass = 'bg-red-500';
        if (percentage >= 70) { colorClass = 'bg-green-500'; }
        else if (percentage >= 40) { colorClass = 'bg-yellow-500'; }
        return { width: `${Math.max(0, Math.min(100, percentage))}%`, colorClass };
    };

    const progressBar = getProgressBarProps(analysis.matchPercentage);
    const { contactInfo } = analysis;
    const hasContactInfo = contactInfo && (contactInfo.email || contactInfo.phone || contactInfo.linkedin || contactInfo.other);

    return (
        <div className="space-y-4 text-left p-1">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                <h5 className="font-bold text-xl text-slate-900">{analysis.title}</h5>
                <span className={`font-bold text-lg ${progressBar.colorClass.replace('bg-', 'text-')}`}>{analysis.matchPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200/50 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full transition-all duration-500 ${progressBar.colorClass}`} style={{ width: progressBar.width }}/>
            </div>
            {hasContactInfo && (
              <div className="pt-4 border-t border-slate-300/50">
                <h6 className="font-semibold mb-2 text-slate-800">Найденные контакты</h6>
                <div className="flex flex-col gap-2 text-sm text-slate-700">
                    {contactInfo.email && <a href={`mailto:${contactInfo.email}`} className="flex items-center gap-2 hover:text-blue-600 transition-colors"><MailIcon className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{contactInfo.email}</span></a>}
                    {contactInfo.phone && <a href={`tel:${contactInfo.phone}`} className="flex items-center gap-2 hover:text-blue-600 transition-colors"><PhoneIcon className="w-4 h-4 flex-shrink-0" /> <span>{contactInfo.phone}</span></a>}
                    {contactInfo.linkedin && <a href={contactInfo.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-blue-600 transition-colors"><LinkedinIcon className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{contactInfo.linkedin.replace(/^(https?:\/\/)?(www\.)?/,'')}</span></a>}
                    {contactInfo.other && <span className="flex items-center gap-2"><Paperclip className="w-4 h-4 flex-shrink-0" /> <span className="truncate">{contactInfo.other}</span></span>}
                </div>
              </div>
            )}
            <p className="text-slate-700 text-base pt-4 border-t border-slate-300/50">{analysis.summary}</p>
            <div className="grid grid-cols-1 gap-4">
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <h6 className="font-bold mb-2 flex items-center gap-2 text-green-800"><ThumbsUp className="w-5 h-5 text-green-600"/>Плюсы</h6>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 pl-2">{analysis.pros.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <h6 className="font-bold mb-2 flex items-center gap-2 text-red-800"><ThumbsDown className="w-5 h-5 text-red-600"/>Минусы</h6>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 pl-2">{analysis.cons.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <h6 className="font-bold mb-2 flex items-center gap-2 text-blue-800"><HelpCircle className="w-5 h-5 text-blue-600"/>Вопросы для интервью</h6>
                    <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 pl-2">{analysis.questionsForInterview.map((q, i) => <li key={i}>{q}</li>)}</ul>
                </div>
            </div>
        </div>
    );
};


const PageAnalyzer: React.FC<{ vacancies: Vacancy[] }> = ({ vacancies }) => {
    const [selectedVacancyId, setSelectedVacancyId] = useState<string>('');
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        chrome.storage.local.get('lastSelectedVacancyId', (data: any) => {
            if (data.lastSelectedVacancyId && vacancies.find(v => v.id === data.lastSelectedVacancyId)) {
                setSelectedVacancyId(data.lastSelectedVacancyId);
            } else if (vacancies.length > 0) {
                 setSelectedVacancyId(vacancies[0].id);
            }
        });
    }, [vacancies]);

    const handleVacancyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newId = e.target.value;
        setSelectedVacancyId(newId);
        chrome.storage.local.set({ lastSelectedVacancyId: newId });
        setAnalysis(null); // Clear previous analysis when changing vacancy
        setError(null);
    };

    const handleAnalyzePage = async () => {
        const selectedVacancy = vacancies.find(v => v.id === selectedVacancyId);
        if (!selectedVacancy) {
            setError('Пожалуйста, выберите вакансию для анализа.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setAnalysis(null);
        
        // Clear previous highlights
        chrome.runtime.sendMessage({ type: 'highlight_contacts_from_cs', contacts: null });

        chrome.runtime.sendMessage({ type: 'get_page_content_from_cs' }, async (response: any) => {
            if (!response || response.error || !response.content) {
                setError(response?.error || 'Не удалось получить содержимое страницы.');
                setIsLoading(false);
                return;
            }

            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const schema = {
                    type: Type.OBJECT,
                    properties: {
                        matchPercentage: { type: Type.NUMBER, description: "Числовая оценка соответствия от 0 до 100." },
                        title: { type: Type.STRING, description: "Краткий вердикт, например 'Отличный кандидат'." },
                        summary: { type: Type.STRING, description: 'Развернутое резюме анализа на 3-4 предложения.' },
                        pros: { type: Type.ARRAY, description: 'Список сильных сторон кандидата.', items: { type: Type.STRING } },
                        cons: { type: Type.ARRAY, description: 'Список слабых сторон или рисков.', items: { type: Type.STRING } },
                        questionsForInterview: { type: Type.ARRAY, description: 'Список вопросов для собеседования.', items: { type: Type.STRING } },
                        contactInfo: {
                            type: Type.OBJECT, description: "Контактная информация кандидата.",
                            properties: { email: { type: Type.STRING }, phone: { type: Type.STRING }, linkedin: { type: Type.STRING }, other: { type: Type.STRING } }
                        },
                    }, required: ['matchPercentage', 'title', 'summary', 'pros', 'cons', 'questionsForInterview', 'contactInfo'],
                };
                const prompt = `Ты HR-аналитик. Проанализируй текст резюме кандидата со страницы сайта в контексте брифа вакансии. Извлеки контакты. Ответ дай в JSON.

--- БРИФ ВАКАНСИИ ---
${selectedVacancy.briefText}

--- ТЕКСТ РЕЗЮМЕ СО СТРАНИЦЫ ---
${response.content}`;

                const result = await ai.models.generateContent({
                    model: 'gemini-2.5-flash', contents: prompt,
                    config: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.3 }
                });

                const resultJson: AnalysisResult = JSON.parse(result.text);
                setAnalysis(resultJson);
            } catch (e: any) {
                 setError(`Ошибка анализа: ${e.message}`);
            } finally {
                setIsLoading(false);
            }
        });
    };

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col text-center">
            <div className="flex-shrink-0">
                <div className="w-full max-w-md mx-auto space-y-4">
                    <select value={selectedVacancyId} onChange={handleVacancyChange}
                        className="w-full px-4 py-3 bg-white/40 border border-white/50 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70">
                        {vacancies.length > 0 ? (
                           <>
                             <option value="" disabled>-- Выберите вакансию --</option>
                             {vacancies.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
                           </>
                        ) : (
                           <option disabled>Сначала добавьте вакансию</option>
                        )}
                    </select>

                    <button
                      onClick={handleAnalyzePage}
                      disabled={isLoading || !selectedVacancyId}
                      className="w-full inline-flex items-center justify-center gap-3 px-8 py-3 bg-blue-600 text-white font-bold rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50 disabled:bg-blue-500 disabled:opacity-70 disabled:scale-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {isLoading ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Анализ...</span></>)
                                 : (<><Sparkles className="w-6 h-6" /><span>Анализировать страницу</span></>)}
                    </button>
                </div>
            </div>
            
            <div className="mt-6 flex-grow overflow-y-auto pr-2">
                {error && <div className="mt-4 text-center p-3 bg-red-100/70 text-red-700 rounded-lg border border-red-300">{error}</div>}
                {analysis ? <div className="animate-fade-in-up"><AnalysisResultDisplay analysis={analysis} /></div>
                          : !isLoading && <div className="text-center text-slate-500 pt-8">Результаты анализа появятся здесь.</div>
                }
            </div>
        </div>
    );
};

export default PageAnalyzer;
