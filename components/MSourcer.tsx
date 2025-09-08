import React, { useState, useEffect } from 'react';
import { Type } from '@google/genai';
import { Sparkles, Clipboard, Search } from './icons/Icons';
import { Vacancy } from '../types';
import { generateContentWithFallback } from '../utils/gemini';

interface GeneratedQuery {
  title: string;
  query: string;
}
interface GeneratedQueries {
  hhQueries: GeneratedQuery[];
  linkedinXrayQueries: GeneratedQuery[];
}

interface MSourcerProps {
    vacancies: Vacancy[];
    activeVacancy: Vacancy | null;
}

// --- MAIN COMPONENT ---
const MSourcer: React.FC<MSourcerProps> = ({ vacancies, activeVacancy }) => {
    const [jobDescription, setJobDescription] = useState('');
    const [generatedQueries, setGeneratedQueries] = useState<GeneratedQueries | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedQuery, setCopiedQuery] = useState('');

    useEffect(() => {
        setJobDescription(activeVacancy ? activeVacancy.briefText : '');
        // Reset results when active vacancy changes
        setGeneratedQueries(null);
        setError(null);
    }, [activeVacancy]);


    const handleGenerateQueries = async () => {
        if (!jobDescription.trim()) {
            setError('Пожалуйста, введите описание вакансии или выберите активную вакансию с загруженным брифом.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedQueries(null);

        try {
            const schema = {
                type: Type.OBJECT,
                properties: {
                    hhQueries: {
                        type: Type.ARRAY,
                        description: "Boolean search queries for hh.ru",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING, description: "A descriptive title for the query, e.g., 'Senior Java Developer'" },
                                query: { type: Type.STRING, description: "The boolean query string for hh.ru search." }
                            },
                            required: ["title", "query"]
                        }
                    },
                    linkedinXrayQueries: {
                        type: Type.ARRAY,
                        description: "X-ray search queries for LinkedIn",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING, description: "A descriptive title for the query, e.g., 'Frontend Engineers in Moscow'" },
                                query: { type: Type.STRING, description: "The X-ray search query for Google." }
                            },
                            required: ["title", "query"]
                        }
                    }
                },
                required: ["hhQueries", "linkedinXrayQueries"]
            };

            const prompt = `Ты — AI-ассистент для рекрутеров. Твоя задача — создать профессиональные boolean-запросы и X-ray запросы для поиска кандидатов на основе описания вакансии.

Требования:
1.  **hhQueries:** Создай 2-3 варианта boolean-запросов для поиска на HeadHunter (hh.ru). Запросы должны быть сложными и точными, используя операторы AND, OR, NOT, кавычки "" и скобки ().
2.  **linkedinXrayQueries:** Создай 2-3 варианта X-ray запросов для поиска в LinkedIn через Google. Они должны содержать 'site:linkedin.com/in/' и ключевые слова.

Ответ верни строго в формате JSON в соответствии с предоставленной схемой.

--- ОПИСАНИЕ ВАКАНСИИ ---
${jobDescription}
--- КОНЕЦ ОПИСАНИЯ ---`;

            const response = await generateContentWithFallback({
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: schema,
                    temperature: 0.4,
                },
            });

            const resultJson: GeneratedQueries = JSON.parse(response.text);
            setGeneratedQueries(resultJson);

        } catch (e: any) {
            console.error("Error generating queries:", e);
            setError(`Произошла ошибка при генерации запросов: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedQuery(text);
        setTimeout(() => setCopiedQuery(''), 2000);
    };
    
    const QueryCard: React.FC<{ query: GeneratedQuery }> = ({ query }) => (
        <div className="p-4 bg-white/50 rounded-lg shadow-sm">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">{query.title}</h4>
            <div className="relative p-3 bg-slate-800/10 dark:bg-slate-900/20 rounded-md">
                <code className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">{query.query}</code>
                <button
                    onClick={() => copyToClipboard(query.query)}
                    className="absolute top-2 right-2 p-1.5 bg-white/60 dark:bg-slate-700/50 rounded-md text-slate-600 dark:text-slate-300 hover:bg-white/90 dark:hover:bg-slate-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Копировать запрос"
                >
                    <Clipboard className="w-4 h-4" />
                </button>
            </div>
            {copiedQuery === query.query && <p className="text-xs text-green-600 dark:text-green-400 text-right mt-1">Скопировано!</p>}
        </div>
    );

    return (
        <div className="p-4 sm:p-8 h-full overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">AI-Сорсер</h2>
                    <p className="mt-2 text-slate-600 dark:text-slate-400">Создавайте профессиональные boolean и x-ray запросы для поиска кандидатов с помощью ИИ.</p>
                </div>

                <div className="bg-white/40 dark:bg-slate-700/30 p-6 rounded-2xl shadow-md mb-8">
                    {activeVacancy ? (
                        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
                           <p className="text-blue-800 dark:text-blue-300">Используется бриф для активной вакансии: <span className="font-bold">{activeVacancy.title}</span></p>
                        </div>
                    ) : (
                        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-center">
                           <p className="text-yellow-800 dark:text-yellow-400 font-semibold">Пожалуйста, выберите активную вакансию в шапке сайта, чтобы автоматически заполнить описание.</p>
                        </div>
                    )}

                    <div>
                        <label htmlFor="job-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Описание вакансии / ключевые требования</label>
                        <textarea
                            id="job-description"
                            rows={8}
                            className="w-full p-3 bg-white/50 dark:bg-slate-800/40 border border-white/50 dark:border-slate-600/50 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-500"
                            placeholder="Описание активной вакансии появится здесь. Вы также можете вставить свой текст."
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                        />
                    </div>
                </div>

                <div className="text-center mb-8">
                    <button
                        onClick={handleGenerateQueries}
                        disabled={isLoading || !jobDescription.trim()}
                        className="aurora-button-primary inline-flex items-center justify-center gap-3 px-8 py-3 text-white font-bold rounded-lg disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Генерация...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-6 h-6" />
                                <span>Сгенерировать запросы</span>
                            </>
                        )}
                    </button>
                </div>

                {error && <div className="text-center p-4 mb-6 bg-red-100/70 text-red-700 dark:bg-red-900/20 dark:text-red-300 rounded-lg border border-red-300 dark:border-red-500/50">{error}</div>}

                {generatedQueries && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in-up">
                        <div>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4 text-center">Boolean-запросы (hh.ru)</h3>
                            <div className="space-y-4">
                                {generatedQueries.hhQueries.map((q, i) => <QueryCard key={`hh-${i}`} query={q} />)}
                            </div>
                        </div>
                        <div>
                             <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4 text-center">X-Ray запросы (LinkedIn)</h3>
                            <div className="space-y-4">
                                {generatedQueries.linkedinXrayQueries.map((q, i) => <QueryCard key={`li-${i}`} query={q} />)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MSourcer;
