import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Vacancy } from '../types';
import { Sparkles, Monitor, VideoOff, Volume2, VolumeX } from './icons/Icons';
import { generateContentWithFallback } from '../utils/gemini';

interface Insight {
    id: number;
    text: string;
}

const ScreenCopilot: React.FC<{ vacancies: Vacancy[] }> = ({ vacancies }) => {
    const [isSharing, setIsSharing] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedVacancyId, setSelectedVacancyId] = useState<string>('');
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (vacancies.length > 0 && !selectedVacancyId) {
            setSelectedVacancyId(vacancies[0].id);
        }
    }, [vacancies, selectedVacancyId]);

    const speak = (text: string) => {
        if (!isVoiceEnabled || !text.trim() || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel(); // Cancel any ongoing speech

        // Split text into sentences for a more natural, streaming-like delivery
        const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
        
        const speakSentences = () => {
            const voices = window.speechSynthesis.getVoices();
            let selectedVoice: SpeechSynthesisVoice | null = null;
            if (voices.length > 0) {
                const russianVoices = voices.filter(voice => voice.lang === 'ru-RU');
                const preferredMaleNames = ['Google русский', 'Yuri', 'Pavel', 'Dmitry'];
                selectedVoice = russianVoices.find(voice =>
                    preferredMaleNames.some(name => voice.name.toLowerCase().includes(name.toLowerCase()))
                ) || null;
                if (!selectedVoice) {
                    selectedVoice = russianVoices.find(voice => !voice.localService) || null; // Prefer cloud voices
                }
                if (!selectedVoice && russianVoices.length > 0) {
                    selectedVoice = russianVoices[0]; // Fallback to any Russian voice
                }
            }

            sentences.forEach(sentence => {
                if (sentence.trim()) {
                    const utterance = new SpeechSynthesisUtterance(sentence.trim());
                    if (selectedVoice) {
                        utterance.voice = selectedVoice;
                    } else {
                        utterance.lang = 'ru-RU'; // Set language if no specific voice found
                    }
                    // Fine-tuned parameters for a more human-like voice
                    utterance.pitch = 0.95;
                    utterance.rate = 1.05;
                    window.speechSynthesis.speak(utterance);
                }
            });
        }

        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
                speakSentences();
                window.speechSynthesis.onvoiceschanged = null; // Remove listener after use
            };
        } else {
            speakSentences();
        }
    };

    const handleStartSharing = async () => {
        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: 15 },
                audio: false
            });
            setStream(displayStream);
            setIsSharing(true);
            setError(null);
            
            displayStream.getVideoTracks()[0].onended = () => {
                 handleStopSharing();
            };

        } catch (err: any) {
            console.error("Screen sharing error:", err);
            setError("Не удалось получить доступ к экрану. Пожалуйста, предоставьте разрешение и попробуйте снова.");
            setIsSharing(false);
        }
    };

    const handleStopSharing = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        setStream(null);
        setIsSharing(false);
        setInsights([]);
    };
    
    useEffect(() => {
        if (isSharing && videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [isSharing, stream]);

    const handleAnalyzeFrame = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || isLoading) return;
        
        const selectedVacancy = vacancies.find(v => v.id === selectedVacancyId);
        if (!selectedVacancy) {
            setError("Пожалуйста, выберите вакансию для контекста.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not get canvas context");
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64ImageData = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];

            const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64ImageData } };
            const textPart = { text: `Ты — AI-ассистент рекрутера. Проанализируй этот скриншот и дай краткие, полезные подсказки. Учитывай, что сейчас я работаю над вакансией "${selectedVacancy.title}". Возможные задачи: анализ профиля кандидата, помощь в составлении письма, boolean search-запроса или оценка страницы. Будь кратким и давай действенные советы.` };

            const response = await generateContentWithFallback({
                contents: { parts: [textPart, imagePart] }
            });

            const newInsightText = response.text;
            const newInsight: Insight = { id: Date.now(), text: newInsightText };

            setInsights(prev => [newInsight, ...prev.slice(0, 4)]);
            speak(newInsightText);

        } catch (err: any) {
            console.error("Frame analysis error:", err);
            setError(`Ошибка анализа: ${err.message}`);
        } finally {
            setIsLoading(false);
        }

    }, [isLoading, selectedVacancyId, vacancies, isVoiceEnabled]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);


    if (!isSharing) {
        return (
            <div className="p-4 sm:p-8 h-full overflow-y-auto flex flex-col items-center justify-center text-center">
                <Monitor className="w-20 h-20 mx-auto text-blue-600 dark:text-blue-400 mb-4"/>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Экранный Ассистент</h2>
                <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Получайте подсказки от ИИ в реальном времени, анализируя содержимое вашего экрана. Идеально для сорсинга и анализа профилей.</p>
                <div className="w-full max-w-md mx-auto mt-8 space-y-4">
                    <div>
                        <label htmlFor="vacancy-select-copilot" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Выберите вакансию для контекста</label>
                        <select
                            id="vacancy-select-copilot"
                            value={selectedVacancyId}
                            onChange={(e) => setSelectedVacancyId(e.target.value)}
                            className="w-full p-3 bg-white/40 border border-white/50 rounded-lg text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={vacancies.length === 0}
                        >
                            {vacancies.length > 0 ? (
                                vacancies.map(v => <option key={v.id} value={v.id}>{v.title}</option>)
                            ) : (
                                <option>Сначала добавьте вакансии</option>
                            )}
                        </select>
                    </div>
                    <button
                        onClick={handleStartSharing}
                        disabled={!selectedVacancyId}
                        className="w-full inline-flex items-center justify-center gap-3 px-8 py-3 bg-blue-600 text-white font-bold rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50 disabled:bg-blue-500 disabled:opacity-70 disabled:scale-100"
                    >
                        Начать демонстрацию экрана
                    </button>
                    {error && <p className="text-red-600 dark:text-red-400 mt-4">{error}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 h-full flex flex-col gap-4 overflow-hidden">
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className="flex-shrink-0 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <h3 className="font-bold text-slate-700 dark:text-slate-300 text-lg">Экран активен</h3>
                </div>
                 <div className="flex items-center gap-2">
                    <button onClick={() => setIsVoiceEnabled(p => !p)} title={isVoiceEnabled ? "Выключить голос" : "Включить голос"} className={`p-2 rounded-full transition-colors ${isVoiceEnabled ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'hover:bg-slate-500/10 text-slate-500 dark:text-slate-400'}`}>
                        {isVoiceEnabled ? <Volume2 className="w-5 h-5"/> : <VolumeX className="w-5 h-5"/>}
                    </button>
                    <button onClick={handleStopSharing} className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">
                        <VideoOff className="w-5 h-5"/>
                        <span>Остановить</span>
                    </button>
                 </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-grow min-h-0">
                <div className="lg:col-span-1 flex flex-col gap-4">
                     <div className="bg-white/50 dark:bg-slate-700/50 p-4 rounded-xl shadow-inner flex-grow flex flex-col">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3 flex-shrink-0">Подсказки Ассистента</h4>
                        <div className="flex-grow space-y-3 overflow-y-auto pr-2">
                            {isLoading && (
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span>Анализ...</span>
                                </div>
                            )}
                            {insights.length === 0 && !isLoading && <p className="text-sm text-slate-500 text-center pt-8">Нажмите "Анализировать", чтобы получить первую подсказку.</p>}
                            {insights.map(insight => (
                                 <div key={insight.id} className="p-3 rounded-lg bg-blue-500/10 text-blue-900 dark:text-blue-200 border border-blue-500/20 animate-fade-in-up">
                                    <p className="text-sm font-medium whitespace-pre-wrap">{insight.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                     <button
                        onClick={handleAnalyzeFrame}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg disabled:bg-blue-500 disabled:opacity-70"
                    >
                        <Sparkles className="w-6 h-6"/>
                        Анализировать
                    </button>
                </div>

                <div className="lg:col-span-2 bg-black rounded-xl overflow-hidden shadow-lg">
                    <video ref={videoRef} autoPlay muted className="w-full h-full object-contain"></video>
                </div>
            </div>
             {error && <p className="text-red-600 dark:text-red-400 mt-2 text-center flex-shrink-0">{error}</p>}
        </div>
    );
};

export default ScreenCopilot;