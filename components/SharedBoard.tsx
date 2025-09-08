import React, { useState, useRef, useEffect } from 'react';
import { WidgetLink } from '../types';
import { Link, PlusCircle, Trash2, X, Palette } from './icons/Icons';

// --- Color definitions ---
const colorMap: Record<string, { bg: string, border: string, hoverBorder: string }> = {
  default: { bg: 'bg-white/60 dark:bg-slate-700/40', border: 'border-white/50 dark:border-slate-600/50', hoverBorder: 'hover:border-blue-500 dark:hover:border-blue-400' },
  blue: { bg: 'bg-blue-500/10 dark:bg-blue-900/40', border: 'border-blue-500/20 dark:border-blue-500/40', hoverBorder: 'hover:border-blue-500' },
  green: { bg: 'bg-green-500/10 dark:bg-green-900/40', border: 'border-green-500/20 dark:border-green-500/40', hoverBorder: 'hover:border-green-500' },
  yellow: { bg: 'bg-yellow-500/10 dark:bg-yellow-900/40', border: 'border-yellow-500/20 dark:border-yellow-500/40', hoverBorder: 'hover:border-yellow-500' },
  red: { bg: 'bg-red-500/10 dark:bg-red-900/40', border: 'border-red-500/20 dark:border-red-500/40', hoverBorder: 'hover:border-red-500' },
  purple: { bg: 'bg-purple-500/10 dark:bg-purple-900/40', border: 'border-purple-500/20 dark:border-purple-500/40', hoverBorder: 'hover:border-purple-500' },
};
const colorPickerColors = Object.keys(colorMap);

// --- Widget Modal (local component) ---
const WidgetModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { url: string, title: string }) => void;
}> = ({ isOpen, onClose, onSave }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!title.trim() || !url.trim()) {
      setError('Пожалуйста, заполните оба поля.');
      return;
    }
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
    }
    try {
      new URL(finalUrl); // Validate URL
    } catch (_) {
      setError('Пожалуйста, введите корректный URL-адрес.');
      return;
    }
    onSave({ url: finalUrl, title: title.trim() });
    setError('');
    setTitle('');
    setUrl('');
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="relative aurora-panel w-full max-w-md rounded-3xl shadow-2xl p-8 animate-zoom-in text-slate-800 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Добавить ссылку</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="widget-title" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Название</label>
            <input id="widget-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="LinkedIn" className="w-full bg-slate-200/50 dark:bg-white/10 border border-slate-300 dark:border-white/30 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <div>
            <label htmlFor="widget-url" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">URL</label>
            <input id="widget-url" type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://linkedin.com" className="w-full bg-slate-200/50 dark:bg-white/10 border border-slate-300 dark:border-white/30 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
        </div>
        {error && <p className="text-sm text-red-500 dark:text-red-400 mt-4 text-center">{error}</p>}
        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-slate-200/50 dark:bg-white/10 text-slate-700 dark:text-gray-200 rounded-lg hover:bg-slate-300/50 dark:hover:bg-white/20 transition-colors">Отмена</button>
          <button onClick={handleSave} className="px-4 py-2 text-white rounded-lg font-semibold aurora-button-primary">Сохранить</button>
        </div>
      </div>
    </div>
  );
};


// --- Widget Card (local component) ---
const WidgetCard: React.FC<{
  widget: WidgetLink;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
}> = ({ widget, onDelete, onColorChange }) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setIsColorPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedColor = colorMap[widget.color || 'default'];

  return (
    <div className="relative group">
       <a
        href={widget.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`aurora-card block p-4 rounded-xl shadow-lg border transition-all duration-300 hover:-translate-y-1 ${selectedColor.bg} ${selectedColor.border} ${selectedColor.hoverBorder}`}
      >
        <div className="flex items-center gap-4">
          <img src={widget.iconUrl} alt={`${widget.title} favicon`} className="w-10 h-10 rounded-lg object-contain flex-shrink-0" />
          <div className="overflow-hidden">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 truncate">{widget.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{widget.url}</p>
          </div>
        </div>
      </a>
      {/* Action buttons */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsColorPickerOpen(prev => !prev); }}
          className="p-1.5 rounded-full bg-slate-300/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-400/50 hover:text-blue-500"
          title="Изменить цвет"
        >
          <Palette className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(widget.id); }}
          className="p-1.5 rounded-full bg-slate-300/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-red-500/20 hover:text-red-500"
          title="Удалить"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Color Picker Popover */}
      {isColorPickerOpen && (
        <div
          ref={colorPickerRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-10 right-2 z-10 p-2 bg-white/80 dark:bg-slate-800/90 backdrop-blur-md border border-slate-300/50 dark:border-slate-600/50 rounded-lg shadow-lg flex gap-2"
        >
          {colorPickerColors.map(color => (
            <button
              key={color}
              onClick={() => {
                onColorChange(widget.id, color);
                setIsColorPickerOpen(false);
              }}
              className={`w-6 h-6 rounded-full border-2 ${colorMap[color].bg} ${(widget.color === color || (!widget.color && color === 'default')) ? 'border-blue-500' : 'border-transparent'}`}
              title={color}
            />
          ))}
        </div>
      )}
    </div>
  );
};


// --- Add Widget Card (local component) ---
const AddWidgetCard: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button onClick={onClick} className="group flex items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-400/70 dark:border-slate-600/70 bg-transparent hover:bg-slate-300/30 dark:hover:bg-slate-700/30 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300">
      <div className="text-center text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        <PlusCircle className="w-10 h-10 mx-auto" />
        <p className="mt-2 font-semibold">Добавить ссылку</p>
      </div>
    </button>
  );
};


interface SharedBoardProps {
    widgets: WidgetLink[];
    onSave: (widgets: WidgetLink[]) => void;
}

const SharedBoard: React.FC<SharedBoardProps> = ({ widgets, onSave }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleAddWidget = ({ url, title }: { url: string, title: string }) => {
        try {
            const hostname = new URL(url).hostname;
            const newWidget: WidgetLink = {
                id: Date.now().toString(),
                url: url,
                title: title,
                iconUrl: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
            };
            onSave([...widgets, newWidget]);
            setIsModalOpen(false);
        } catch (e) {
            console.error("Invalid URL provided for widget", e);
            // Error is handled inside the modal
        }
    };
    
    const handleDeleteWidget = (id: string) => {
        onSave(widgets.filter(w => w.id !== id));
    };

    const handleColorChange = (id: string, color: string) => {
        const updatedWidgets = widgets.map(w =>
            w.id === id ? { ...w, color: color === 'default' ? undefined : color } : w
        );
        onSave(updatedWidgets);
    };

    return (
        <div className="bg-white/40 dark:bg-slate-800/20 p-6 rounded-2xl shadow-md flex flex-col min-h-0">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2 flex-shrink-0">
                <Link />Закрепленные ссылки
            </h3>
            <div className="flex-grow overflow-y-auto pr-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {widgets.map(widget => (
                        <WidgetCard 
                            key={widget.id} 
                            widget={widget} 
                            onDelete={handleDeleteWidget} 
                            onColorChange={handleColorChange}
                        />
                    ))}
                    <AddWidgetCard onClick={() => setIsModalOpen(true)} />
                </div>
            </div>
            {isModalOpen && <WidgetModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleAddWidget} />}
        </div>
    );
};

export default SharedBoard;