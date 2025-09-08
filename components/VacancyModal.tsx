import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Vacancy, Priority, Recruiter, VacancyStage } from '../types';
import { X, UploadCloud, Paperclip, FileIcon, Calendar } from './icons/Icons';
import DatePicker from './DatePicker';

interface VacancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vacancy: Omit<Vacancy, 'id'> & { id?: string }) => void;
  vacancy: Vacancy | null;
  recruiters: Recruiter[];
}

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

const formatDateForDisplay = (isoDate: string) => {
    if (!isoDate) return '';
    const date = new Date(`${isoDate}T00:00:00`);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
};

const VacancyModal: React.FC<VacancyModalProps> = ({ isOpen, onClose, onSave, vacancy, recruiters }) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.Medium);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [briefUrl, setBriefUrl] = useState<string | null>(null);
  const [briefFileName, setBriefFileName] = useState('');
  const [briefText, setBriefText] = useState('');
  const [recruiterId, setRecruiterId] = useState<string>('');
  const [error, setError] = useState('');
  const [isDraggingBrief, setIsDraggingBrief] = useState(false);
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isEndDatePickerOpen, setIsEndDatePickerOpen] = useState(false);

  useEffect(() => {
    if (vacancy) {
      setTitle(vacancy.title);
      setPriority(vacancy.priority || Priority.Medium)
      setStartDate(vacancy.startDate.split('T')[0]);
      setEndDate(vacancy.endDate?.split('T')[0] || '');
      setBriefUrl(vacancy.briefUrl);
      setBriefFileName(vacancy.briefFileName);
      setBriefText(vacancy.briefText);
      setRecruiterId(vacancy.recruiterId || '');
    } else {
      // Reset form for new vacancy
      setTitle('');
      setPriority(Priority.Medium);
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setBriefUrl(null);
      setBriefFileName('');
      setBriefText('');
      setRecruiterId('');
    }
    setError('');
    setIsDraggingBrief(false);
  }, [vacancy, isOpen]);
  
  const handleBriefFile = async (file: File | null) => {
    if (file) {
        if (file.type !== 'application/pdf') {
            setError('Пожалуйста, загрузите PDF файл.');
            return;
        }
        try {
            const dataUrl = await fileToDataUrl(file);
            const text = await extractTextFromPdfDataUrl(dataUrl);
            setBriefUrl(dataUrl);
            setBriefFileName(file.name);
            setBriefText(text);
            setError(''); // Clear previous errors on success
        } catch (error) {
            console.error("Failed to process PDF:", error);
            setError("Не удалось обработать PDF. Файл может быть поврежден.");
            setBriefUrl(null);
            setBriefFileName('');
            setBriefText('');
        }
    }
  };

  const handleBriefChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    handleBriefFile(e.target.files?.[0] || null);
  };

  const handleSave = () => {
    if (!title || !startDate || !briefUrl || !briefText) {
      setError('Пожалуйста, заполните все обязательные поля и загрузите бриф.');
      return;
    }
    const vacancyToSave: Omit<Vacancy, 'id'> & { id?: string } = {
        id: vacancy?.id,
        title,
        priority,
        stage: vacancy?.stage || VacancyStage.New,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        imageUrl: '', // Set to empty string as it's no longer used
        briefUrl,
        briefFileName,
        briefText,
        recruiterId: recruiterId || undefined,
        // Keep existing fields not in the form
        resumes: vacancy?.resumes || [],
        analysis: vacancy?.analysis
    };
    onSave(vacancyToSave);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleBriefDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingBrief(false);
    handleBriefFile(e.dataTransfer.files?.[0] || null);
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
       <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fade-in-down { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-down { animation: fade-in-down 0.2s ease-out; }
      `}</style>
      <div 
        className="hide-scrollbar relative aurora-panel w-full max-w-lg rounded-3xl shadow-2xl p-8 animate-zoom-in text-slate-800 dark:text-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">{vacancy ? 'Редактировать вакансию' : 'Новая вакансия'}</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Название вакансии *</label>
            <input
              type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-200/50 dark:bg-white/10 border border-slate-300 dark:border-white/30 rounded-lg px-3 py-2 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Приоритет *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.values(Priority).map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200 border-2 ${
                    priority === p ? 'border-blue-500 dark:border-blue-400 bg-blue-500/20 dark:bg-blue-500/30' : 'border-transparent bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
                <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Дата начала *</label>
                <button
                  id="startDate"
                  onClick={() => setIsStartDatePickerOpen(prev => !prev)}
                  className="w-full flex justify-between items-center bg-slate-200/50 dark:bg-white/10 border border-slate-300 dark:border-white/30 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <span>{formatDateForDisplay(startDate) || 'дд.мм.гггг'}</span>
                  <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
                {isStartDatePickerOpen && (
                  <DatePicker 
                    value={startDate}
                    onChange={(date) => setStartDate(date)}
                    onClose={() => setIsStartDatePickerOpen(false)}
                  />
                )}
            </div>
            <div className="relative">
                <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Дата окончания</label>
                 <button
                  id="endDate"
                  onClick={() => setIsEndDatePickerOpen(prev => !prev)}
                  className="w-full flex justify-between items-center bg-slate-200/50 dark:bg-white/10 border border-slate-300 dark:border-white/30 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                   disabled={!startDate}
                >
                  <span className={endDate ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-gray-400'}>{formatDateForDisplay(endDate) || 'дд.мм.гггг'}</span>
                  <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
                {isEndDatePickerOpen && (
                   <DatePicker 
                    value={endDate}
                    onChange={(date) => setEndDate(date)}
                    onClose={() => setIsEndDatePickerOpen(false)}
                    minDate={startDate}
                  />
                )}
            </div>
          </div>
           <div>
            <label htmlFor="recruiterId" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Ответственный рекрутер</label>
            <select
                id="recruiterId" value={recruiterId} onChange={(e) => setRecruiterId(e.target.value)}
                className="w-full bg-slate-200/50 dark:bg-white/10 border border-slate-300 dark:border-white/30 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="">Не назначен</option>
                {recruiters.map(r => (
                    <option key={r.id} value={r.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white">{r.name}</option>
                ))}
            </select>
           </div>
          
          <div>
             <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Бриф вакансии (PDF) *</label>
            <input type="file" id="brief-upload" className="hidden" onChange={handleBriefChange} accept=".pdf" />
            <label 
              htmlFor="brief-upload" 
              className={`w-full flex items-center justify-center p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDraggingBrief ? 'border-blue-500 bg-blue-500/10' : 'border-slate-400 dark:border-gray-500 hover:border-blue-500 dark:hover:border-white'}`}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingBrief(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingBrief(false); }}
              onDragOver={handleDragOver}
              onDrop={handleBriefDrop}
            >
              {briefUrl ? (
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300 pointer-events-none">
                  <FileIcon className="w-5 h-5"/>
                  <span className="font-semibold">{briefFileName}</span>
                </div>
              ) : (
                <div className="text-center text-slate-500 dark:text-gray-400 pointer-events-none">
                  <Paperclip className="w-6 h-6 mx-auto"/>
                  <p>Перетащите PDF бриф сюда</p>
                </div>
              )}
            </label>
          </div>
        </div>
        
        {error && <p className="text-sm text-red-500 dark:text-red-400 mt-4 text-center">{error}</p>}

        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200/50 dark:bg-white/10 text-slate-700 dark:text-gray-200 rounded-lg hover:bg-slate-300/50 dark:hover:bg-white/20 transition-colors">Отмена</button>
          <button onClick={handleSave} className="px-4 py-2 text-white rounded-lg font-semibold aurora-button-primary">Сохранить</button>
        </div>
      </div>
    </div>
  );
};

export default VacancyModal;