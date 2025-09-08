import React, { useState, useEffect } from 'react';
import { Type } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';
// Fix: Added missing import for ResumeAnalysis
import { ResumeAnalysis, AnalysisResult, Vacancy } from '../types';
import { Sparkles, ThumbsUp, ThumbsDown, HelpCircle, MailIcon, PhoneIcon, LinkedinIcon, Paperclip, Briefcase, AlertTriangle } from './icons/Icons';
import { FileUpload } from './FileUpload';
import { generateContentWithFallback } from '../utils/gemini';


interface ResumeAnalyzerProps {
    activeVacancy: Vacancy | null;
}

const getApiErrorMessage = (error: any, defaultMessage: string): string => {
    if (!error.message) return defaultMessage;
    try {
        // Error messages from the backend might be JSON strings.
        const errorString = error.message;
        const jsonMatch = errorString.match(/\{.*\}/);
        if (!jsonMatch) throw new Error("Not a JSON error");
        
        const errorObj = JSON.parse(jsonMatch[0]);
        const apiError = errorObj.error;
        if (apiError) {
            if (apiError.status === 'RESOURCE_EXHAUSTED' || apiError.code === 429) {
                return "Вы превысили лимит запросов к AI. Пожалуйста, попробуйте снова через некоторое время.";
            }
            return `Ошибка AI: ${apiError.message}` || defaultMessage;
        }
    } catch (e) {
        // Not a JSON error message, return as is. Could be network error etc.
    }
    return error.message;
};

const ResultCard: React.FC<{ result: ResumeAnalysis }> = ({ result }) => {
  const { fileName, analysis, isLoading, error } = result;

  const getProgressBarProps = (percentage: number) => {
    let colorClass = 'bg-red-500';
    if (percentage >= 70) { colorClass = 'bg-green-500'; }
    else if (percentage >= 40) { colorClass = 'bg-yellow-500'; }
    return { width: `${Math.max(0, Math.min(100, percentage))}%`, colorClass };
  };
  
  const ContactLink: React.FC<{ icon: React.ReactNode, href?: string, text?: string }> = ({ icon, href, text }) => {
    if (!text || !text.trim()) return null;
    const isLink = href && href !== '#' && !href.startsWith('tel:') && !href.startsWith('mailto:');
    const finalHref = href || '#';
    const linkProps = isLink ? { href: finalHref, target: "_blank", rel: "noopener noreferrer" } : { href: finalHref };

    return (
        <a {...linkProps} className={`flex items-center gap-2 truncate ${href && href !== '#' ? 'hover:text-blue-600 dark:hover:text-blue-400 transition-colors' : 'cursor-default'}`}>
            {icon}
            <span className="truncate">{text}</span>
        </a>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-white/50 dark:bg-slate-700/50 rounded-lg shadow-sm animate-pulse flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-slate-400 dark:border-slate-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-700 dark:text-slate-300 font-medium truncate">{fileName}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/20 rounded-lg shadow-sm border border-red-500/30">
        <p className="font-semibold text-red-800 dark:text-red-300 truncate">{fileName}</p>
        <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
      </div>
    );
  }
  
  if (!analysis) return null;

  const progressBar = getProgressBarProps(analysis.matchPercentage);

  return (
    <details className="p-4 bg-white/60 dark:bg-slate-700/60 rounded-lg shadow-sm border border-white/50 dark:border-slate-600/50 transition-all open:ring-2 open:ring-blue-500" open>
      <summary className="flex items-center justify-between cursor-pointer list-none">
        <div className="flex-grow overflow-hidden pr-4">
          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={fileName}>{fileName}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">{analysis.title}</p>
        </div>
        <div className={`text-lg font-bold ${progressBar.colorClass.replace('bg-', 'text-')}`}>{analysis.matchPercentage}%</div>
      </summary>
      <div className="mt-4 pt-4 border-t border-slate-300/50 dark:border-slate-600/50 space-y-4">
        <div className="w-full bg-slate-200/50 dark:bg-slate-600/50 rounded-full h-2">
            <div className={`h-2 rounded-full ${progressBar.colorClass}`} style={{ width: progressBar.width }}></div>
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-300">{analysis.summary}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
                <h5 className="font-semibold flex items-center gap-2"><ThumbsUp className="w-4 h-4 text-green-600"/> Плюсы</h5>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-400">{analysis.pros.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
            <div className="space-y-1">
                <h5 className="font-semibold flex items-center gap-2"><ThumbsDown className="w-4 h-4 text-red-600"/> Минусы</h5>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-400">{analysis.cons.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
        </div>
        {analysis.redFlags && analysis.redFlags.length > 0 && (
            <div className="space-y-1 text-sm">
                <h5 className="font-semibold flex items-center gap-2 text-orange-700 dark:text-orange-400"><AlertTriangle className="w-4 h-4"/> Красные флаги</h5>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-400">{analysis.redFlags.map((flag, i) => <li key={i}>{flag}</li>)}</ul>
            </div>
        )}
        <div className="space-y-1">
            <h5 className="font-semibold flex items-center gap-2"><HelpCircle className="w-4 h-4 text-blue-600"/> Вопросы для интервью</h5>
            <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 text-sm">{analysis.questionsForInterview.map((q, i) => <li key={i}>{q}</li>)}</ul>
        </div>
        
        {analysis.contactInfo && (
            <div className="space-y-2 pt-2 border-t border-slate-300/50 dark:border-slate-600/50 text-sm">
                 <h5 className="font-semibold flex items-center gap-2"><Paperclip className="w-4 h-4 text-slate-600 dark:text-slate-400"/> Контакты</h5>
                 <div className="flex flex-col gap-1 text-slate-600 dark:text-slate-400">
                    <ContactLink icon={<MailIcon className="w-4 h-4" />} href={`mailto:${analysis.contactInfo.email}`} text={analysis.contactInfo.email} />
                    <ContactLink icon={<PhoneIcon className="w-4 h-4" />} href={`tel:${analysis.contactInfo.phone}`} text={analysis.contactInfo.phone} />
                    <ContactLink icon={<LinkedinIcon className="w-4 h-4" />} href={analysis.contactInfo.linkedin} text={analysis.contactInfo.linkedin} />
                    <ContactLink icon={<Briefcase className="w-4 h-4" />} text={analysis.contactInfo.other} />
                 </div>
            </div>
        )}

      </div>
    </details>
  );
};


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
      const schema = {
        type: Type.OBJECT,
        properties: {
          matchPercentage: { type: Type.NUMBER, description: "Числовая оценка соответствия от 0 до 100." },
          title: { type: Type.STRING, description: "Краткий вердикт, например 'Отличный кандидат'." },
          summary: { type: Type.STRING, description: 'Развернутое резюме анализа на 3-4 предложения.' },
          pros: { type: Type.ARRAY, description: 'Список сильных сторон кандидата.', items: { type: Type.STRING } },
          cons: { type: Type.ARRAY, description: 'Список слабых сторон или рисков.', items: { type: Type.STRING } },
          redFlags: { type: Type.ARRAY, description: 'Список потенциальных "красных флагов": частая смена работы, большие пробелы в карьере, несоответствия и т.д.', items: { type: Type.STRING } },
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

      for (const [i, file] of resumeFiles.entries()) {
        try {
          const resumeText = await extractTextFromPdf(file);
          const prompt = `Представь, что ты опытный HR-менеджер. Твоя задача — провести глубокий и объективный анализ резюме кандидата в сравнении с предоставленным брифом вакансии.

Требования к анализу:
1.  **matchPercentage:** Дай числовую оценку соответствия от 0 до 100, где 100 — идеальное совпадение.
2.  **title:** Краткий, емкий вердикт (например: "Отличный кандидат", "Перспективный кандидат", "Стоит рассмотреть", "Не совсем подходит").
3.  **summary:** Напиши человекочитаемое и развернутое резюме на 3-4 предложения. Объясни свою оценку, укажи на ключевые совпадения и расхождения.
4.  **pros:** Перечисли списком ключевые сильные стороны кандидата, которые напрямую соответствуют требованиям вакансии.
5.  **cons:** Перечисли списком потенциальные риски, недостающие навыки или опыт. Будь конструктивен.
6.  **redFlags:** Отдельно выдели потенциальные "красные флаги", такие как частая смена работы (job hopping), необъяснимые пробелы в карьере, несоответствие заявленных навыков опыту. Если их нет, оставь это поле пустым.
7.  **questionsForInterview:** Предложи 3-4 умных вопроса для собеседования, которые помогут прояснить "минусы" или глубже понять опыт кандидата.
8.  **contactInfo:** Извлеки всю контактную информацию: email, телефон, LinkedIn и другие ссылки (сайт, Telegram). Если чего-то нет, оставь поле пустым.

Ответ должен быть строго в формате JSON в соответствии с предоставленной схемой.

--- БРИФ ВАКАНСИИ ---
${jobDescription}

--- РЕЗЮМЕ КАНДИДАТА ---
${resumeText}
--- КОНЕЦ РЕЗЮМЕ ---`;
          
          const response = await generateContentWithFallback({
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: schema,
              temperature: 0.3,
            },
          });
          const resultJson: AnalysisResult = JSON.parse(response.text);
          setResults(prev => {
            const newResults = [...prev];
            newResults[i] = { ...newResults[i], analysis: resultJson, isLoading: false };
            return newResults;
          });
        } catch (err: any) {
          const errorMessage = getApiErrorMessage(err, 'Не удалось проанализировать файл.');
          setResults(prev => {
            const newResults = [...prev];
            newResults[i] = { ...newResults[i], error: errorMessage, isLoading: false };
            return newResults;
          });
          if (errorMessage.includes("Вы превысили лимит")) {
            setOverallError(errorMessage);
            break; // Stop processing further files
          }
        }
      }
    } catch (error: any) {
      setOverallError(getApiErrorMessage(error, 'Произошла непредвиденная ошибка.'));
    } finally {
      setIsAnalyzing(false);
    }
  };

 return (
    <div className="p-4 sm:p-8 h-full flex flex-col">
      <div className="text-center mb-8 flex-shrink-0">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Анализатор резюме</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Сравните резюме кандидатов с требованиями вакансии с помощью ИИ.</p>
      </div>
      
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
        <div className="flex flex-col gap-6">
          <FileUpload
            title="Загрузите резюме (PDF)"
            files={resumeFiles}
            setFiles={setResumeFiles}
            multiple={true}
            accept=".pdf"
          />
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || resumeFiles.length === 0 || !activeVacancy}
            className="aurora-button-primary inline-flex items-center justify-center gap-3 px-8 py-3 text-white font-bold rounded-lg disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Анализ... ({results.filter(r => !r.isLoading).length + 1}/{resumeFiles.length})</span>
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6" />
                <span>Анализировать ({resumeFiles.length})</span>
              </>
            )}
          </button>
          
          {!activeVacancy && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center text-sm">
              <p className="text-yellow-800 dark:text-yellow-400 font-semibold">Внимание: Вакансия не выбрана. Для анализа выберите активную вакансию в шапке сайта.</p>
            </div>
          )}
          {overallError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center text-sm">
                <p className="text-red-800 dark:text-red-400 font-semibold">{overallError}</p>
              </div>
            )}
        </div>

        <div className="bg-white/30 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 rounded-2xl p-4 overflow-y-auto">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-4 text-lg">Результаты анализа</h3>
          <div className="space-y-4">
            {results.length === 0 && !isAnalyzing && (
              <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                Результаты появятся здесь после анализа.
              </div>
            )}
            {results.map((result, index) => (
              <ResultCard key={index} result={result} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeAnalyzer;