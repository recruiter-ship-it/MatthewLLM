
import React from 'react';
import { Task, Priority } from '../types';
import { Plus } from './icons/Icons';
import TaskPriorityColumn from './TaskPriorityColumn';

interface TasksDashboardProps {
  tasks: Task[];
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onPriorityChange: (id: string, newPriority: Priority) => void;
  onToggleComplete: (id: string) => void;
}

const TasksDashboard: React.FC<TasksDashboardProps> = ({ 
  tasks, 
  onAddTask, 
  onEditTask, 
  onDeleteTask,
  onPriorityChange,
  onToggleComplete
}) => {
  const priorities = [Priority.Urgent, Priority.High, Priority.Medium, Priority.Low];

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Задачи</h2>
          <p className="mt-1 text-slate-600">Управляйте задачами и их приоритетами с помощью перетаскивания.</p>
        </div>
        <button
          onClick={onAddTask}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Plus className="w-5 h-5" />
          <span>Добавить задачу</span>
        </button>
      </div>

      <div className="flex-grow flex gap-6 overflow-x-auto pb-4">
        {priorities.map(priority => (
          <TaskPriorityColumn
            key={priority}
            priority={priority}
            tasks={tasks.filter(t => t.priority === priority)}
            onDrop={onPriorityChange}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onToggleComplete={onToggleComplete}
          />
        ))}
      </div>
       {tasks.length === 0 && (
          <div className="text-center py-16 flex-grow flex flex-col justify-center items-center">
            <p className="text-slate-500">У вас пока нет задач.</p>
            <p className="text-slate-500">Нажмите "Добавить", чтобы создать первую.</p>
          </div>
       )}
    </div>
  );
};

export default TasksDashboard;
