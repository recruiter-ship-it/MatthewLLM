import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import * as pdfjsLib from 'pdfjs-dist';
import { Vacancy, Priority } from '../types';
import { X, UploadCloud, Paperclip, FileIcon, Sparkles } from './icons/Icons';

interface VacancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vacancy: Omit<Vacancy, 'id' | 'analysis'> & { id?: string }) => void;
  vacancy: Vacancy | null;
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

const VacancyModal: React.FC<VacancyModalProps> = ({ isOpen, onClose, onSave, vacancy }) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.Medium);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [briefUrl, setBriefUrl] = useState<string | null>(null);
  const [briefFileName, setBriefFileName] = useState('');
  const [briefText, setBriefText] = useState('');
  const [error, setError] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  useEffect(() => {
    if (vacancy) {
      setTitle(vacancy.title);
      setPriority(vacancy.priority || Priority.Medium)
      setStartDate(vacancy.startDate.split('T')[0]);
      setEndDate(vacancy.endDate?.split('T')[0] || '');
      setImageUrl(vacancy.imageUrl);
      setBriefUrl(vacancy.briefUrl);
      setBriefFileName(vacancy.briefFileName);
      setBriefText(vacancy.briefText);
    } else {
      // Reset form for new vacancy
      setTitle('');
      setPriority(Priority.Medium);
      setStartDate('');
      setEndDate('');
      setImageUrl(null);
      setBriefUrl(null);
      setBriefFileName('');
      setBriefText('');
    }
    setError('');
    setIsGeneratingImage(false);
  }, [vacancy, isOpen]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const dataUrl = await fileToDataUrl(file);
      setImageUrl(dataUrl);
    }
  };

  const handleBriefChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const dataUrl = await fileToDataUrl(file);
      setBriefUrl(dataUrl);
      setBriefFileName(file.name);
      try {
        const text = await extractTextFromPdfDataUrl(dataUrl);
        setBriefText(text);
      } catch (error) {
        console.error("Failed to parse PDF text:", error);
        setError("Не удалось извлечь текст из PDF. Файл может быть поврежден.")
      }
    }
  };

  const handleGenerateImage = async () => {
    if (!title.trim()) {
        setError('Пожалуйста, сначала введите название вакансии.');
        return;
    }
    setIsGeneratingImage(true);
    setError('');
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `A professional and clean 3D icon representing a job vacancy for a "${title}". Minimalist design, on a light-colored background.`;

        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: prompt,
            config: {
              numberOfImages: 1,
              outputMimeType: 'image/jpeg',
              aspectRatio: '16:9'
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
          const base64ImageBytes = response.generatedImages[0].image.imageBytes;
          const dataUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
          setImageUrl(dataUrl);
        } else {
          throw new Error("Не удалось сгенерировать изображение.");
        }
    } catch (e: any) {
        console.error("Image generation failed:", e);
        setError(`Ошибка генерации изображения: ${e.message}`);
    } finally {
        setIsGeneratingImage(false);
    }
  };


  const handleSave = () => {
    if (!title || !startDate || !imageUrl || !briefUrl || !briefText) {
      setError('Пожалуйста, заполните все обязательные поля и загрузите файлы.');
      return;
    }
    onSave({
      id: vacancy?.id,
      title,
      priority,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      imageUrl,
      briefUrl,
      briefFileName,
      briefText,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="relative bg-gray-800/20 backdrop-blur-2xl border border-white/20 w-full max-w-lg rounded-3xl shadow-2xl p-8 animate-zoom-in text-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6">{vacancy ? 'Редактировать вакансию' : 'Новая вакансия'}</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">Название вакансии *</label>
            <input
              type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/10 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Приоритет *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.values(Priority).map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200 border-2 ${
                    priority === p ? 'border-blue-400 bg-blue-500/30' : 'border-transparent bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-300 mb-1">Дата начала *</label>
                <input
                  type="date" id="startDate" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white/10 border border-white/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
            </div>
            <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-300 mb-1">Дата окончания</label>
                <input
                  type="date" id="endDate" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white/10 border border-white/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  min={startDate}
                />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Изображение для карточки *</label>
            <div className="w-full aspect-video flex items-center justify-center border-2 border-dashed border-gray-500 rounded-lg bg-white/5 overflow-hidden relative">
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover"/>
              ) : (
                <div className="text-center text-gray-400">
                  <UploadCloud className="w-8 h-8 mx-auto"/>
                  <p className="mt-2 text-sm">Предпросмотр изображения</p>
                </div>
              )}
               {isGeneratingImage && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-white mt-2">Генерация...</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-2">
                <button 
                  onClick={handleGenerateImage} 
                  disabled={!title.trim() || isGeneratingImage}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold disabled:bg-purple-400 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-4 h-4"/>
                  Сгенерировать
                </button>
                <input type="file" id="image-upload" className="hidden" onChange={handleImageChange} accept="image/*" />
                <label htmlFor="image-upload" className="flex-1 text-center px-3 py-2 text-sm bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition-colors cursor-pointer font-semibold">
                  Загрузить свою
                </label>
            </div>
          </div>


          <div>
             <label className="block text-sm font-medium text-gray-300 mb-1">Бриф вакансии (PDF) *</label>
            <input type="file" id="brief-upload" className="hidden" onChange={handleBriefChange} accept=".pdf" />
            <label htmlFor="brief-upload" className="w-full flex items-center justify-center p-3 border-2 border-dashed border-gray-500 hover:border-white rounded-lg cursor-pointer transition-colors">
              {briefUrl ? (
                <div className="flex items-center gap-2 text-green-300">
                  <FileIcon className="w-5 h-5"/>
                  <span className="font-semibold">{briefFileName}</span>
                </div>
              ) : (
                <div className="text-center text-gray-400">
                  <Paperclip className="w-6 h-6 mx-auto"/>
                  <p>Загрузить PDF бриф</p>
                </div>
              )}
            </label>
          </div>
        </div>
        
        {error && <p className="text-sm text-red-400 mt-4 text-center">{error}</p>}

        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition-colors">Отмена</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">Сохранить</button>
        </div>
      </div>
    </div>
  );
};

export default VacancyModal;