import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { GoogleGenAI, Chat, Tool, Type, Part } from '@google/genai';
import { Vacancy, Recruiter } from '../types';
import { Send, Mic, Sparkles, Clipboard } from './icons/Icons';
import { generateContentWithFallback } from '../utils/gemini';
import { speak } from '../utils/tts';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const chatModel = 'gemini-2.5-flash';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  isStreaming?: boolean;
  isEmail?: boolean;
  sources?: { uri: string; title: string }[];
}

export interface ChatWidgetHandle {
    triggerVoiceInput: () => void;
}

interface RecruiterChatWidgetProps {
    vacancies: Vacancy[];
    activeRecruiter: Recruiter | null;
    activeVacancy: Vacancy | null;
    isVoiceEnabled: boolean;
}

const tools: Tool[] = [{
  functionDeclarations: [
    {
      name: "researchTopic",
      description: "Исследует заданную тему с помощью Google Поиска для ответа на вопросы о недавних событиях, тенденциях рынка или любой актуальной информации. Предоставляет резюме найденной информации.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: "Тема или вопрос для исследования."
          }
        },
        required: ["query"]
      }
    },
    {
      name: "openUrl",
      description: "Opens a specific URL in a new browser tab. The URL must be fully qualified, including http:// or https://.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          url: {
            type: Type.STRING,
            description: "The fully qualified URL to open."
          }
        },
        required: ["url"]
      }
    },
    {
        name: "generateEmail",
        description: "Generates an email for a candidate. Use this when the user asks to write, compose, or create a letter or email.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            candidateName: {
              type: Type.STRING,
              description: "The full name of the candidate."
            },
            emailType: {
              type: Type.STRING,
              description: "The type of email. Common types are 'welcome' (приветственное), 'rejection' (отказ), 'follow-up' (уточняющее)."
            },
            customNotes: {
              type: Type.STRING,
              description: "Any extra details or specific points the user wants to include."
            }
          },
          required: ["candidateName", "emailType"]
        }
      },
      {
        name: "searchCandidates",
        description: "Searches for candidates on specific recruiting platforms like LinkedIn or hh.ru.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                platform: {
                    type: Type.STRING,
                    description: "The platform to search on. Supported values: 'linkedin', 'hh'."
                },
                query: {
                    type: Type.STRING,
                    description: "The search query, e.g., 'Senior Java Developer Moscow'."
                }
            },
            required: ["platform", "query"]
        }
    }
  ]
}];


const RecruiterChatWidget = forwardRef<ChatWidgetHandle, RecruiterChatWidgetProps>(({ vacancies, activeRecruiter, activeVacancy, isVoiceEnabled }, ref) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [copiedEmailText, setCopiedEmailText] = useState<string | null>(null);
    
    const chatRef = useRef<Chat | null>(null);
    const recognitionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    // Initialize chat session
    useEffect(() => {
        const vacanciesInfo = vacancies.map(v => `- ${v.title} (Приоритет: ${v.priority})`).join('\n');
        const systemInstruction = `Ты — Мэтью, AI-ассистент для рекрутеров. 
        Ты дружелюбен, проактивен и очень полезен. 
        Текущий пользователь: ${activeRecruiter?.name}.
        Вот список текущих вакансий:
        ${vacanciesInfo || 'Нет активных вакансий.'}

        **Правила поведения:**
        1. **Приоритет - прямой ответ:** На общие вопросы (например, "какая средняя зарплата?") всегда старайся ответить сам, используя свои знания.
        2. **Используй инструменты, когда это нужно:** Если пользователь просит тебя выполнить действие (открыть сайт, исследовать тему, написать письмо, поискать кандидатов), используй свои инструменты.
           - Если ты знаешь точный адрес сайта (например, hh.ru, linkedin.com, docs.google.com), используй \`openUrl\`.
           - Если нужно найти актуальную информацию в интернете, провести исследование или ответить на сложный вопрос, требующий свежих данных, используй \`researchTopic\`.
           - Если просят написать письмо, используй \`generateEmail\`.
           - Если просят найти кандидатов на определенной платформе, используй \`searchCandidates\`.
        3. **Не отказывай, если можешь помочь:** Если пользователь просит открыть сервис, например "Google Документы", определи его URL (docs.google.com) и используй инструмент \`openUrl\`. Не говори, что не можешь открывать приложения.
        
        Отвечай кратко и по делу.`;


        chatRef.current = ai.chats.create({
            model: chatModel,
            config: { systemInstruction, tools },
        });

        const initialMessage = `Привет, ${activeRecruiter?.name}! Чем могу помочь? Я могу найти кандидатов, составить письмо или провести исследование на любую тему.`;
        setMessages([{ id: Date.now(), text: initialMessage, sender: 'bot' }]);
        const sayHi = async () => {
          await speak(initialMessage, isVoiceEnabled);
        }
        sayHi();

    }, [vacancies, activeRecruiter, isVoiceEnabled]);
    
    // Setup Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'ru-RU';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => console.error('Speech recognition error', event.error);

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
            handleSend(transcript);
        };

        recognitionRef.current = recognition;
    }, []);
    
    const triggerVoiceInput = () => {
        if (recognitionRef.current && !isListening) {
            recognitionRef.current.start();
        }
    };
    
    useImperativeHandle(ref, () => ({
        triggerVoiceInput
    }));

    const copyEmail = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedEmailText(text);
        setTimeout(() => setCopiedEmailText(null), 2000);
    };

    const handleGenerateEmail = async (args: any) => {
        const { candidateName, emailType, customNotes } = args;
        
        if (!activeVacancy) {
            const errorText = "Пожалуйста, выберите активную вакансию в шапке сайта, чтобы я мог составить релевантное письмо.";
            const errorMsg: Message = { id: Date.now(), text: errorText, sender: 'bot' };
            setMessages(prev => [...prev, errorMsg]);
            await speak(errorText, isVoiceEnabled);
            return;
        }

        const thinkingMsg: Message = { id: Date.now(), text: `Составляю письмо (тип: ${emailType}) для кандидата ${candidateName}...`, sender: 'bot', isStreaming: true };
        setMessages(prev => [...prev, thinkingMsg]);

        try {
            const prompt = `Ты — эксперт-рекрутер. Твоя задача — написать профессиональное и человечное письмо кандидату.

            **Тип письма:** ${emailType}
            **Имя кандидата:** ${candidateName}
            **Вакансия:** ${activeVacancy.title}

            **Контекст (бриф вакансии):**
            ---
            ${activeVacancy.briefText}
            ---
            ${customNotes ? `**Дополнительные заметки от пользователя:**\n${customNotes}` : ''}

            Напиши текст письма. Не добавляй тему письма (Subject). Будь вежлив и профессионален.`;

            const response = await generateContentWithFallback({ contents: prompt });
            const emailText = response.text;
            
            const emailMessage: Message = { id: thinkingMsg.id, text: emailText, sender: 'bot', isEmail: true };
            setMessages(prev => prev.map(m => m.id === thinkingMsg.id ? emailMessage : m));
            await speak(emailText, isVoiceEnabled);
        } catch (e: any) {
            console.error("Email generation error:", e);
            const errorText = `Не удалось сгенерировать письмо: ${e.message}`;
            const errorMsg: Message = { id: thinkingMsg.id, text: errorText, sender: 'bot' };
            setMessages(prev => prev.map(m => m.id === thinkingMsg.id ? errorMsg : m));
            await speak(errorText, isVoiceEnabled);
        }
    };

    const handleResearchTopic = async (args: any) => {
        const query = args.query as string;
        if (!query) return;

        const thinkingMsg: Message = { id: Date.now(), text: `Исследую тему: "${query}"...`, sender: 'bot', isStreaming: true };
        setMessages(prev => [...prev, thinkingMsg]);
        
        try {
            const response = await generateContentWithFallback({
                contents: query,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });

            const summary = response.text;
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            const fetchedSources = groundingChunks
                ?.map((chunk: any) => (chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : null))
                .filter((s: any): s is { uri: string; title: string } => s && s.uri && s.uri.trim() !== '');
            
            // Fix: Explicitly type the Map to aid TypeScript's type inference for uniqueSources.
            const uniqueSources = fetchedSources ? Array.from(new Map<string, { uri: string; title: string; }>(fetchedSources.map(item => [item.uri, item])).values()) : [];
            
            const resultMsg: Message = { id: thinkingMsg.id, text: summary, sender: 'bot', sources: uniqueSources.length > 0 ? uniqueSources : undefined };
            setMessages(prev => prev.map(m => m.id === thinkingMsg.id ? resultMsg : m));
            await speak(summary, isVoiceEnabled);

        } catch (e: any) {
            console.error("Research topic error:", e);
            const errorText = `Не удалось выполнить исследование: ${e.message}`;
            const errorMsg: Message = { id: thinkingMsg.id, text: errorText, sender: 'bot' };
            setMessages(prev => prev.map(m => m.id === thinkingMsg.id ? errorMsg : m));
            await speak(errorText, isVoiceEnabled);
        }
    };

    const handleFunctionCalls = async (functionCallParts: Part[]) => {
        for (const part of functionCallParts) {
            const { name, args } = part.functionCall!;
            if (name === 'openUrl' && args.url) {
                let url = args.url as string;
                if (!/^https?:\/\//i.test(url)) {
                    url = 'https://' + url;
                }
                window.open(url, '_blank', 'noopener,noreferrer');
            } else if (name === 'researchTopic' && args.query) {
                await handleResearchTopic(args);
            } else if (name === 'generateEmail') {
                await handleGenerateEmail(args);
            } else if (name === 'searchCandidates' && args.platform && args.query) {
                const platform = (args.platform as string).toLowerCase();
                const query = encodeURIComponent(args.query as string);
                let searchUrl = '';

                if (platform === 'linkedin') {
                    searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${query}&origin=GLOBAL_SEARCH_HEADER`;
                } else if (platform === 'hh') {
                    searchUrl = `https://hh.ru/search/resume?text=${query}`;
                }

                if (searchUrl) {
                    window.open(searchUrl, '_blank', 'noopener,noreferrer');
                    const confirmationText = `Выполняю поиск по запросу "${args.query}" на ${platform}...`;
                    const confirmationMessage: Message = { id: Date.now(), text: confirmationText, sender: 'bot' };
                    setMessages(prev => [...prev, confirmationMessage]);
                    await speak(confirmationText, isVoiceEnabled);
                }
            }
        }
    };

    const handleSend = async (messageText: string) => {
        const text = messageText.trim();
        if (!text || isLoading || !chatRef.current) return;

        setInput('');
        setIsLoading(true);

        const userMessage: Message = { id: Date.now(), text, sender: 'user' };
        const botMessageId = Date.now() + 1;
        const botMessage: Message = { id: botMessageId, text: '', sender: 'bot', isStreaming: true };
        setMessages(prev => [...prev, userMessage, botMessage]);

        try {
            const stream = await chatRef.current.sendMessageStream({ message: text });
            
            let accumulatedText = '';
            let functionCallParts: Part[] = [];

            for await (const chunk of stream) {
                if (chunk.text) {
                    accumulatedText += chunk.text;
                    setMessages(prev => prev.map(m => 
                        m.id === botMessageId ? { ...m, text: accumulatedText } : m
                    ));
                }
                const calls = chunk.candidates?.[0]?.content?.parts?.filter(part => !!part.functionCall);
                if (calls && calls.length > 0) {
                    functionCallParts.push(...calls);
                }
            }
            
            setMessages(prev => prev.map(m => 
                m.id === botMessageId ? { ...m, isStreaming: false } : m
            ));

            if (accumulatedText.trim()) {
                await speak(accumulatedText, isVoiceEnabled);
            }

            if (functionCallParts.length > 0) {
                await handleFunctionCalls(functionCallParts);
            }

        } catch (error) {
            console.error("Gemini chat error:", error);
            const errorText = 'Произошла ошибка. Попробуйте снова.';
            setMessages(prev => prev.map(m => 
                m.id === botMessageId ? { ...m, text: errorText, isStreaming: false } : m
            ));
            await speak(errorText, isVoiceEnabled);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSend(input);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'bot' && <Sparkles className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />}
                        <div className={`max-w-[85%] px-4 py-2 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-lg' : 'bg-white/70 dark:bg-slate-600/50 text-slate-800 dark:text-slate-200 rounded-bl-lg'}`}>
                           {msg.isEmail ? (
                               <div className="space-y-2">
                                   <div className="flex justify-between items-center gap-2">
                                       <h4 className="font-bold text-slate-800 dark:text-slate-200">Сгенерировано письмо:</h4>
                                       <button 
                                            onClick={() => copyEmail(msg.text)}
                                            className="flex items-center gap-1.5 text-xs px-2 py-1 bg-white/50 dark:bg-slate-700/60 rounded-md hover:bg-white/80 dark:hover:bg-slate-600/60 font-semibold"
                                        >
                                           <Clipboard className="w-3 h-3" />
                                           {copiedEmailText === msg.text ? 'Готово!' : 'Копировать'}
                                       </button>
                                   </div>
                                   <p className="whitespace-pre-wrap text-sm border-t border-slate-400/30 pt-2">{msg.text}</p>
                               </div>
                           ) : (
                               <p className="whitespace-pre-wrap">{msg.text}</p>
                           )}
                           {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-3 pt-2 border-t border-slate-400/30">
                                    <h5 className="text-xs font-semibold mb-1 text-slate-600 dark:text-slate-300">Источники:</h5>
                                    <ul className="space-y-1 text-xs">
                                        {msg.sources.map((source, index) => (
                                            <li key={index} className="truncate">
                                                <a 
                                                    href={source.uri} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-blue-700 dark:text-blue-400 hover:underline"
                                                    title={source.title || source.uri}
                                                >
                                                    {index + 1}. {source.title || new URL(source.uri).hostname}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                           {msg.isStreaming && !msg.isEmail && <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse inline-block ml-2"></div>}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-white/30 dark:border-slate-700/30 flex-shrink-0">
                <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
                    <button type="button" onClick={triggerVoiceInput} className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'hover:bg-slate-500/10'}`}>
                        <Mic className="w-6 h-6 text-slate-600 dark:text-slate-300"/>
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Найти Java-разработчика на hh.ru..."
                        disabled={isLoading}
                        className="flex-grow w-full px-4 py-2 bg-white/50 dark:bg-slate-700/50 border border-transparent rounded-full text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="submit" disabled={isLoading || !input} className="p-2 bg-blue-600 text-white rounded-full disabled:opacity-50 disabled:bg-blue-800">
                        <Send className="w-6 h-6"/>
                    </button>
                </form>
            </div>
        </div>
    );
});

export default RecruiterChatWidget;