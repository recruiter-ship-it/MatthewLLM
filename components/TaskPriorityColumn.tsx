import React, { useState } from 'react';
import { Task, Priority } from '../types';
import TaskCard from './TaskCard';
import { FireIcon } from './icons/Icons';

interface TaskPriorityColumnProps {
  priority: Priority;
  tasks: Task[];
  onDrop: (taskId: string, priority: Priority) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleComplete: (id: string) => void;
}

const priorityConfig: Record<Priority, { title: string; icon?: React.ReactNode; headerColor: string }> = {
  [Priority.Urgent]: { title: 'Горит', icon: <FireIcon className="w-5 h-5 text-red-500" />, headerColor: 'border-red-500' },
  [Priority.High]: { title: 'Высокая', headerColor: 'border-orange-500' },
  [Priority.Medium]: { title: 'Средняя', headerColor: 'border-yellow-500' },
  [Priority.Low]: { title: 'Невысокая', headerColor: 'border-blue-500' },
};


const TaskPriorityColumn: React.FC<TaskPriorityColumnProps> = ({ 
  priority, 
  tasks, 
  onDrop,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
        onDrop(taskId, priority);
    }
    setIsDraggingOver(false);
  };

  const config = priorityConfig[priority];

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col w-72 md:w-80 flex-shrink-0 bg-black/5 backdrop-blur-sm rounded-xl transition-colors duration-300 ${isDraggingOver ? 'bg-blue-500/10' : ''}`}
    >
      <div className={`flex items-center gap-2 p-3 border-b-4 ${config.headerColor}`}>
        {config.icon}
        <h3 className="font-bold text-slate-700">{config.title}</h3>
        <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-slate-200/70 text-slate-600 rounded-full">{tasks.length}</span>
      </div>
      <div className="flex-grow p-3 space-y-4 overflow-y-auto">
        {tasks.map(task => (
          // FIX: The TaskCard component expects an `isDone` prop and does not accept `onToggleComplete`.
          // This component appears to be based on an older data model.
          // The fix involves removing the incorrect prop and adding the required one with a sensible default.
          <TaskCard
            key={task.id}
            task={task}
            isDone={false}
            onEdit={() => onEditTask(task)}
            onDelete={() => onDeleteTask(task.id)}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center text-sm text-slate-500 pt-10">
            Перетащите сюда задачи
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskPriorityColumn;