
import React, { useState, useEffect } from 'react';
import { Task, Priority } from '../types';
import { X } from './icons/Icons';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id' | 'isCompleted'> & { id?: string }) => void;
  task: Task | null;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, task }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.Medium);
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority || Priority.Medium);
      setDueDate(task.dueDate?.split('T')[0] || '');
    } else {
      // Reset form for new task
      setTitle('');
      setDescription('');
      setPriority(Priority.Medium);
      setDueDate('');
    }
    setError('');
  }, [task, isOpen]);

  const handleSave = () => {
    if (!title) {
      setError('Пожалуйста, введите название задачи.');
      return;
    }
    onSave({
      id: task?.id,
      title,
      description,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="relative bg-gray-800/20 backdrop-blur-2xl border border-white/20 w-full max-w-lg rounded-3xl shadow-2xl p-8 animate-zoom-in text-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6">{task ? 'Редактировать задачу' : 'Новая задача'}</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="title-task" className="block text-sm font-medium text-gray-300 mb-1">Название задачи *</label>
            <input
              type="text" id="title-task" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/10 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label htmlFor="description-task" className="block text-sm font-medium text-gray-300 mb-1">Описание</label>
            <textarea
              id="description-task" value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-white/10 border border-white/30 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Приоритет *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.values(Priority).map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200 border-2 ${
                    priority === p ? 'border-blue-400 bg-blue-500/30' : 'border-transparent bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          
           <div>
              <label htmlFor="dueDate-task" className="block text-sm font-medium text-gray-300 mb-1">Срок выполнения</label>
              <input
                type="date" id="dueDate-task" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-white/10 border border-white/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                min={new Date().toISOString().split("T")[0]}
              />
          </div>

        </div>
        
        {error && <p className="text-sm text-red-400 mt-4 text-center">{error}</p>}

        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-white/10 text-gray-200 rounded-lg hover:bg-white/20 transition-colors">Отмена</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">Сохранить</button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
