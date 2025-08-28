
import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Sparkles, Clipboard, Search, Plug } from './icons/Icons';
import InstallExtensionModal from './InstallExtensionModal';
import { Vacancy } from '../types';

// --- CONSTANTS & TYPES ---
const IS_EXTENSION = window.chrome && window.chrome.runtime && window.chrome.runtime.id;

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
}

// --- MAIN COMPONENT ---
const MSourcer: React.FC<MSourcerProps> = ({ vacancies }) => {
    const [jobDescription, setJobDescription] = useState('');
    const [selectedVacancyId, setSelectedVacancyId] = useState('');
    const [generatedQueries, setGeneratedQueries] = useState<GeneratedQueries | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedQuery, setCopiedQuery] = useState<string | null>(null);
    const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

    const handleVacancyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const vacancyId = e.target.value;
        setSelectedVacancyId(vacancyId);
        const selectedVacancy = vacancies.find(v => v.id === vacancyId);
        if (selectedVacancy) {
            setJobDescription(selectedVacancy.briefText || '');
        } else {
            setJobDescription('');
        }
    };

    const handleGenerate = async () => {
        if (!jobDescription.trim()) {
            setError('Пожалуйста, вставьте описание вакансии или ключевые слова.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedQueries(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const schema = {
                type: Type.OBJECT,
                properties: {
                    hhQueries: {
                        type: Type.ARRAY, description: "Boolean search queries for hh.ru",
                        items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, query: { type: Type.STRING } } }
                    },
                    linkedinXrayQueries: {
                        type: Type.ARRAY, description: "X-ray search queries for LinkedIn via Google",
                        items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, query: { type: Type.STRING } } }
                    }
                },
                required: ['hhQueries', 'linkedinXrayQueries']
            };
            const prompt = `Проанализируй описание вакансии и сгенерируй по 2-3 варианта boolean/x-ray запросов для поиска на hh.ru и через Google для LinkedIn.

ОПИСАНИЕ ВАКАНСИИ:
---
${jobDescription}
---`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', contents: prompt,
                config: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.4 }
            });
            const resultJson: GeneratedQueries = JSON.parse(response.text);
            setGeneratedQueries(resultJson);
        } catch (e: any) {
            console.error("Query generation failed:", e);
            setError(`Ошибка генерации запросов: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedQuery(text);
            setTimeout(() => setCopiedQuery(null), 2000);
        });
    };

    const renderQueries = (title: string, queries: GeneratedQuery[]) => (
        <div className="bg-white/40 p-4 rounded-xl">
            <h3 className="font-bold text-slate-800 mb-3">{title}</h3>
            <div className="space-y-2">
                {queries.map((q, index) => (
                    <div key={index} className="bg-white/50 p-2 rounded-lg">
                        <p className="text-sm font-semibold text-slate-700 mb-1">{q.title}</p>
                        <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-md">
                            <code className="text-xs text-slate-600 flex-grow break-all">{q.query}</code>
                            <button onClick={() => copyToClipboard(q.query)} className="p-1.5 rounded-md text-slate-500 hover:bg-blue-500/20 hover:text-blue-600 transition-colors flex-shrink-0" title="Копировать">
                                {copiedQuery === q.query ? <span className="text-green-600">✓</span> : <Clipboard className="w-4 h-4"/>}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="p-4 sm:p-8 h-full flex flex-col text-center overflow-y-auto">
            <Search className="w-12 h-12 mx-auto text-blue-600 mb-2"/>
            <h2 className="text-3xl font-bold text-slate-800">AI-Сорсер</h2>
            <p className="mt-1 text-slate-600 max-w-3xl mx-auto">
                Создавайте профессиональные boolean и x-ray запросы для поиска кандидатов с помощью ИИ.
            </p>
            
            {!IS_EXTENSION && (
                <div className="my-6 max-w-2xl mx-auto w-full">
                    <div 
                        onClick={() => setIsInstallModalOpen(true)}
                        className="block p-4 bg-white/50 border border-white/60 rounded-xl shadow-md hover:shadow-lg hover:bg-white/70 transition-all duration-300 group cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 bg-blue-600 text-white p-3 rounded-lg">
                                <Plug className="w-6 h-6"/>
                            </div>
                            <div className="text-left">
                                <h4 className="font-bold text-slate-800">Работайте еще эффективнее с нашим расширением!</h4>
                                <p className="text-sm text-slate-600 mt-0.5">
                                    Анализируйте резюме прямо на hh.ru и LinkedIn. <span className="font-semibold text-blue-600 group-hover:underline">Инструкция по установке &rarr;</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
             {isInstallModalOpen && (
                <InstallExtensionModal onClose={() => setIsInstallModalOpen(false)} />
            )}

            <div className="w-full max-w-2xl mx-auto space-y-4">
                {vacancies.length > 0 && (
                     <select
                        value={selectedVacancyId}
                        onChange={handleVacancyChange}
                        className="w-full p-4 bg-white/40 border border-white/50 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">-- Выберите вакансию для автозаполнения --</option>
                        {vacancies.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
                    </select>
                )}
                <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Вставьте сюда описание вакансии или ключевые навыки (например, 'Java-разработчик, Spring, Kafka, Москва')..."
                    className="w-full h-40 p-4 bg-white/40 border border-white/50 rounded-lg text-slate-800 placeholder:text-slate-500 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                />
                <button
                  onClick={handleGenerate}
                  disabled={isLoading || !jobDescription.trim()}
                  className="w-full inline-flex items-center justify-center gap-3 px-8 py-3 bg-blue-600 text-white font-bold rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50 disabled:bg-blue-500 disabled:opacity-70 disabled:scale-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {isLoading ? (<><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div><span>Генерация...</span></>) 
                               : (<><Sparkles className="w-6 h-6" /><span>Сгенерировать запросы</span></>)}
                </button>
            </div>
            {error && <div className="mt-4 text-center p-3 bg-red-100/70 text-red-700 rounded-lg border border-red-300">{error}</div>}
            {generatedQueries && (
                <div className="mt-8 text-left max-w-2xl mx-auto w-full space-y-4 animate-fade-in-up">
                    {renderQueries('Запросы для HeadHunter', generatedQueries.hhQueries)}
                    {renderQueries('X-Ray запросы для LinkedIn', generatedQueries.linkedinXrayQueries)}
                </div>
            )}
        </div>
    );
};

export default MSourcer;
