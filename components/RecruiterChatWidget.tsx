import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { ResponsiveContainer, PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { Vacancy } from '../types';
import { BotMessageSquare, UserCircle, Send, Paperclip, X, Mic, Volume2, VolumeX } from './icons/Icons';

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}


interface ChartData {
  type: 'bar' | 'pie';
  data: { name: string; value: number }[];
}

interface Message {
  role: 'user' | 'model';
  text: string;
  imagePreview?: string;
  chartData?: ChartData | null;
  sources?: { uri: string; title: string }[];
}

interface RecruiterChatWidgetProps {
  vacancies: Vacancy[];
}

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


const ChartComponent: React.FC<{ data: ChartData }> = ({ data }) => {
    if (!data || !data.data) return null;
  
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#a4de6c', '#d0ed57', '#ffc658'];
  
    switch (data.type) {
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                {data.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8">
                   {data.data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return <div className="text-red-500">Неподдерживаемый тип графика: {data.type}</div>;
    }
};


const RecruiterChatWidget: React.FC<RecruiterChatWidgetProps> = ({ vacancies }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isAudioOutputEnabled, setIsAudioOutputEnabled] = useState(true);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effect for setting up the chat instance
  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const vacanciesSummary = vacancies.map(v => ({ 
        title: v.title, 
        priority: v.priority, 
        candidatesCount: v.resumes?.length || 0,
        startDate: v.startDate
    })).slice(0, 15); // Limit context size for performance

    const systemInstruction = `Ты — Мэтью, дружелюбный и высокоэффективный AI-ассистент для рекрутера. Твоя задача — помогать в поиске, анализе и управлении кандидатами и вакансиями.
1.  Будь кратким, вежливым и всегда по делу.
2.  Используй предоставленные данные для ответов на вопросы о текущих вакансиях.
3.  Если пользователь загружает изображение, проанализируй его вместе с текстовым запросом.
4.  ВАЖНО: Если пользователь просит тебя построить график, диаграмму, отчет или визуализировать данные, ТЫ ДОЛЖЕН ответить ТОЛЬКО JSON-объектом в следующем формате, без какого-либо дополнительного текста, объяснений или markdown:
    {"chart": {"type": "pie" | "bar", "data": [{"name": string, "value": number}]}}
5.  Ты можешь использовать Google Поиск для ответа на вопросы, требующие актуальной информации из интернета (например, "тенденции рынка труда").

Вот текущие данные по вакансиям в системе:
${JSON.stringify(vacanciesSummary, null, 2)}
`;

    const newChat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction,
        temperature: 0.7,
        tools: [{googleSearch: {}}],
      },
    });
    setChat(newChat);
    setMessages([{
        role: 'model',
        text: "Привет! Я Мэтью, ваш AI-ассистент. Чем могу помочь сегодня? Вы можете задать вопрос о вакансиях, попросить построить отчет или загрузить изображение для анализа.",
    }]);
  }, [vacancies]);

  // Effect for Speech Recognition and Synthesis setup
  useEffect(() => {
    // --- Speech Recognition ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'ru-RU';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(prev => (prev ? prev + ' ' : '') + transcript);
      };
      recognitionRef.current = recognition;
    } else {
      console.warn("Speech Recognition not supported by this browser.");
    }

    // --- Speech Synthesis ---
    const handleVoicesChanged = () => {
        // Pre-warm voices list
        window.speechSynthesis.getVoices();
    };
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
    }
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileToUpload(file);
      const previewUrl = URL.createObjectURL(file);
      setFilePreview(previewUrl);
    }
  };

  const removeFile = () => {
    if (filePreview) {
        URL.revokeObjectURL(filePreview);
    }
    setFileToUpload(null);
    setFilePreview(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };
  
  const speak = (text: string) => {
    if (!isAudioOutputEnabled || !text.trim() || !('speechSynthesis' in window)) {
        return;
    }
    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = window.speechSynthesis.getVoices();
    // Voices can load asynchronously. If they are not ready, we can't select one.
    // The utterance will use the default voice for the language if we set the lang property.
    if (voices.length === 0) {
        utterance.lang = 'ru-RU';
    } else {
        let selectedVoice: SpeechSynthesisVoice | null = null;
        const russianVoices = voices.filter(voice => voice.lang === 'ru-RU');

        // 1. Prioritize specific, high-quality male voices by name.
        const preferredMaleNames = ['Google русский', 'Yuri', 'Dmitry'];
        selectedVoice = russianVoices.find(voice => 
            preferredMaleNames.some(name => voice.name.toLowerCase().includes(name.toLowerCase()))
        ) || null;

        // 2. If not found, look for any other Russian voice that is not local (often higher quality cloud voices).
        if (!selectedVoice) {
            selectedVoice = russianVoices.find(voice => !voice.localService) || null;
        }

        // 3. As a fallback, use the first available Russian voice.
        if (!selectedVoice && russianVoices.length > 0) {
            selectedVoice = russianVoices[0];
        }
        
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        } else {
            // If no Russian voice is found at all, at least set the language
            // so the system can try to find a suitable default.
            utterance.lang = 'ru-RU';
        }
    }
    
    // Adjust pitch and rate for a more natural, male-sounding voice.
    utterance.pitch = 0.9; // Slightly lower pitch (0 to 2)
    utterance.rate = 1; // Normal speed (0.1 to 10)

    window.speechSynthesis.speak(utterance);
  };

  const handleToggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() && !fileToUpload) return;
    if (isListening) {
        recognitionRef.current?.stop();
    }

    setIsLoading(true);
    const userMessageText = userInput;
    const imagePreviewUrl = filePreview || undefined;

    setMessages(prev => [...prev, { role: 'user', text: userMessageText, imagePreview: imagePreviewUrl }]);
    setUserInput('');
    removeFile();
    
    const parts: any[] = [{ text: userMessageText }];
    if (fileToUpload) {
        try {
            const imagePart = await fileToGenerativePart(fileToUpload);
            parts.push(imagePart);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', text: 'Не удалось обработать изображение.' }]);
            setIsLoading(false);
            return;
        }
    }

    if (chat) {
      try {
        const stream = await chat.sendMessageStream({ message: parts });
        
        setMessages(prev => [...prev, { role: 'model', text: '' }]);

        let fullResponseText = '';
        let finalChunk: GenerateContentResponse | null = null;
        for await (const chunk of stream) {
          const chunkText = chunk.text;
          fullResponseText += chunkText;
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'model') {
              lastMessage.text += chunkText;
            }
            return newMessages;
          });
          finalChunk = chunk;
        }
        
        const groundingChunks = finalChunk?.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const sources = groundingChunks
            ?.map((chunk: any) => ({
                uri: chunk.web.uri,
                title: chunk.web.title,
            }))
            .filter((s: any) => s.uri);

        let isChartResponse = false;
        try {
            const cleanedResponse = fullResponseText.replace(/```json\n?|\n?```/g, '').trim();
            const parsedJson = JSON.parse(cleanedResponse);

            if (parsedJson.chart && (parsedJson.chart.type === 'pie' || parsedJson.chart.type === 'bar') && Array.isArray(parsedJson.chart.data)) {
                 isChartResponse = true;
                 setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'model') {
                        lastMessage.text = ''; // Clear raw JSON text
                        lastMessage.chartData = parsedJson.chart;
                    }
                    return newMessages;
                });
            }
        } catch (e) {
            // Not a valid JSON or not a chart object, the streamed text is fine as is.
        }
        
        if (!isChartResponse) {
            speak(fullResponseText);
        }

        if (sources && sources.length > 0) {
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.role === 'model') {
                    lastMessage.sources = sources;
                }
                return newMessages;
            });
        }

      } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, { role: 'model', text: 'Произошла ошибка. Попробуйте еще раз.' }]);
      }
    }
    setIsLoading(false);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent">
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && <BotMessageSquare className="w-8 h-8 text-slate-700 flex-shrink-0 mt-1" />}
            <div className={`p-3 rounded-2xl max-w-xs md:max-w-md ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white/70 text-slate-800 rounded-bl-none'}`}>
              {msg.imagePreview && <img src={msg.imagePreview} alt="upload preview" className="rounded-lg mb-2 max-h-40" />}
              {msg.chartData ? (
                 <div className="w-80 h-64 my-2">
                    <ChartComponent data={msg.chartData} />
                 </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
              )}
               {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-400/30">
                  <h4 className="text-xs font-bold text-slate-600 mb-1">Источники:</h4>
                  <ul className="space-y-1 text-xs">
                    {msg.sources.map((source, i) => (
                      <li key={i} className="truncate">
                        <a 
                          href={source.uri} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-700 hover:underline"
                          title={source.title || source.uri}
                        >
                          {i+1}. {source.title || new URL(source.uri).hostname}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {msg.role === 'user' && <UserCircle className="w-8 h-8 text-slate-500 flex-shrink-0 mt-1" />}
          </div>
        ))}
        {isLoading && (
            <div className="flex items-start gap-3">
                <BotMessageSquare className="w-8 h-8 text-slate-700 flex-shrink-0 mt-1" />
                <div className="p-3 rounded-2xl bg-white/70">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-white/30 bg-white/20">
        {filePreview && (
          <div className="relative p-2 mb-2 bg-white/50 rounded-lg flex items-center gap-2">
              <img src={filePreview} alt="Preview" className="w-10 h-10 rounded object-cover" />
              <p className="text-xs text-slate-600 truncate flex-grow">{fileToUpload?.name}</p>
              <button onClick={removeFile} className="p-1 rounded-full text-slate-500 hover:bg-red-500/20 hover:text-red-600 transition-colors">
                  <X className="w-4 h-4"/>
              </button>
          </div>
        )}
        <div className="flex items-end gap-2">
            <button
                onClick={() => setIsAudioOutputEnabled(prev => !prev)}
                className="p-2 text-slate-600 hover:text-slate-900 rounded-full hover:bg-white/50 transition-colors flex-shrink-0"
                title={isAudioOutputEnabled ? "Выключить озвучивание" : "Включить озвучивание"}
            >
                {isAudioOutputEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" id="chat-file-upload"/>
            <label htmlFor="chat-file-upload" className="p-2 text-slate-600 hover:text-slate-900 rounded-full hover:bg-white/50 cursor-pointer transition-colors flex-shrink-0">
                <Paperclip className="w-5 h-5"/>
            </label>
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isListening ? "Слушаю..." : "Спросите что-нибудь..."}
            className="w-full bg-white/50 rounded-lg p-2 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={1}
            style={{ resize: 'none' }}
          />
           <button 
            onClick={handleToggleListening} 
            className={`p-2 rounded-full hover:bg-white/50 cursor-pointer transition-colors flex-shrink-0 ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-600 hover:text-slate-900'}`}
            title="Голосовой ввод"
            disabled={!recognitionRef.current}
            >
            <Mic className="w-5 h-5"/>
        </button>
          <button
            onClick={handleSendMessage}
            disabled={isLoading || (!userInput.trim() && !fileToUpload)}
            className="p-2 bg-blue-600 text-white rounded-full disabled:bg-blue-400 hover:bg-blue-700 transition-colors flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecruiterChatWidget;