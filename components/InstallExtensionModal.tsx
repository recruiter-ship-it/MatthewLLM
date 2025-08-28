
import React from 'react';
import { X } from './icons/Icons';

interface InstallExtensionModalProps {
  onClose: () => void;
}

const InstallExtensionModal: React.FC<InstallExtensionModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="relative bg-gray-800/20 backdrop-blur-2xl border border-white/20 w-full max-w-2xl rounded-3xl shadow-2xl p-8 animate-zoom-in text-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-4">Установка расширения</h2>
        <p className="text-gray-300 mb-6">Пока расширение не опубликовано в Chrome Web Store, вы можете установить его вручную в режиме разработчика, используя исходный код этого проекта.</p>

        <div className="space-y-4 text-gray-200">
            <div>
                <h3 className="font-semibold text-lg text-white mb-2">Шаг 1: Подготовьте файлы</h3>
                <p className="text-sm">Этот проект уже содержит все необходимые файлы. Главное, чтобы в корневой папке были <code>manifest.json</code>, <code>background.js</code> и другие служебные файлы.</p>
            </div>
            <div>
                <h3 className="font-semibold text-lg text-white mb-2">Шаг 2: Откройте страницу расширений</h3>
                <p className="text-sm">В браузере Chrome (или любом другом на основе Chromium) откройте новую вкладку и перейдите по адресу:</p>
                <code className="block bg-black/30 p-2 rounded-md text-sm text-yellow-300 mt-2">chrome://extensions</code>
            </div>
            <div>
                <h3 className="font-semibold text-lg text-white mb-2">Шаг 3: Включите режим разработчика</h3>
                <p className="text-sm">В правом верхнем углу страницы расширений найдите и активируйте переключатель «Режим разработчика».</p>
            </div>
            <div>
                <h3 className="font-semibold text-lg text-white mb-2">Шаг 4: Загрузите расширение</h3>
                <p className="text-sm">После включения режима разработчика появится новая панель. Нажмите на кнопку «Загрузить распакованное расширение».</p>
            </div>
            <div>
                <h3 className="font-semibold text-lg text-white mb-2">Шаг 5: Выберите папку проекта</h3>
                <p className="text-sm">В открывшемся окне выбора папки укажите путь к <strong>корневой директории этого проекта</strong> и нажмите «Выбрать».</p>
            </div>
        </div>

        <p className="mt-6 p-3 bg-blue-500/20 text-blue-200 border border-blue-400/50 rounded-lg text-sm">
          <strong>Готово!</strong> Иконка расширения появится на панели инструментов вашего браузера. Теперь вы можете открывать его боковую панель на страницах hh.ru и LinkedIn для анализа резюме.
        </p>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Понятно
          </button>
        </div>
      </div>
      <style>{`
        @keyframes zoom-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-zoom-in { animation: zoom-in 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default InstallExtensionModal;
