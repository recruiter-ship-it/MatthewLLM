import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { Vacancy } from '../types';
import { BotMessageSquare, UserCircle, Send } from './icons/Icons';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface RecruiterChatWidgetProps {
  vacancies: Vacancy[];
}

const RecruiterChatWidget: React.FC<RecruiterChatWidgetProps> = ({ vacancies }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize the chat on component mount
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const newChat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `Ты — «Мэтью рекрутер», дружелюбный и высококвалифицированный AI-помощник для IT-рекрутеров. Твоя главная задача — помогать пользователям во всех аспектах найма. Ты обладаешь глубокими знаниями в следующих областях:
- Сорсинг кандидатов (boolean/x-ray запросы, нестандартные каналы).
- Проведение собеседований (технических и поведенческих).
- Оценка hard и soft skills.
- Работа с возражениями кандидатов.
- Составление офферов.
- Адаптация новых сотрудников.
- Тренды рынка IT в СНГ и в мире.

ВАЖНАЯ НОВАЯ ВОЗМОЖНОСТЬ: Тебе будет предоставлен JSON с текущими вакансиями пользователя. Если пользователь задает вопрос, который может быть связан с этими данными (например, "сколько у меня вакансий?", "расскажи о вакансии Java-разработчика"), используй предоставленный JSON, чтобы дать точный ответ. Отвечай на основе данных, но формулируй ответ естественно. Не показывай пользователю сам JSON.

Отвечай на вопросы профессионально, но понятно и по-человечески. Используй маркированные списки для структурирования информации. Будь проактивным, предлагай дополнительные идеи. Всегда поддерживай позитивный и ободряющий тон.`,
      },
    });
    setChat(newChat);
    setMessages([{ role: 'model', text: 'Здравствуйте! Я ваш AI-ассистент по рекрутингу. Чем могу помочь сегодня?' }]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading || !chat) return;

    const userMessage: Message = { role: 'user', text: userInput.trim() };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const vacanciesContext = vacancies.length > 0
        ? `
КОНТЕКСТ: Вот текущий список вакансий пользователя в формате JSON. Используй его для ответа, если вопрос касается этих данных.
${JSON.stringify(vacancies.map(v => ({
    id: v.id,
    title: v.title,
    priority: v.priority,
    startDate: v.startDate,
    endDate: v.endDate,
    resumesCount: v.resumes?.length || 0,
})))}
`
        : 'КОНТЕКСТ: У пользователя пока нет активных вакансий.';

      const messageWithContext = `${vacanciesContext}\n\nВОПРОС ПОЛЬЗОВАТЕЛЯ: ${userMessage.text}`;

      const result = await chat.sendMessageStream({ message: messageWithContext });
      let currentModelResponse = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      
      for await (const chunk of result) {
        currentModelResponse += chunk.text;
        setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text = currentModelResponse;
            return newMessages;
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorText = error instanceof Error ? error.message : 'Произошла неизвестная ошибка.';
      setMessages(prev => {
        const newMessages = [...prev];
        // remove the empty placeholder message
        if (newMessages[newMessages.length - 1].text === '') {
            newMessages.pop();
        }
        return [...newMessages, { role: 'model', text: `К сожалению, произошла ошибка: ${errorText}` }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-transparent">
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'model' && <BotMessageSquare className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />}
              <div
                className={`max-w-[85%] rounded-xl px-4 py-2 text-sm leading-relaxed ${
                  msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white/70 text-slate-800 rounded-bl-none'
                }`}
                dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br />').replace(/\* \s*/g, '• ') }}
              >
              </div>
              {msg.role === 'user' && <UserCircle className="w-6 h-6 text-slate-600 flex-shrink-0 mt-1" />}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3 justify-start">
               <BotMessageSquare className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
               <div className="bg-white/70 rounded-xl px-4 py-3 rounded-bl-none">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span>
                  </div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        <footer className="p-4 border-t border-white/30 flex-shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Спросите что-нибудь..."
              className="flex-1 px-4 py-2 bg-white/40 text-slate-800 font-medium rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !userInput.trim()}
              className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:bg-blue-400"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </footer>
    </div>
  );
};

export default RecruiterChatWidget;
