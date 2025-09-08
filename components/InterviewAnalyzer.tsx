import React, { useState, useEffect } from 'react';
import { Type } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';
import { InterviewAnalysis, HiringManagerSummary, Competency, Vacancy } from '../types';
import { Sparkles, Star, Clipboard, Mic } from './icons/Icons';
import { FileUpload } from './FileUpload';
import LiveInterviewCopilot from './LiveInterviewCopilot';
import { generateContentWithFallback } from '../utils/gemini';

const fileToGenerativePart = async (file: File) => {
    const base64EncodedData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    return {
        inlineData: {
            mimeType: file.type,
            data: base64EncodedData,
        },
    };
};

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


const SummarySection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base mb-2">{title}</h4>
        <div className="text-slate-700 dark:text-slate-300 text-sm space-y-1">{children}</div>
    </div>
);

interface InterviewAnalyzerProps {
    activeVacancy: Vacancy | null;
}

const loadingSteps = [
    "Расшифровка аудиозаписи...",
    "Анализ ключевых тем разговора...",
    "Сопоставление с резюме и вакансией...",
    "Оценка компетенций кандидата...",
    "Формирование сводки для менеджера...",
    "Почти готово, финализируем отчет...",
];

const InterviewAnalyzer: React.FC<InterviewAnalyzerProps> = ({ activeVacancy }) => {
  const [mode, setMode] = useState<'analyzer' | 'live'>('analyzer');
  const [interviewFile, setInterviewFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<InterviewAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSummaryCopied, setIsSummaryCopied] = useState(false);
  const [shouldAnalyzeAfterLive, setShouldAnalyzeAfterLive] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Начинаем анализ...');

  useEffect(() => {
    setAnalysis(null);
    setError(null);
  }, [interviewFile, resumeFile, activeVacancy]);

  useEffect(() => {
      if (shouldAnalyzeAfterLive && interviewFile && resumeFile && activeVacancy) {
          handleAnalyze();
          setShouldAnalyzeAfterLive(false);
      }
  }, [shouldAnalyzeAfterLive, interviewFile, resumeFile, activeVacancy]);


  const handleCopySummary = (summary: HiringManagerSummary) => {
    const {
        candidateName, age, city, salaryExpectations, preferredPaymentFormat,
        generalImpression, experienceSummary,
        motivation, conclusion
    } = summary;

    const summaryText = `Сводка по кандидату: ${candidateName}${age ? `, ${age}` : ''}
---
Город: ${city || 'не указан'}
Ожидания по ЗП: ${salaryExpectations || 'не указаны'}
Предпочтительный формат: ${preferredPaymentFormat || 'не указан'}
---
Общее впечатление:
${generalImpression}
---
Ключевой опыт:
${experienceSummary.map(item => `- ${item}`).join('\n')}
---
Мотивация:
${motivation}
---
Вывод:
${conclusion}
`;
    navigator.clipboard.writeText(summaryText.trim());
    setIsSummaryCopied(true);
    setTimeout(() => setIsSummaryCopied(false), 2000);
  };
  
  const handleLiveInterviewComplete = (
    recordedInterviewFile: File,
    conductedWithResumeFile: File | null
  ) => {
      setInterviewFile(recordedInterviewFile);
      if (conductedWithResumeFile) {
        setResumeFile(conductedWithResumeFile);
      }
      setMode('analyzer');
      setShouldAnalyzeAfterLive(true);
  };


  const handleAnalyze = async () => {
    if (!interviewFile || !resumeFile) {
      setError('Пожалуйста, загрузите резюме и файл с записью интервью.');
      return;
    }
    if (!activeVacancy) {
        setError('Пожалуйста, выберите активную вакансию в шапке сайта, чтобы предоставить контекст для анализа.');
        return;
    }

    setError(null);
    setAnalysis(null);
    setIsAnalyzing(true);
    
    setLoadingMessage('Подготовка к анализу...');
    const interval = setInterval(() => {
        setLoadingMessage(prev => {
            const currentIndex = loadingSteps.indexOf(prev);
            const nextIndex = (currentIndex + 1) % loadingSteps.length;
            return loadingSteps[nextIndex];
        });
    }, 2500);

    try {
      const schema = {
        type: Type.OBJECT,
        properties: {
          hiringManagerSummary: {
            type: Type.OBJECT,
            properties: {
              candidateName: { type: Type.STRING, description: "Имя и фамилия кандидата." },
              age: { type: Type.STRING, description: "Возраст кандидата (если указан)." },
              city: { type: Type.STRING, description: "Город проживания кандидата." },
              salaryExpectations: { type: Type.STRING, description: "Зарплатные ожидания." },
              preferredPaymentFormat: { type: Type.STRING, description: "Предпочтительный формат оплаты." },
              generalImpression: { type: Type.STRING, description: "Краткое общее впечатление о кандидате (2-3 предложения)." },
              experienceSummary: { type: Type.ARRAY, description: "Ключевые моменты из опыта (2-3 пункта).", items: { type: Type.STRING } },
              motivation: { type: Type.STRING, description: "Основная мотивация кандидата." },
              conclusion: { type: Type.STRING, description: "Итоговый вывод и рекомендация." },
            },
            required: ['candidateName', 'generalImpression', 'experienceSummary', 'motivation', 'conclusion']
          },
          competencyAnalysis: {
            type: Type.ARRAY,
            description: "Анализ ключевых поведенческих компетенций.",
            items: {
              type: Type.OBJECT,
              properties: {
                competency: { type: Type.STRING, description: "Название компетенции (например, Лидерство, Работа в команде)." },
                rating: { type: Type.NUMBER, description: "Оценка по шкале от 1 до 10." },
                justification: { type: Type.STRING, description: "Обоснование оценки с примерами из интервью." }
              },
              required: ['competency', 'rating', 'justification']
            }
          }
        },
        required: ['hiringManagerSummary', 'competencyAnalysis']
      };
      
      const resumeText = await extractTextFromPdf(resumeFile);
      const interviewPart = await fileToGenerativePart(interviewFile);

      const prompt = `Представь, что ты — опытный HR-менеджер. Твоя задача — проанализировать резюме и запись собеседования, а затем составить два блока информации: (1) краткую сводку для нанимающего менеджера и (2) анализ компетенций. Используй бриф вакансии для контекста.

--- БРИФ ВАКАНСИИ ---
${activeVacancy.briefText}
--- КОНЕЦ БРИФА ---

Ответ должен быть строго в формате JSON в соответствии с предоставленной схемой.

**Часть 1: Сводка для нанимающего менеджера (hiringManagerSummary)**
Напиши **краткую, но человечную и емкую** сводку. Избегай формализма и канцеляризмов. Пиши так, как будто делишься мнением с коллегой. Сводка должна включать:
- **Основная информация:** Имя, возраст, город, зарплатные ожидания, формат оплаты.
- **generalImpression:** Ключевое впечатление от общения.
- **experienceSummary:** Самое важное из опыта в 2-3 пунктах.
- **motivation:** Что движет кандидатом.
- **conclusion:** Твой итоговый вывод и рекомендация, коротко и по делу.

**Часть 2: Анализ компетенций (competencyAnalysis)**
На основе **записи интервью** (тон голоса, уверенность, формулировки) оцени 3-5 ключевых поведенческих компетенций, релевантных для вакансии. Для каждой компетенции:
- **competency:** Название компетенции (например: "Лидерство", "Стратегическое мышление", "Работа в команде", "Коммуникация", "Решение проблем").
- **rating:** Оценка по шкале от 1 до 10.
- **justification:** Краткое, но конкретное обоснование оценки на основе примеров из интервью.

--- ТЕКСТ РЕЗЮМЕ ---
${resumeText}
--- КОНЕЦ РЕЗЮМЕ ---

(К этому сообщению прикреплен файл с записью интервью для анализа)`;

      const response = await generateContentWithFallback({
        contents: { parts: [{text: prompt}, interviewPart] },
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.5,
        },
      });

      const resultJson: InterviewAnalysis = JSON.parse(response.text);
      setAnalysis(resultJson);

    } catch (e: any) {
      console.error("Error analyzing interview:", e);
      setError(`Не удалось проанализировать интервью: ${e.message || 'Проверьте формат файла и попробуйте снова.'}`);
    } finally {
      setIsAnalyzing(false);
      clearInterval(interval);
    }
  };

  const renderSummary = (summary: HiringManagerSummary) => {
    const {
        candidateName, age, city, salaryExpectations, preferredPaymentFormat,
        generalImpression, experienceSummary,
        motivation, conclusion
    } = summary;

    return (
        <div className="p-5 bg-white/40 dark:bg-slate-700/40 backdrop-blur-lg border border-white/50 dark:border-slate-600/50 rounded-2xl shadow-md space-y-5">
            <div>
                <p className="font-bold text-lg text-slate-900 dark:text-slate-100">{candidateName}{age && `, ${age}`}</p>
                {city && <p className="text-sm text-slate-700 dark:text-slate-300"><span className="font-semibold">Город:</span> {city}</p>}
                {salaryExpectations && <p className="text-sm text-slate-700 dark:text-slate-300"><span className="font-semibold">Ожидания по ЗП:</span> {salaryExpectations}</p>}
                {preferredPaymentFormat && <p className="text-sm text-slate-700 dark:text-slate-300"><span className="font-semibold">Формат:</span> {preferredPaymentFormat}</p>}
            </div>

            <SummarySection title="Общее впечатление">
                <p className="italic">{generalImpression}</p>
            </SummarySection>

            <SummarySection title="Опыт">
                <ul className="list-disc list-inside space-y-1">
                    {experienceSummary.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
            </SummarySection>

            <SummarySection title="Мотивация">
                <p>{motivation}</p>
            </SummarySection>
            
            <SummarySection title="Вывод">
                <p className="font-semibold">{conclusion}</p>
            </SummarySection>
        </div>
    );
  };
  
  const renderCompetencies = (competencies: Competency[]) => (
    <div className="p-5 bg-white/40 dark:bg-slate-700/40 backdrop-blur-lg border border-white/50 dark:border-slate-600/50 rounded-2xl shadow-md space-y-4">
      {competencies.map((comp, index) => (
        <div key={index} className="border-b border-white/30 dark:border-slate-600/30 pb-4 last:border-b-0 last:pb-0">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-1 gap-2">
            <p className="font-bold text-slate-800 dark:text-slate-200">{comp.competency}</p>
            <div className="flex items-center gap-1">
              {[...Array(10)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 transition-colors ${i < comp.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-400'}`}
                />
              ))}
              <span className="font-bold text-slate-700 dark:text-slate-200 ml-2">{comp.rating}/10</span>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{comp.justification}"</p>
        </div>
      ))}
    </div>
  );

  if (mode === 'live') {
      return (
          <LiveInterviewCopilot
            activeVacancy={activeVacancy}
            onInterviewComplete={handleLiveInterviewComplete}
            onCancel={() => setMode('analyzer')}
          />
      )
  }

  return (
    <div className="p-4 sm:p-8 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Анализатор Интервью</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">Загрузите запись для анализа или начните live-собеседование с AI-ассистентом.</p>
        </div>

        <div className="text-center mb-8">
            <button 
                onClick={() => setMode('live')}
                className="inline-flex items-center justify-center gap-3 px-6 py-3 bg-white/50 dark:bg-slate-700/40 text-slate-800 dark:text-slate-200 font-bold rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg border border-white/40 dark:border-slate-600/50 disabled:opacity-50"
                disabled={!activeVacancy}
            >
                <Mic className="w-6 h-6 text-blue-600 dark:text-blue-400"/>
                Начать Live-Интервью с ассистентом
            </button>
        </div>

        <div className="relative flex items-center justify-center my-8">
          <span className="absolute left-0 w-full h-px bg-slate-300 dark:bg-slate-700"></span>
          <span className="relative bg-indigo-50 dark:bg-slate-800/60 px-4 text-sm font-medium text-slate-500 dark:text-slate-400 z-10">Или загрузите существующую запись</span>
      </div>
        
        {activeVacancy ? (
          <div className="max-w-3xl mx-auto mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center text-sm">
            <p className="text-blue-800 dark:text-blue-300">Анализ будет проведен в контексте вакансии: <span className="font-bold">{activeVacancy.title}</span></p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center text-sm">
              <p className="text-yellow-800 dark:text-yellow-400 font-semibold">Внимание: Вакансия не выбрана. Для более точного анализа выберите активную вакансию в шапке сайта.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <FileUpload 
              title="Резюме кандидата (PDF)"
              files={resumeFile ? [resumeFile] : []}
              setFiles={(files) => setResumeFile(files[0] || null)}
              multiple={false}
              accept=".pdf"
            />
            <FileUpload 
              title="Запись интервью"
              files={interviewFile ? [interviewFile] : []}
              setFiles={(files) => setInterviewFile(files[0] || null)}
              multiple={false}
              accept="audio/*,video/*"
            />
        </div>

        <div className="text-center mb-8">
            <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !interviewFile || !resumeFile || !activeVacancy}
                className="aurora-button-primary inline-flex items-center justify-center gap-3 px-8 py-3 text-white font-bold rounded-lg disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
            >
                {isAnalyzing ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{loadingMessage}</span>
                    </>
                ) : (
                    <>
                        <Sparkles className="w-6 h-6" />
                        <span>Анализировать</span>
                    </>
                )}
            </button>
        </div>
        
        {error && <div className="text-center p-4 mb-6 bg-red-100/70 text-red-700 dark:bg-red-900/20 dark:text-red-300 rounded-lg border border-red-300 dark:border-red-500/50">{error}</div>}

        {analysis && (
            <div className="space-y-8 animate-fade-in-up">
                <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Сводка для нанимающего менеджера</h3>
                      <button
                        onClick={() => handleCopySummary(analysis.hiringManagerSummary)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/50 dark:bg-slate-700 hover:bg-white/70 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-lg transition-colors shadow-sm"
                        title="Копировать всю сводку"
                      >
                        <Clipboard className="w-4 h-4" />
                        <span>{isSummaryCopied ? 'Скопировано!' : 'Копировать'}</span>
                      </button>
                    </div>
                    {renderSummary(analysis.hiringManagerSummary)}
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Анализ компетенций</h3>
                    {renderCompetencies(analysis.competencyAnalysis)}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default InterviewAnalyzer;