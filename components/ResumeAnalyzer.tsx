
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';
import { ResumeAnalysis, AnalysisResult, Vacancy } from '../types';
import { Sparkles, ThumbsUp, ThumbsDown, HelpCircle, MailIcon, PhoneIcon, LinkedinIcon, Paperclip, Briefcase } from './icons/Icons';
import { FileUpload } from './FileUpload';

interface ResumeAnalyzerProps {
    activeVacancy: Vacancy | null;
}

const ResumeAnalyzer: React.FC<ResumeAnalyzerProps> = ({ activeVacancy }) => {
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ResumeAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [overallError, setOverallError] = useState<string | null>(null);

  useEffect(() => {
    // Reset results when files or vacancy change
    setResults([]);
  }, [activeVacancy, resumeFiles]);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ');
    }
    return text;
  };

  const handleAnalyze = async () => {
    if (!activeVacancy || resumeFiles.length === 0) {
      setOverallError('Пожалуйста, выберите активную вакансию в шапке сайта и загрузите хотя бы одно резюме.');
      return;
    }
    setOverallError(null);
    setIsAnalyzing(true);
    
    const initialResults: ResumeAnalysis[] = resumeFiles.map(file => ({
      fileName: file.name,
      analysis: null,
      isLoading: true,
    }));
    setResults(initialResults);

    try {
      const jobDescription = activeVacancy.briefText;
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
            type: Type.OBJECT,
            description: "Контактная информация кандидата.",
            properties: {
              email: { type: Type.STRING, description: "Email кандидата." },
              phone: { type: Type.STRING, description: "Номер телефона кандидата." },
              linkedin: { type: Type.STRING, description: "Ссылка на профиль LinkedIn." },
              other: { type: Type.STRING, description: "Другая контактная информация (сайт, Telegram и т.д.)." }
            }
          },
        },
        required: ['matchPercentage', 'title', 'summary', 'pros', 'cons', 'questionsForInterview', 'contactInfo'],
      };

      for (let i = 0; i < resumeFiles.length; i++) {
        const file = resumeFiles[i];
        try {
          const resumeText = await extractTextFromPdf(file);
          const prompt = `Представь, что ты опытный HR-менеджер. Твоя задача — провести глубокий и объективный анализ резюме кандидата в сравнении с предоставленным брифом вакансии.

Требования к анализу:
1.  **matchPercentage:** Дай числовую оценку соответствия от 0 до 100, где 100 — идеальное совпадение.
2.  **title:** Краткий, емкий вердикт (например: "Отличный кандидат", "Перспективный кандидат", "Стоит рассмотреть", "Не совсем подходит").
3.  **summary:** Напиши человекочитаемое и развернутое резюме на 3-4 предложения. Объясни свою оценку, укажи на ключевые совпадения и расхождения.
4.  **pros:** Перечисли списком ключевые сильные стороны кандидата, которые напрямую соответствуют требованиям вакансии.
5.  **cons:** Перечисли списком потенциальные риски, недостающие навыки или опыт. Будь конструктивен.
6.  **questionsForInterview:** Предложи 3-4 умных вопроса для собеседования, которые помогут прояснить "минусы" или глубже раскрыть "плюсы".
7.  **contactInfo:** Найди и извлеки контактную информацию из резюме: email, номер телефона, полную ссылку на LinkedIn (URL) и любую другую (например, личный сайт, Telegram). Если какая-то информация отсутствует, оставь соответствующее поле пустым в JSON.

Ответ должен быть строго в формате JSON в соответствии с предоставленной схемой. Используй camelCase для ключей.

--- БРИФ ВАКАНСИИ ---
${jobDescription}

--- РЕЗЮМЕ КАНДИДАТА ---
${resumeText}
`;
          
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: schema,
              temperature: 0.3,
            },
          });

          const resultJson: AnalysisResult = JSON.parse(response.text);
          setResults(prev => prev.map((r, index) => index === i ? { ...r, analysis: resultJson, isLoading: false } : r));
        
        } catch (e: any) {
          console.error(`Error analyzing ${file.name}:`, e);
          const errorMessage = e.message || 'Не удалось проанализировать файл.';
          setResults(prev => prev.map((r, index) => index === i ? { ...r, error: errorMessage, isLoading: false } : r));
        }
      }

    } catch (e) {
      console.error(e);
      setOverallError('Произошла ошибка при обработке брифа вакансии. Убедитесь, что это валидный PDF файл.');
      setResults(prev => prev.map(r => ({ ...r, isLoading: false, error: 'Анализ отменен из-за ошибки с брифом.' })));
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const getProgressBarProps = (percentage: number) => {
    let colorClass = 'bg-red-500';
    if (percentage >= 70) {
      colorClass = 'bg-green-500';
    } else if (percentage >= 40) {
      colorClass = 'bg-yellow-500';
    }
    return {
      width: `${Math.max(0, Math.min(100, percentage))}%`,
      colorClass,
    };
  };
  
  return (
    <div className="p-4 sm:p-8 h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-800">Анализатор Резюме</h2>
            <p className="mt-2 text-slate-600 max-w-3xl mx-auto">Выберите активную вакансию в шапке сайта и загрузите резюме для объективного анализа на основе ИИ.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="flex flex-col h-full">
              <h3 className="mb-2 font-medium text-slate-700">Активная вакансия</h3>
              <div className="flex-grow flex flex-col p-4 bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg justify-center items-center">
                  {activeVacancy ? (
                      <div className="text-center">
                          <Briefcase className="w-12 h-12 mx-auto text-blue-600 mb-2"/>
                          <p className="font-bold text-lg text-slate-800">{activeVacancy.title}</p>
                          <p className="text-sm text-slate-600">Бриф этой вакансии будет использован для анализа.</p>
                      </div>
                  ) : (
                      <div className="text-center text-slate-500">
                          <Briefcase className="w-12 h-12 mx-auto mb-2"/>
                          <p className="font-semibold">Вакансия не выбрана</p>
                          <p className="text-sm">Пожалуйста, выберите активную вакансию в шапке сайта.</p>
                      </div>
                  )}
              </div>
          </div>
          <FileUpload 
              title="Резюме кандидатов"
              files={resumeFiles}
              setFiles={setResumeFiles}
              multiple={true}
              accept=".pdf"
          />
        </div>

        <div className="text-center mb-8">
            <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !activeVacancy || resumeFiles.length === 0}
                className="inline-flex items-center justify-center gap-3 px-8 py-3 bg-blue-600 text-white font-bold rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50 disabled:bg-blue-500 disabled:opacity-70 disabled:scale-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
            >
                {isAnalyzing ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Анализ... ({results.filter(r => !r.isLoading).length}/{resumeFiles.length})</span>
                    </>
                ) : (
                    <>
                        <Sparkles className="w-6 h-6" />
                        <span>Анализировать ({resumeFiles.length})</span>
                    </>
                )}
            </button>
        </div>
        
        {overallError && <div className="text-center p-4 mb-6 bg-red-100/70 text-red-700 rounded-lg border border-red-300">{overallError}</div>}

        {results.length > 0 && (
            <div className="space-y-6">
                <h3 className="text-2xl font-bold text-slate-800 text-center">Результаты анализа</h3>
                {results.map((res, index) => (
                    <div key={index} className="p-5 bg-white/40 backdrop-blur-lg border border-white/50 rounded-2xl shadow-md animate-fade-in-up">
                        <h4 className="font-bold text-lg mb-3 text-slate-800 break-words">{res.fileName}</h4>
                        {res.isLoading && (
                            <div className="flex items-center gap-2 text-slate-600">
                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <span>Идет анализ...</span>
                            </div>
                        )}
                        {res.error && (
                            <div className="p-3 text-sm bg-red-100/70 text-red-800 border border-red-300 rounded-lg">
                                <strong>Ошибка:</strong> {res.error}
                            </div>
                        )}
                        {res.analysis && (() => {
                          const progressBar = getProgressBarProps(res.analysis.matchPercentage);
                          const { contactInfo } = res.analysis;
                          const hasContactInfo = contactInfo && (contactInfo.email || contactInfo.phone || contactInfo.linkedin || contactInfo.other);

                          return (
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                                  <h5 className="font-bold text-xl text-slate-900">{res.analysis.title}</h5>
                                  <span className={`font-bold text-lg ${progressBar.colorClass.replace('bg-', 'text-')}`}>{res.analysis.matchPercentage}% совпадение</span>
                                </div>
                                <div className="w-full bg-gray-200/50 rounded-full h-2.5 dark:bg-gray-700/30">
                                    <div 
                                        className={`h-2.5 rounded-full transition-all duration-500 ${progressBar.colorClass}`} 
                                        style={{ width: progressBar.width }}
                                    ></div>
                                </div>
                                
                                {hasContactInfo && (
                                  <div className="mt-4 pt-4 border-t border-white/50">
                                    <h6 className="font-semibold mb-2 text-slate-800">Контактная информация</h6>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-700">
                                      {contactInfo.email && (
                                        <a href={`mailto:${contactInfo.email}`} className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                                          <MailIcon className="w-4 h-4" />
                                          <span>{contactInfo.email}</span>
                                        </a>
                                      )}
                                      {contactInfo.phone && (
                                        <a href={`tel:${contactInfo.phone}`} className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                                          <PhoneIcon className="w-4 h-4" />
                                          <span>{contactInfo.phone}</span>
                                        </a>
                                      )}
                                      {contactInfo.linkedin && (
                                         <a href={contactInfo.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                                            <LinkedinIcon className="w-4 h-4" />
                                            <span className="truncate max-w-xs">{contactInfo.linkedin.replace(/^(https?:\/\/)?(www\.)?/,'')}</span>
                                        </a>
                                      )}
                                      {contactInfo.other && (
                                        <span className="flex items-center gap-2">
                                          <Paperclip className="w-4 h-4" />
                                          <span>{contactInfo.other}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                <p className="text-slate-700 text-base mt-4 pt-4 border-t border-white/50">{res.analysis.summary}</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                        <h6 className="font-bold mb-2 flex items-center gap-2 text-green-800"><ThumbsUp className="w-5 h-5 text-green-600"/>Плюсы</h6>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 pl-2">
                                            {res.analysis.pros.map((s, i) => <li key={i}>{s}</li>)}
                                        </ul>
                                    </div>
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                        <h6 className="font-bold mb-2 flex items-center gap-2 text-red-800"><ThumbsDown className="w-5 h-5 text-red-600"/>Минусы</h6>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 pl-2">
                                            {res.analysis.cons.map((w, i) => <li key={i}>{w}</li>)}
                                        </ul>
                                    </div>
                                </div>
                                <div>
                                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                        <h6 className="font-bold mb-2 flex items-center gap-2 text-blue-800"><HelpCircle className="w-5 h-5 text-blue-600"/>Вопросы для интервью</h6>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 pl-2">
                                            {res.analysis.questionsForInterview.map((q, i) => <li key={i}>{q}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                          )
                        })()}
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default ResumeAnalyzer;
