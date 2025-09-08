import React from 'react';
import { CandidateResume, AnalysisResult } from '../types';
import { X, ThumbsUp, ThumbsDown, HelpCircle, MailIcon, PhoneIcon, LinkedinIcon, Paperclip } from './icons/Icons';

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

const ResumeAnalysisModal: React.FC<{ resume: CandidateResume; onClose: () => void }> = ({ resume, onClose }) => {
    const analysis = resume.analysis;
    if (!analysis) return null;

    const progressBar = getProgressBarProps(analysis.matchPercentage);
    const { contactInfo } = analysis;
    const hasContactInfo = contactInfo && (contactInfo.email || contactInfo.phone || contactInfo.linkedin || contactInfo.other);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="relative bg-white/80 dark:bg-slate-800 backdrop-blur-2xl border border-white/30 dark:border-slate-700/30 w-full max-w-3xl rounded-3xl shadow-2xl p-6 sm:p-8 animate-zoom-in text-slate-800 dark:text-slate-200 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                    <X className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Анализ резюме</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6 break-words font-medium">{resume.fileName}</p>
                
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
                        <h5 className="font-bold text-xl text-slate-900 dark:text-slate-100">{analysis.title}</h5>
                        <span className={`font-bold text-lg ${progressBar.colorClass.replace('bg-', 'text-')}`}>{analysis.matchPercentage}% совпадение</span>
                    </div>
                    <div className="w-full bg-slate-200/50 dark:bg-slate-600/50 rounded-full h-2.5">
                        <div 
                            className={`h-2.5 rounded-full transition-all duration-500 ${progressBar.colorClass}`} 
                            style={{ width: progressBar.width }}
                        ></div>
                    </div>
                    
                    {hasContactInfo && (
                        <div className="pt-4 border-t border-slate-300/50 dark:border-slate-600/50">
                        <h6 className="font-semibold mb-2 text-slate-800 dark:text-slate-200">Контактная информация</h6>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-700 dark:text-slate-300">
                            {contactInfo.email && (
                            <a href={`mailto:${contactInfo.email}`} className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                <MailIcon className="w-4 h-4" />
                                <span>{contactInfo.email}</span>
                            </a>
                            )}
                            {contactInfo.phone && (
                            <a href={`tel:${contactInfo.phone}`} className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                <PhoneIcon className="w-4 h-4" />
                                <span>{contactInfo.phone}</span>
                            </a>
                            )}
                            {contactInfo.linkedin && (
                                <a href={contactInfo.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
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

                    <p className="text-slate-700 dark:text-slate-300 text-base pt-4 border-t border-slate-300/50 dark:border-slate-600/50">{analysis.summary}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-green-600/10 dark:bg-green-500/20 border border-green-600/20 dark:border-green-500/30 rounded-xl">
                            <h6 className="font-bold mb-2 flex items-center gap-2 text-green-800 dark:text-green-300"><ThumbsUp className="w-5 h-5 text-green-600"/>Плюсы</h6>
                            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300 pl-2">
                                {analysis.pros.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                        <div className="p-4 bg-red-600/10 dark:bg-red-500/20 border border-red-600/20 dark:border-red-500/30 rounded-xl">
                            <h6 className="font-bold mb-2 flex items-center gap-2 text-red-800 dark:text-red-300"><ThumbsDown className="w-5 h-5 text-red-600"/>Минусы</h6>
                            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300 pl-2">
                                {analysis.cons.map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                        </div>
                    </div>
                    <div>
                        <div className="p-4 bg-blue-600/10 dark:bg-blue-500/20 border border-blue-600/20 dark:border-blue-500/30 rounded-xl">
                            <h6 className="font-bold mb-2 flex items-center gap-2 text-blue-800 dark:text-blue-300"><HelpCircle className="w-5 h-5 text-blue-600"/>Вопросы для интервью</h6>
                            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300 pl-2">
                                {analysis.questionsForInterview.map((q, i) => <li key={i}>{q}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                    >
                        Закрыть
                    </button>
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
    );
};

export default ResumeAnalysisModal;