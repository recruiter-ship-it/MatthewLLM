
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';
import { InterviewAnalysis, HiringManagerSummary, SoftSkill, Vacancy } from '../types';
import { Sparkles, Star, Clipboard } from './icons/Icons';
import { FileUpload } from './FileUpload';

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
        <h4 className="font-bold text-slate-800 text-base mb-2">{title}</h4>
        <div className="text-slate-700 text-sm space-y-1">{children}</div>
    </div>
);

interface InterviewAnalyzerProps {
    activeVacancy: Vacancy | null;
}

const InterviewAnalyzer: React.FC<InterviewAnalyzerProps> = ({ activeVacancy }) => {
  const [interviewFile, setInterviewFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<InterviewAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSummaryCopied, setIsSummaryCopied] = useState(false);

  useEffect(() => {
    setAnalysis(null);
    setError(null);
  }, [interviewFile, resumeFile, activeVacancy]);

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

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
          softSkillsAnalysis: {
            type: Type.ARRAY,
            description: "Анализ софт-скиллов кандидата.",
            items: {
              type: Type.OBJECT,
              properties: {
                skill: { type: Type.STRING, description: "Название софт-скилла." },
                rating: { type: Type.NUMBER, description: "Оценка по шкале от 1 до 10." },
                justification: { type: Type.STRING, description: "Обоснование оценки." }
              },
              required: ['skill', 'rating', 'justification']
            }
          }
        },
        required: ['hiringManagerSummary', 'softSkillsAnalysis']
      };
      
      const resumeText = await extractTextFromPdf(resumeFile);
      const interviewPart = await fileToGenerativePart(interviewFile);

      const prompt = `Представь, что ты — опытный HR-менеджер. Твоя задача — проанализировать резюме и запись собеседования, а затем составить два блока информации: (1) краткую сводку для нанимающего менеджера и (2) анализ софт-скиллов. Используй бриф вакансии для контекста.

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

**Часть 2: Анализ софт-скиллов (softSkillsAnalysis)**
На основе **записи интервью** (тон голоса, уверенность, формулировки) оцени следующие софт-скиллы. Для каждого скилла:
- **skill:** Название навыка.
- **rating:** Оценка по шкале от 1 до 10.
- **justification:** Краткое, но конкретное обоснование оценки на основе примеров из интервью.

Список навыков для анализа:
- Коммуникация
- Проактивность
- Решение проблем
- Структурное мышление
- Эмоциональный интеллект

--- ТЕКСТ РЕЗЮМЕ ---
${resumeText}
--- КОНЕЦ РЕЗЮМЕ ---

(К этому сообщению прикреплен файл с записью интервью для анализа)`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
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
    }
  };

  const renderSummary = (summary: HiringManagerSummary) => {
    const {
        candidateName, age, city, salaryExpectations, preferredPaymentFormat,
        generalImpression, experienceSummary,
        motivation, conclusion
    } = summary;

    return (
        <div className="p-5 bg-white/40 backdrop-blur-lg border border-white/50 rounded-2xl shadow-md space-y-5">
            <div>
                <p className="font-bold text-lg text-slate-900">{candidateName}{age && `, ${age}`}</p>
                {city && <p className="text-sm text-slate-700"><span className="font-semibold">Город:</span> {city}</p>}
                {salaryExpectations && <p className="text-sm text-slate-700"><span className="font-semibold">Ожидания по ЗП:</span> {salaryExpectations}</p>}
                {preferredPaymentFormat && <p className="text-sm text-slate-700"><span className="font-semibold">Формат:</span> {preferredPaymentFormat}</p>}
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
  
  const renderSoftSkills = (skills: SoftSkill[]) => (
    <div className="p-5 bg-white/40 backdrop-blur-lg border border-white/50 rounded-2xl shadow-md space-y-4">
      {skills.map((skill, index) => (
        <div key={index} className="border-b border-white/30 pb-4 last:border-b-0 last:pb-0">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-1 gap-2">
            <p className="font-bold text-slate-800">{skill.skill}</p>
            <div className="flex items-center gap-1">
              {[...Array(10)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 transition-colors ${i < skill.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-400'}`}
                />
              ))}
              <span className="font-bold text-slate-700 ml-2">{skill.rating}/10</span>
            </div>
          </div>
          <p className="text-sm text-slate-600 italic">"{skill.justification}"</p>
        </div>
      ))}
    </div>
  );


  return (
    <div className="p-4 sm:p-8 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-800">Анализатор Интервью</h2>
            <p className="mt-2 text-slate-600 max-w-3xl mx-auto">Загрузите резюме и аудио/видеозапись собеседования, чтобы получить подробную сводку и анализ soft skills.</p>
        </div>
        
        {activeVacancy ? (
          <div className="max-w-3xl mx-auto mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center text-sm">
            <p className="text-blue-800">Анализ будет проведен в контексте вакансии: <span className="font-bold">{activeVacancy.title}</span></p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center text-sm">
              <p className="text-yellow-800 font-semibold">Внимание: Вакансия не выбрана. Для более точного анализа выберите активную вакансию в шапке сайта.</p>
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
                className="inline-flex items-center justify-center gap-3 px-8 py-3 bg-blue-600 text-white font-bold rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50 disabled:bg-blue-500 disabled:opacity-70 disabled:scale-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
            >
                {isAnalyzing ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Анализ...</span>
                    </>
                ) : (
                    <>
                        <Sparkles className="w-6 h-6" />
                        <span>Анализировать</span>
                    </>
                )}
            </button>
        </div>
        
        {error && <div className="text-center p-4 mb-6 bg-red-100/70 text-red-700 rounded-lg border border-red-300">{error}</div>}

        {analysis && (
            <div className="space-y-8 animate-fade-in-up">
                <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-2xl font-bold text-slate-800">Сводка для нанимающего менеджера</h3>
                      <button
                        onClick={() => handleCopySummary(analysis.hiringManagerSummary)}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white/50 hover:bg-white/70 text-slate-700 font-semibold rounded-lg transition-colors shadow-sm"
                        title="Копировать всю сводку"
                      >
                        <Clipboard className="w-4 h-4" />
                        <span>{isSummaryCopied ? 'Скопировано!' : 'Копировать'}</span>
                      </button>
                    </div>
                    {renderSummary(analysis.hiringManagerSummary)}
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-4">Анализ Soft Skills</h3>
                    {renderSoftSkills(analysis.softSkillsAnalysis)}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default InterviewAnalyzer;
