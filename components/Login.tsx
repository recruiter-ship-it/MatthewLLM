import React, { useState, FormEvent } from 'react';

interface LoginProps {
  onRegister: (name: string, email: string, password: string) => Promise<void>;
  onLocalLogin: (email: string, password: string) => Promise<void>;
  onGuestLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onRegister, onLocalLogin, onGuestLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      if (isRegister) {
        if (!name || !email || !password) {
          throw new Error('Пожалуйста, заполните все поля.');
        }
        await onRegister(name, email, password);
      } else {
        if (!email || !password) {
          throw new Error('Пожалуйста, введите email и пароль.');
        }
        await onLocalLogin(email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="p-8 rounded-3xl shadow-2xl aurora-panel">
          <div className="flex justify-center mb-6">
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">MatthewLM <span className="text-blue-600 dark:text-blue-400">)</span><sup className="text-xs font-medium text-blue-600 dark:text-blue-400 ml-1">Beta</sup></div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">{isRegister ? 'Регистрация' : 'Вход'}</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{isRegister ? 'Создайте аккаунт, чтобы начать' : 'Войдите, чтобы продолжить'}</p>
          
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
             {isRegister && (
              <div>
                <input
                  type="text"
                  placeholder="Ваше имя"
                  className="w-full px-4 py-2 bg-white/10 dark:bg-slate-700/50 border border-white/30 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isRegister}
                />
              </div>
            )}
            <div>
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-2 bg-white/10 dark:bg-slate-700/50 border border-white/30 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Пароль"
                className="w-full px-4 py-2 bg-white/10 dark:bg-slate-700/50 border border-white/30 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 text-white font-bold rounded-lg disabled:opacity-70 aurora-button-primary"
            >
              {isLoading ? (
                <div className="w-5 h-5 mx-auto border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (isRegister ? 'Зарегистрироваться' : 'Войти')}
            </button>
          </form>

          {error && <p className="text-red-500 dark:text-red-400 text-sm mb-4">{error}</p>}

          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isRegister ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(null); }}
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline ml-1"
            >
              {isRegister ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </p>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-300 dark:border-slate-600"></span>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white/50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 backdrop-blur-sm">или</span>
            </div>
          </div>
          
          <button
            onClick={onGuestLogin}
            className="w-full py-3 px-4 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Войти как гость
          </button>
        </div>
      </div>
    </div>
  );
};

// Fix: Added missing default export
export default Login;