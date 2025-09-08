import React, { useState, Dispatch } from 'react';
import { Type } from '@google/genai';
import { CompanyProfile, Recruiter, Vacancy } from '../types';
import { Sparkles, ThumbsUp, ThumbsDown, AlertTriangle } from './icons/Icons';
import { generateContentWithFallback } from '../utils/gemini';

interface PageAnalyzerProps {
  vacancies: Vacancy[];
  activeRecruiter: Recruiter | CompanyProfile | null;
  activeVacancy: Vacancy | null;
  companyProfile: CompanyProfile | null;
  onSelectVacancy: (vacancyId: string | null) => void;
  onUpdateVacancy: (update: Vacancy | ((prev: Vacancy) => Vacancy)) => void;
  dispatchVacancies: Dispatch<any>;
}


const PageAnalyzer: React.FC<PageAnalyzerProps> = ({
    vacancies,
    activeVacancy,
    onSelectVacancy,
}) => {
    const [analysis, setAnalysis] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyzePage = async () => {
        if (!activeVacancy) {
            setError("Пожалуйста, выберите вакансию для контекста.");
            return;
        }

        setIsLoading(true);
        setAnalysis(null);
        setError(null);

        try {
            const response = await chrome.runtime.sendMessage({
                target: 'content_script',
                action: 'getPageContent'
            });

            if (!response || !response.content) {
                throw new Error("Не удалось получить содержимое страницы. Попробуйте обновить страницу.");
            }

            const pageText = response.content;
            
            const schema = {
                type: Type.OBJECT,
                properties: {
                    matchPercentage: { type: Type.NUMBER, description: "Числовая оценка соответствия от 0 до 100." },
                    title: { type: Type.STRING, description: "Краткий вердикт, например 'Подходящий кандидат'." },
                    summary: { type: Type.STRING, description: 'Развернутое резюме анализа на 2-3 предложения.' },
                    pros: { type: Type.ARRAY, description: 'Сильные стороны кандидата.', items: { type: Type.STRING } },
                    cons: { type: Type.ARRAY, description: 'Слабые стороны или риски.', items: { type: Type.STRING } },
                    redFlags: { type: Type.ARRAY, description: 'Потенциальные "красные флаги".', items: { type: Type.STRING } },
                },
                required: ['matchPercentage', 'title', 'summary', 'pros', 'cons'],
            };

            const prompt = `Проанализируй текст со страницы кандидата (например, профиль LinkedIn) на соответствие брифу вакансии. Ответ верни в JSON.

--- БРИФ ВАКАНСИИ ---
${activeVacancy.briefText}

--- ТЕКСТ СТРАНИЦЫ ---
${pageText}
`;

            const aiResponse = await generateContentWithFallback({
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: schema,
                    temperature: 0.3,
                },
            });

            const resultJson = JSON.parse(aiResponse.text);
            setAnalysis(resultJson);

        } catch (err: any) {
            console.error("Analysis failed:", err);
            setError(err.message || "Произошла неизвестная ошибка.");
        } finally {
            setIsLoading(false);
        }
    };

    const renderAnalysis = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-full text-center">
                    <div className="flex flex-col items-center gap-2 text-[var(--text-secondary)]">
                        <div className="w-8 h-8 border-4 border-[var(--accent-color)] border-t-transparent rounded-full animate-spin"></div>
                        <span>Анализирую страницу...</span>
                    </div>
                </div>
            );
        }
        if (error) {
             return <div className="p-3 bg-red-500/10 text-red-700 dark:text-red-300 rounded-lg">{error}</div>;
        }
        if (!analysis) {
            return <p className="text-center text-[var(--text-secondary)]">Нажмите "Анализировать", чтобы оценить содержимое текущей страницы.</p>;
        }
        
        return (
            <div className="space-y-3 text-sm animate-fade-in-up">
                <h5 className="font-bold text-lg text-[var(--text-primary)]">{analysis.title} - {analysis.matchPercentage}%</h5>
                <p className="italic text-[var(--text-secondary)]">{analysis.summary}</p>
                 <div className="space-y-1">
                    <h6 className="font-semibold flex items-center gap-2 text-green-700 dark:text-green-400"><ThumbsUp className="w-4 h-4"/> Плюсы</h6>
                    <ul className="list-disc list-inside text-[var(--text-secondary)]">{analysis.pros.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                </div>
                <div className="space-y-1">
                    <h6 className="font-semibold flex items-center gap-2 text-red-700 dark:text-red-400"><ThumbsDown className="w-4 h-4"/> Минусы</h6>
                    <ul className="list-disc list-inside text-[var(--text-secondary)]">{analysis.cons.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>
                </div>
                {analysis.redFlags && analysis.redFlags.length > 0 && (
                     <div className="space-y-1">
                        <h6 className="font-semibold flex items-center gap-2 text-orange-700 dark:text-orange-400"><AlertTriangle className="w-4 h-4"/> Красные флаги</h6>
                        <ul className="list-disc list-inside text-[var(--text-secondary)]">{analysis.redFlags.map((f: string, i: number) => <li key={i}>{f}</li>)}</ul>
                    </div>
                )}
            </div>
        )
    };

    return (
        <div className="p-4 h-full flex flex-col gap-4">
            <div className="flex-shrink-0">
                 <label htmlFor="ext-vacancy-select" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Контекст для анализа</label>
                 <select
                    id="ext-vacancy-select"
                    value={activeVacancy?.id || ''}
                    onChange={(e) => onSelectVacancy(e.target.value || null)}
                    className="w-full p-2 bg-transparent border border-[var(--ui-border)] rounded-md text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-color)] focus:outline-none"
                >
                    <option value="">-- Выберите вакансию --</option>
                    {vacancies.map(v => (
                        <option key={v.id} value={v.id}>{v.title}</option>
                    ))}
                </select>
            </div>
            
            <div className="p-3 bg-[var(--bg-color)] rounded-lg flex-grow overflow-y-auto">
                {renderAnalysis()}
            </div>
            
            <button
                onClick={handleAnalyzePage}
                disabled={isLoading || !activeVacancy}
                className="w-full mt-auto py-3 px-4 aurora-button-primary text-white font-bold rounded-lg disabled:opacity-70 flex items-center justify-center gap-2"
            >
                <Sparkles className="w-5 h-5"/>
                {isLoading ? 'В процессе...' : 'Анализировать страницу'}
            </button>
        </div>
    );
};

export default PageAnalyzer;