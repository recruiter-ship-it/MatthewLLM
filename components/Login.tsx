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
        <div className="p-8 bg-white/20 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/30">
          <div className="flex justify-center mb-6">
            <div className="text-3xl font-bold text-slate-800 tracking-tight">MatthewLM <span className="text-blue-600">)</span><sup className="text-xs font-medium text-blue-600 ml-1">Beta</sup></div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">{isRegister ? 'Регистрация' : 'Вход'}</h1>
          <p className="text-slate-600 mb-6">{isRegister ? 'Создайте аккаунт, чтобы начать' : 'Войдите, чтобы продолжить'}</p>
          
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
             {isRegister && (
              <div>
                <input
                  type="text"
                  placeholder="Ваше имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/40 text-slate-800 font-medium rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
              </div>
            )}
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/40 text-slate-800 font-medium rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/40 text-slate-800 font-medium rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>
            {error && <p className="text-xs text-red-500 text-left">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 focus:ring-blue-500 disabled:bg-blue-400 flex items-center justify-center"
            >
              {isLoading && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>}
              {isRegister ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </form>

          <p className="text-sm text-slate-600 mb-6">
            {isRegister ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}
            <button onClick={() => { setIsRegister(!isRegister); setError(null); }} className="font-semibold text-blue-600 hover:underline ml-1">
              {isRegister ? 'Войти' : 'Создать'}
            </button>
          </p>
          
          <button
            onClick={onGuestLogin}
            className="w-full px-4 py-3 bg-white/40 text-slate-800 font-bold rounded-lg hover:bg-white/60 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 focus:ring-blue-500"
          >
            Продолжить как гость
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;