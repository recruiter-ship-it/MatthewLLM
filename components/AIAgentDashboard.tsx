import React from 'react';
import { Cpu } from './icons/Icons';

const AIAgentDashboard: React.FC<{ vacancies: any[] }> = () => {
  return (
    <>
      <div className="p-4 sm:p-8 h-full flex flex-col items-center justify-center text-center">
        <Cpu className="w-24 h-24 text-blue-500 dark:text-blue-400 mb-6" />
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200">AI Агент теперь работает в браузере!</h2>
        <p className="mt-4 max-w-2xl text-slate-600 dark:text-slate-400">
          Мы перенесли всю мощь AI-агента в наше новое браузерное расширение. Теперь он может не просто давать советы, а выполнять реальные действия прямо на страницах LinkedIn, hh.ru и других сайтах.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <a
            href="https://drive.google.com/file/d/1_Cu0hqA3n8sN5qHOjvjzVjy4cbQHA07x/view?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="aurora-button-primary inline-flex items-center justify-center gap-3 px-8 py-4 text-white font-bold rounded-lg transition-transform transform hover:scale-105"
          >
            Установить расширение
          </a>
        </div>
      </div>
    </>
  );
};

export default AIAgentDashboard;
