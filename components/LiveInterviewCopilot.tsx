
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import * as pdfjsLib from 'pdfjs-dist';
import { Vacancy } from '../types';
import { Mic, Sparkles, ThumbsUp, HelpCircle } from './icons/Icons';
import { FileUpload } from './FileUpload';

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

// --- Local Types ---
type InterviewState = 'setup' | 'recording' | 'processing';
type InsightType = 'suggestion' | 'match' | 'flag';

interface Insight {
    id: number;
    type: InsightType;
    content: string;
    isNew?: boolean;
}

// --- Helper Functions ---
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

const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
};


// --- Main Component ---
interface LiveInterviewCopilotProps {
    activeVacancy: Vacancy | null;
    onInterviewComplete: (interviewFile: File, resumeFile: File | null) => void;
    onCancel: () => void;
}

const LiveInterviewCopilot: React.FC<LiveInterviewCopilotProps> = ({ activeVacancy, onInterviewComplete, onCancel }) => {
    const [interviewState, setInterviewState] = useState<InterviewState>('setup');
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [insights, setInsights] = useState<Insight[]>([]);
    
    const recognitionRef = useRef<any>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const insightChatRef = useRef<Chat | null>(null);
    const fullTranscriptRef = useRef<string>('');
    const insightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const insightsContainerRef = useRef<HTMLDivElement>(null);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
    
    // Refs for Audio Visualizer
    const audioVisualizerRef = useRef<HTMLCanvasElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    
    useEffect(() => {
        if(insightsContainerRef.current) {
            insightsContainerRef.current.scrollTop = insightsContainerRef.current.scrollHeight;
        }
    }, [insights]);

    const setupRecognition = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setError("Speech Recognition API не поддерживается в вашем браузере.");
            return false;
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ru-RU';

        recognition.onresult = (event: any) => {
            let final = '';
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript + ' ';
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            if (final) {
                setTranscript(prev => prev + final);
            }
            setInterimTranscript(interim);
        };
        recognition.onerror = (event: any) => {
            console.error("SpeechRecognition error:", event.error);
            setError(`Ошибка распознавания: ${event.error}. Попробуйте говорить четче или проверьте микрофон.`);
            stopInterview();
        };
        recognitionRef.current = recognition;
        return true;
    }, []);
    
    const getInsights = useCallback(async () => {
        if (!insightChatRef.current) return;
        
        const currentTranscript = transcript;
        const newChunk = currentTranscript.substring(fullTranscriptRef.current.length);

        if (newChunk.trim().length < 25) return;
        fullTranscriptRef.current = currentTranscript;

        try {
            const response = await insightChatRef.current.sendMessage({ message: newChunk });
            const text = response.text.replace(/```json\n?|\n?```/g, '').trim();
            if (text) {
                const newInsight: Omit<Insight, 'id'> = JSON.parse(text);
                if (newInsight.content && newInsight.type) {
                    const newInsightItem: Insight = { ...newInsight, id: Date.now(), isNew: true };
                    setInsights(prev => [...prev.slice(-5), newInsightItem]);

                    setTimeout(() => {
                         setInsights(currentInsights => currentInsights.map(i => i.id === newInsightItem.id ? { ...i, isNew: false } : i));
                    }, 2000);
                }
            }
        } catch (e) {
            console.error("Insight generation error:", e);
        }

    }, [transcript]);
    
    const drawVisualizer = useCallback(() => {
        if (!analyserRef.current || !audioVisualizerRef.current) return;
        
        const canvas = audioVisualizerRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteTimeDomainData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        let sum = 0;
        for(let i = 0; i < bufferLength; i++) {
            sum += Math.abs(dataArray[i] - 128);
        }
        const average = sum / bufferLength;
        const normalized = (average / 128) * canvas.height;
        
        ctx.fillStyle = 'rgba(59, 130, 246, 0.6)'; // blue-500 with opacity
        ctx.fillRect(0, canvas.height - normalized, canvas.width, normalized);

        animationFrameRef.current = requestAnimationFrame(drawVisualizer);
    }, []);

    const startInterview = async () => {
        if (!activeVacancy) {
            setError("Пожалуйста, выберите вакансию для начала.");
            return;
        }
        if (!setupRecognition()) return;
        
        setError(null);
        setTranscript('');
        setInterimTranscript('');
        setInsights([]);
        setElapsedTime(0);
        fullTranscriptRef.current = '';
        audioChunksRef.current = [];

        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
        } catch (err) {
            setError("Доступ к микрофону не предоставлен. Пожалуйста, разрешите доступ в настройках браузера.");
            return;
        }
        
        // --- Setup Audio Visualizer ---
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        analyserRef.current = audioContext.createAnalyser();
        sourceRef.current = audioContext.createMediaStreamSource(stream);
        sourceRef.current.connect(analyserRef.current);
        drawVisualizer();

        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
        };
        mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const audioFile = new File([audioBlob], `interview-recording-${Date.now()}.webm`, { type: 'audio/webm' });
            onInterviewComplete(audioFile, resumeFile);
        };

        let resumeText = '';
        if(resumeFile) {
            resumeText = await extractTextFromPdf(resumeFile);
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const insightPrompt = `Ты — AI-ассистент на собеседовании. Тебе будут присылать фрагменты расшифровки разговора. Твоя задача — кратко отреагировать на ПОСЛЕДНЮЮ реплику. Ответ ДОЛЖЕН БЫТЬ в формате JSON: {"type": "suggestion" | "match" | "flag", "content": "..."}.
- type: 'suggestion' - предложи открытый поведенческий вопрос, чтобы глубже раскрыть последнюю реплику кандидата (например, "Расскажите о проекте, где вы...").
- type: 'match' - отметь совпадение навыка с вакансией.
- type: 'flag' - отметь неясность или потенциальный риск.
--- ВАКАНСИЯ ---
${activeVacancy.briefText}
${resumeText ? `--- РЕЗЮМЕ КАНДИДАТА ---\n${resumeText}` : ''}`;
        
        insightChatRef.current = ai.chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction: insightPrompt, temperature: 0.5 } });

        recognitionRef.current.start();
        mediaRecorderRef.current.start();
        setInterviewState('recording');
        insightTimeoutRef.current = setInterval(getInsights, 8000);
        timerIntervalRef.current = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    };

    const stopInterview = useCallback(() => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (insightTimeoutRef.current) clearInterval(insightTimeoutRef.current);
        if (recognitionRef.current) recognitionRef.current.stop();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
        }
        setInterviewState('processing');
    }, []);

    const getInsightIcon = (type: InsightType) => {
        const props = { className: "w-6 h-6 flex-shrink-0" };
        switch (type) {
            case 'suggestion': return <HelpCircle {...props} />;
            case 'match': return <ThumbsUp {...props} />;
            case 'flag': return <Sparkles {...props} />;
        }
    };
    
    const getInsightStyles = (type: InsightType) => {
        switch (type) {
            case 'suggestion': return 'bg-blue-500/10 text-blue-800 border-blue-500/20';
            case 'match': return 'bg-green-500/10 text-green-800 border-green-500/20';
            case 'flag': return 'bg-orange-500/10 text-orange-800 border-orange-500/20';
        }
    }
    
    useEffect(() => {
        return () => {
            // Full cleanup on unmount
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (insightTimeoutRef.current) clearInterval(insightTimeoutRef.current);
            if (recognitionRef.current) recognitionRef.current.abort();
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
             if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, []);

    // --- RENDER LOGIC ---

    if (interviewState === 'setup') {
        return (
            <div className="p-4 sm:p-8 h-full overflow-y-auto flex flex-col items-center justify-center text-center">
                <Mic className="w-16 h-16 mx-auto text-blue-600 mb-4"/>
                <h2 className="text-3xl font-bold text-slate-800">Live-Интервью Ассистент</h2>
                <p className="mt-2 text-slate-600 max-w-2xl mx-auto">Получайте подсказки в реальном времени и итоговую аналитику сразу после разговора.</p>
                <div className="w-full max-w-xl mx-auto mt-8 space-y-6">
                     <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
                        <p className="text-blue-800">Вакансия: <span className="font-bold">{activeVacancy?.title || 'Не выбрана'}</span></p>
                    </div>
                     <div>
                        <h3 className="font-semibold text-slate-700 mb-2">Загрузите резюме (опционально)</h3>
                        <FileUpload
                            title=""
                            files={resumeFile ? [resumeFile] : []}
                            setFiles={(files) => setResumeFile(files[0] || null)}
                            multiple={false}
                            accept=".pdf"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                         <button onClick={onCancel} className="flex-1 px-6 py-3 bg-white/50 text-slate-700 font-bold rounded-lg hover:bg-white/80 transition-colors">
                            Отмена
                        </button>
                        <button
                            onClick={startInterview}
                            disabled={!activeVacancy}
                            className="flex-1 inline-flex items-center justify-center gap-3 px-8 py-3 bg-blue-600 text-white font-bold rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50 disabled:bg-blue-500 disabled:opacity-70 disabled:scale-100 disabled:cursor-not-allowed"
                        >
                            Начать интервью
                        </button>
                    </div>
                    {error && <p className="text-red-600 mt-4">{error}</p>}
                </div>
            </div>
        );
    }
    
    if (interviewState === 'recording') {
        return (
            <div className="p-4 sm:p-6 h-full flex flex-col lg:flex-row gap-6 overflow-hidden">
                <style>{`
                    @keyframes pulse-red { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                    @keyframes new-insight-pulse {
                        0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
                        70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
                    }
                    .animate-new-insight {
                        animation: new-insight-pulse 1.5s ease-out;
                    }
                `}</style>
                <div className="flex-1 flex flex-col bg-white/50 p-4 rounded-xl shadow-inner min-h-0">
                    <div className="flex items-center justify-between gap-3 mb-3 flex-shrink-0">
                         <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-red-500 rounded-full" style={{ animation: 'pulse-red 2s infinite' }}></div>
                            <h3 className="font-bold text-slate-700 text-lg">Идет запись...</h3>
                            <canvas ref={audioVisualizerRef} width="80" height="24" className="ml-2"></canvas>
                            <div className="font-mono text-lg text-slate-700 font-semibold">{formatTime(elapsedTime)}</div>
                         </div>
                         <button onClick={stopInterview} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">
                            Завершить и анализировать
                        </button>
                    </div>
                    <div className="flex-grow bg-white/70 p-4 rounded-lg overflow-y-auto text-slate-800 text-lg leading-relaxed">
                        {transcript}
                        <span className="text-slate-500">{interimTranscript}</span>
                    </div>
                </div>
                <div className="lg:w-1/3 flex flex-col bg-white/50 p-4 rounded-xl shadow-inner min-h-0">
                     <h3 className="font-bold text-slate-700 text-lg mb-3 flex-shrink-0">Подсказки Ассистента</h3>
                     <div ref={insightsContainerRef} className="flex-grow space-y-3 overflow-y-auto pr-2">
                        {insights.map(insight => (
                             <div key={insight.id} className={`p-3 rounded-lg border flex gap-3 animate-fade-in-up ${getInsightStyles(insight.type)} ${insight.isNew ? 'animate-new-insight' : ''}`}>
                                {getInsightIcon(insight.type)}
                                <p className="text-sm font-medium">{insight.content}</p>
                            </div>
                        ))}
                     </div>
                </div>
            </div>
        );
    }

    if (interviewState === 'processing') {
         return (
            <div className="p-4 sm:p-8 h-full flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <h2 className="text-2xl font-bold text-slate-800 mt-6">Завершаем запись...</h2>
                <p className="text-slate-600 mt-2">Готовим файл для анализа. Сейчас вы вернетесь на главный экран.</p>
            </div>
        );
    }
    
    return <div>Неизвестное состояние</div>;
};

export default LiveInterviewCopilot;
