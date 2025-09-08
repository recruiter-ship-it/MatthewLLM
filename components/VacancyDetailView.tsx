import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Type } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';
import { Vacancy, CandidateResume, AnalysisResult } from '../types';
import { X, MatthewLogoIcon, Users, FileIcon, Trash2, Sparkles, Plus, UploadCloud } from './icons/Icons';
import PdfViewer from './PdfViewer';
import ResumeAnalysisModal from './ResumeAnalysisModal';
import MarketPulseWidget from './MarketPulseWidget';
import { generateContentWithFallback } from '../utils/gemini';


const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const extractTextFromPdfDataUrl = async (dataUrl: string): Promise<string> => {
  const pdf = await pdfjsLib.getDocument(dataUrl).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(' ');
  }
  return text;
};


interface VacancyDetailProps {
  vacancy: Vacancy;
  onClose: () => void;
  onUpdate: (update: (prev: Vacancy) => Vacancy) => void;
}

const VacancyDetailView: React.FC<VacancyDetailProps> = ({ vacancy, onClose, onUpdate }) => {
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [viewingAnalysis, setViewingAnalysis] = useState<CandidateResume | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    // Automatically analyze brief if not already done
    const analyzeBrief = async () => {
      if (isLoadingAnalysis) return; // Prevent re-triggering while loading
      if (!vacancy.briefText || vacancy.analysis) {
        return;
      }
      setIsLoadingAnalysis(true);
      setAnalysisError(null);
      try {
        const schema = {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "Краткая, но емкая выжимка из текста брифа на 3-4 предложения. Опиши суть вакансии и ключевые требования." },
          },
          required: ["summary"]
        }
        const prompt = `Проанализируй следующий текст брифа вакансии и предоставь краткое содержание.\n\nТекст брифа:\n---\n${vacancy.briefText}\n---`;
        const response = await generateContentWithFallback({
          contents: prompt, config: { responseMimeType: 'application/json', responseSchema: schema }
        });
        const resultJson = JSON.parse(response.text);
        onUpdate(prev => ({ ...prev, analysis: resultJson }));
      } catch (e: any) {
        console.error("Brief analysis failed:", e);
        setAnalysisError(`Ошибка анализа брифа: ${e.message}`);
      } finally {
        setIsLoadingAnalysis(false);
      }
    };
    analyzeBrief();
  }, [vacancy.id, vacancy.briefText, vacancy.analysis, onUpdate, isLoadingAnalysis]);


  useEffect(() => {
    const analyzeNewResumes = async () => {
        if (!vacancy.resumes || !vacancy.briefText) return;

        const resumesToAnalyze = vacancy.resumes.filter(r => !r.analysis && !r.isLoading && !r.error);
        if (resumesToAnalyze.length === 0) return;

        // Batch update to set all to isLoading: true at once
        onUpdate(prev => ({
            ...prev,
            resumes: (prev.resumes || []).map(r => 
                resumesToAnalyze.some(rta => rta.id === r.id) 
                    ? { ...r, isLoading: true } 
                    : r
            )
        }));

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
        
        const analysisPromises = resumesToAnalyze.map(async (resume) => {
            try {
                const resumeText = await extractTextFromPdfDataUrl(resume.fileUrl);
                const prompt = `Представь, что ты опытный HR-менеджер. Проанализируй резюме кандидата в сравнении с брифом вакансии. Ответ верни в JSON.\n\n--- БРИФ ВАКАНСИИ ---\n${vacancy.briefText}\n\n--- РЕЗЮМЕ КАНДИДАТА ---\n${resumeText}\n`;
                
                const response = await generateContentWithFallback({
                  contents: prompt,
                  config: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.3 },
                });
                const resultJson: AnalysisResult = JSON.parse(response.text);
                return { id: resume.id, analysis: resultJson, error: undefined };
            } catch (e: any) {
                console.error(`Error analyzing ${resume.fileName}:`, e);
                return { id: resume.id, analysis: null, error: e.message || 'Не удалось проанализировать файл.' };
            }
        });
        
        const results = await Promise.all(analysisPromises);
        
        // Batch update with all results
        onUpdate(prev => {
            const newResumes = [...(prev.resumes || [])];
            results.forEach(result => {
                const index = newResumes.findIndex(r => r.id === result.id);
                if (index !== -1) {
                    newResumes[index] = { 
                        ...newResumes[index], 
                        isLoading: false, 
                        analysis: result.analysis, 
                        error: result.error 
                    };
                }
            });
            return { ...prev, resumes: newResumes };
        });
    };
    analyzeNewResumes();
  }, [vacancy.resumes, vacancy.briefText, onUpdate]);


  const handleAddResumeClick = () => {
    resumeInputRef.current?.click();
  };
  
  const handleNewResumeFiles = useCallback(async (files: File[] | FileList | null) => {
    if (!files || files.length === 0) return;

    const newResumesPromises = Array.from(files).map(async (file) => {
      const fileUrl = await fileToDataUrl(file);
      return {
        id: `${Date.now()}-${file.name}`,
        fileName: file.name,
        fileUrl: fileUrl,
        analysis: null,
        isLoading: false, // Will be set to true by the effect
        error: undefined,
      };
    });

    const newResumes = await Promise.all(newResumesPromises);

    onUpdate(prev => ({
        ...prev,
        resumes: [...(prev.resumes || []), ...newResumes]
    }));
  }, [onUpdate]);

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleNewResumeFiles(e.target.files);
    if (e.target) {
        e.target.value = '';
    }
  };

  const handleDeleteResume = (resumeId: string) => {
    onUpdate(prev => ({
        ...prev,
        resumes: (prev.resumes || []).filter(r => r.id !== resumeId)
    }));
  };
  
  const getMatchPercentageBadge = (analysis: AnalysisResult) => {
    const percentage = analysis.matchPercentage;
    let colorClasses = 'bg-red-500/20 text-red-200 border-red-400/30';
    if (percentage >= 70) {
      colorClasses = 'bg-green-500/20 text-green-200 border-green-400/30';
    } else if (percentage >= 40) {
      colorClasses = 'bg-yellow-500/20 text-yellow-200 border-yellow-400/30';
    }
    return (
      <div className={`px-2.5 py-1 text-sm font-bold rounded-full border ${colorClasses}`}>
        {percentage}%
      </div>
    );
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleNewResumeFiles(e.dataTransfer.files);
  };
  
  const sortedResumes = useMemo(() => {
    if (!vacancy.resumes) return [];
    return [...vacancy.resumes].sort((a, b) => {
      const aScore = a.analysis?.matchPercentage;
      const bScore = b.analysis?.matchPercentage;
      if (aScore !== undefined && bScore !== undefined) return bScore - aScore;
      if (aScore !== undefined) return -1;
      if (bScore !== undefined) return 1;
      return 0;
    });
  }, [vacancy.resumes]);

  return (
    <>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="relative bg-gray-800/20 backdrop-blur-2xl border border-white/20 w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl p-4 flex flex-col animate-zoom-in text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0 px-4">
            <h2 className="text-2xl font-bold text-white truncate pr-4">{vacancy.title} - Центр управления</h2>
            <button onClick={onClose} className="text-gray-300 hover:text-white transition-colors flex-shrink-0">
                <X className="w-6 h-6" />
            </button>
        </div>
        <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden">
            <div className="bg-white rounded-xl overflow-hidden h-full flex flex-col">
              <PdfViewer pdfUrl={vacancy.briefUrl} />
            </div>
            <div 
              className="bg-white/10 rounded-xl p-4 overflow-y-auto flex flex-col"
              onDragEnter={handleDragEnter}
            >
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><MatthewLogoIcon /> AI Ассистент</h3>
                  
                  {isLoadingAnalysis && (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex flex-col items-center gap-2 text-gray-300">
                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Анализирую бриф...</span>
                      </div>
                    </div>
                  )}
                  
                  {analysisError && <div className="p-3 text-sm bg-red-500/20 text-red-200 border border-red-400/50 rounded-lg">{analysisError}</div>}

                  {vacancy.analysis && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-semibold text-lg mb-2 text-gray-200">Краткое содержание</h4>
                        <p className="text-gray-300 text-sm leading-relaxed">{vacancy.analysis.summary}</p>
                      </div>
                    </div>
                  )}
                </div>

                <MarketPulseWidget vacancy={vacancy} />

                {/* Candidates Section */}
                <div className="mt-8 pt-6 border-t border-white/20 flex-grow flex flex-col relative">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Users /> Кандидаты</h3>
                    <div className="flex-grow overflow-y-auto pr-2">
                        {(sortedResumes && sortedResumes.length > 0) ? (
                            <ul className="space-y-3">
                                {sortedResumes.map(resume => (
                                    <li 
                                        key={resume.id}
                                        onClick={() => resume.analysis && setViewingAnalysis(resume)}
                                        className={`flex items-center justify-between p-2.5 bg-black/20 rounded-lg transition-colors duration-200 ${resume.analysis ? 'hover:bg-black/30 cursor-pointer' : ''}`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <FileIcon className="w-5 h-5 text-gray-300 flex-shrink-0"/>
                                            <span className="text-sm font-medium text-gray-200 truncate" title={resume.fileName}>{resume.fileName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {resume.isLoading && (
                                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Анализ...
                                                </div>
                                            )}
                                            {resume.error && (
                                                <button onClick={(e) => { e.stopPropagation(); /* Implement re-try logic if needed */ }} className="px-3 py-1 text-xs bg-red-500/50 text-white rounded-md hover:bg-red-500/70">
                                                    Ошибка, повторить?
                                                </button>
                                            )}
                                            {resume.analysis && getMatchPercentageBadge(resume.analysis)}
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteResume(resume.id); }} className="p-1.5 rounded-md text-gray-400 hover:bg-red-500/30 hover:text-red-300 transition-colors" title="Удалить">
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center py-8 text-gray-400 text-sm">Нет загруженных резюме.</div>
                        )}
                    </div>
                    <div className="mt-4 flex-shrink-0">
                        <input
                            type="file"
                            ref={resumeInputRef}
                            className="hidden"
                            multiple
                            accept=".pdf"
                            onChange={handleResumeUpload}
                        />
                        <button onClick={handleAddResumeClick} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition-colors font-semibold">
                            <Plus className="w-5 h-5"/>
                            Добавить резюме
                        </button>
                    </div>
                    {isDragging && (
                      <div 
                        className="absolute inset-0 z-10 bg-blue-800/20 backdrop-blur-sm border-4 border-dashed border-blue-400 rounded-xl"
                        onDragLeave={handleDragLeave}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      >
                         <div className="w-full h-full flex items-center justify-center pointer-events-none">
                            <div className="text-center font-bold text-white">
                                <UploadCloud className="w-16 h-16 mx-auto mb-2"/>
                                <p>Отпустите PDF файлы резюме</p>
                            </div>
                        </div>
                      </div>
                    )}
                </div>
            </div>
        </div>
      </div>
      <style>{`
        @keyframes zoom-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-zoom-in { animation: zoom-in 0.2s ease-out forwards; }
      `}</style>
    </div>
    {viewingAnalysis && (
        <ResumeAnalysisModal
            resume={viewingAnalysis}
            onClose={() => setViewingAnalysis(null)}
        />
    )}
    </>
  );
};

export default VacancyDetailView;
