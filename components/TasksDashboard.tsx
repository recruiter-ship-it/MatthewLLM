
import React, { useState } from 'react';
import { Task, KanbanColumn, KanbanSwimlane } from '../types';
import { Plus, ChevronDown } from './icons/Icons';
import TaskCard from './TaskCard';
import EditableTitle from './EditableTitle';

interface TasksDashboardProps {
  tasks: Task[];
  columns: KanbanColumn[];
  swimlanes: KanbanSwimlane[];
  collapsedSwimlanes: string[];
  onAddTask: (task: null, location: { columnId: string; swimlaneId: string; }) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onMoveTask: (taskId: string, newColumnId: string, newSwimlaneId: string, beforeTaskId: string | null) => void;
  onUpdateColumnTitle: (id: string, title: string) => void;
  onAddColumn: () => void;
  onUpdateSwimlaneTitle: (id: string, title: string) => void;
  onAddSwimlane: () => void;
  onToggleSwimlane: (id: string) => void;
}

const DropIndicator: React.FC = () => (
    <div className="relative h-px my-1 mx-1">
        <div className="absolute inset-0 bg-blue-500 rounded-full" />
    </div>
);


const TasksDashboard: React.FC<TasksDashboardProps> = ({ 
  tasks, columns, swimlanes, collapsedSwimlanes, onAddTask, onEditTask, onDeleteTask, onMoveTask,
  onUpdateColumnTitle, onAddColumn, onUpdateSwimlaneTitle, onAddSwimlane, onToggleSwimlane
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ colId: string; swimId: string; beforeTaskId: string | null; } | null>(null);

  const handleTaskDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('taskId', taskId);
    e.currentTarget.classList.add('opacity-50', 'scale-95', 'shadow-2xl');
    setDraggedTaskId(taskId);
  };
  
  const handleTaskDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50', 'scale-95', 'shadow-2xl');
    setDraggedTaskId(null);
    setDropIndicator(null);
  };

  const handleDragOverCell = (e: React.DragEvent<HTMLDivElement>, colId: string, swimId: string) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    const dropZone = e.currentTarget;
    const cards = [...dropZone.querySelectorAll('[data-task-id]')] as HTMLElement[];
    
    const closest = cards.reduce((acc, child) => {
        const box = child.getBoundingClientRect();
        const offset = e.clientY - (box.top + box.height / 2);
        if (offset < 0 && offset > acc.offset) {
            return { offset, element: child };
        } else {
            return acc;
        }
    }, { offset: Number.NEGATIVE_INFINITY, element: null as HTMLElement | null });

    const beforeTaskId = closest.element ? closest.element.dataset.taskId || null : null;
    
    const draggedTask = tasks.find(t => t.id === draggedTaskId);
    if (draggedTask) {
        if (draggedTask.id === beforeTaskId) {
            setDropIndicator(null);
            return;
        }

        if (draggedTask.columnId === colId && draggedTask.swimlaneId === swimId) {
            const tasksInCell = tasks.filter(t => t.columnId === colId && t.swimlaneId === swimId);
            const draggedIndex = tasksInCell.findIndex(t => t.id === draggedTaskId);
            const targetIndex = beforeTaskId ? tasksInCell.findIndex(t => t.id === beforeTaskId) : tasksInCell.length;
            
            if (targetIndex === draggedIndex || targetIndex === draggedIndex + 1) {
                setDropIndicator(null);
                return;
            }
        }
    }

    setDropIndicator({ colId, swimId, beforeTaskId });
  };


  const handleDrop = (e: React.DragEvent<HTMLDivElement>, colId: string, swimId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const beforeTaskId = dropIndicator ? dropIndicator.beforeTaskId : null;
    
    if (taskId) {
      onMoveTask(taskId, colId, swimId, beforeTaskId);
    }
    setDropIndicator(null);
    setDraggedTaskId(null);
  };
  
  const isDoneColumn = (columnId: string): boolean => {
    const column = columns.find(c => c.id === columnId);
    return column?.title.toLowerCase() === 'готово';
  };

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Задачи</h2>
          <p className="mt-1 text-slate-600">Ваша канбан-доска для управления задачами.</p>
        </div>
      </div>

      <div className="flex-grow overflow-auto pb-4">
        {/* Main Board Container */}
        <div className="space-y-6">
           {/* Column Headers for larger screens */}
           <div className="hidden lg:grid gap-4 items-center pl-4 pr-2" style={{ gridTemplateColumns: `200px repeat(${columns.length}, minmax(300px, 1fr)) 150px` }}>
              <div/>
              {columns.map(col => (
                <div key={col.id} className="p-2 font-bold text-slate-800 rounded-t-lg">
                    <EditableTitle initialValue={col.title} onSave={(newTitle) => onUpdateColumnTitle(col.id, newTitle)} />
                </div>
              ))}
               <button onClick={onAddColumn} className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-slate-200/70 text-slate-600 font-semibold rounded-lg hover:bg-slate-300/80 transition-colors">
                    <Plus className="w-4 h-4" /> Добавить
                </button>
            </div>


            {/* Swimlanes */}
            {swimlanes.map(swimlane => {
                const isCollapsed = collapsedSwimlanes.includes(swimlane.id);
                return (
                <div key={swimlane.id} className="lg:grid gap-4" style={{ gridTemplateColumns: `200px 1fr` }}>
                    {/* Swimlane Header */}
                    <div className="p-3 font-bold text-slate-800 rounded-l-lg flex items-center mb-2 lg:mb-0">
                         <button onClick={() => onToggleSwimlane(swimlane.id)} className="mr-2 p-1 rounded-full hover:bg-slate-500/10" aria-label={isCollapsed ? "Развернуть" : "Свернуть"}>
                            <ChevronDown className={`w-5 h-5 text-slate-600 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                        </button>
                        <EditableTitle initialValue={swimlane.title} onSave={(newTitle) => onUpdateSwimlaneTitle(swimlane.id, newTitle)} />
                    </div>

                    {/* Columns inside Swimlane (horizontally scrollable) */}
                    <div className={`flex gap-4 overflow-x-auto pb-3 transition-all duration-300 ${isCollapsed ? 'max-h-0 opacity-0 invisible' : 'max-h-[500px] opacity-100 visible'}`}>
                        {columns.map(col => {
                            const tasksInCell = tasks.filter(t => t.columnId === col.id && t.swimlaneId === swimlane.id);
                            return (
                                <div
                                    key={col.id}
                                    onDrop={(e) => handleDrop(e, col.id, swimlane.id)}
                                    onDragOver={(e) => handleDragOverCell(e, col.id, swimlane.id)}
                                    onDragLeave={() => setDropIndicator(null)}
                                    className={`p-2 space-y-0.5 bg-black/5 rounded-lg w-72 md:w-80 flex-shrink-0 min-h-[150px] transition-colors duration-300 ${draggedTaskId ? 'bg-slate-200/50' : ''}`}
                                >
                                    <div className="font-bold text-slate-700 text-sm px-1 lg:hidden">
                                    {col.title}
                                    </div>
                                    {tasksInCell.map(task => (
                                        <React.Fragment key={task.id}>
                                            {dropIndicator?.colId === col.id && dropIndicator?.swimId === swimlane.id && dropIndicator.beforeTaskId === task.id && (
                                                <DropIndicator />
                                            )}
                                            <TaskCard
                                                task={task}
                                                isDone={isDoneColumn(task.columnId)}
                                                onEdit={() => onEditTask(task)}
                                                onDelete={() => onDeleteTask(task.id)}
                                                onDragStart={(e) => handleTaskDragStart(e, task.id)}
                                                onDragEnd={handleTaskDragEnd}
                                            />
                                        </React.Fragment>
                                    ))}
                                    {dropIndicator?.colId === col.id && dropIndicator?.swimId === swimlane.id && dropIndicator.beforeTaskId === null && (
                                        <DropIndicator />
                                    )}
                                    <button
                                        onClick={() => onAddTask(null, {columnId: col.id, swimlaneId: swimlane.id})}
                                        className="w-full text-center text-sm py-1.5 text-slate-500 hover:bg-slate-500/20 hover:text-slate-700 rounded-md transition-colors"
                                    >
                                        + Добавить задачу
                                    </button>
                                </div>
                            )
                        })}
                         <div className="flex-shrink-0 w-36 lg:hidden">
                            <button onClick={onAddColumn} className="w-full h-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-slate-200/70 text-slate-600 font-semibold rounded-lg hover:bg-slate-300/80 transition-colors">
                                <Plus className="w-4 h-4" /> Колонка
                            </button>
                        </div>
                    </div>
                </div>
            )})}
            
            {/* Add Swimlane Button */}
            <div className="pt-4 max-w-sm">
                <button onClick={onAddSwimlane} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-slate-200/70 text-slate-600 font-semibold rounded-lg hover:bg-slate-300/80 transition-colors">
                    <Plus className="w-4 h-4" /> Добавить дорожку
                </button>
            </div>
        </div>

         {tasks.length === 0 && (
          <div className="text-center py-16 flex-grow flex flex-col justify-center items-center">
            <p className="text-slate-500">Начните работу с добавления дорожек и колонок.</p>
          </div>
       )}
      </div>
    </div>
  );
};

export default TasksDashboard;
