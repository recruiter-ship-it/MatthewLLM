
import React, { useState } from 'react';
import { Task, KanbanColumn, KanbanSwimlane } from '../types';
import { Plus } from './icons/Icons';
import TaskCard from './TaskCard';
import EditableTitle from './EditableTitle';

interface TasksDashboardProps {
  tasks: Task[];
  columns: KanbanColumn[];
  swimlanes: KanbanSwimlane[];
  onAddTask: (task: null, location: { columnId: string; swimlaneId: string; }) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onMoveTask: (taskId: string, newColumnId: string, newSwimlaneId: string) => void;
  onUpdateColumnTitle: (id: string, title: string) => void;
  onAddColumn: () => void;
  onUpdateSwimlaneTitle: (id: string, title: string) => void;
  onAddSwimlane: () => void;
}

const TasksDashboard: React.FC<TasksDashboardProps> = ({ 
  tasks, columns, swimlanes, onAddTask, onEditTask, onDeleteTask, onMoveTask,
  onUpdateColumnTitle, onAddColumn, onUpdateSwimlaneTitle, onAddSwimlane
}) => {
  const [dragOverCell, setDragOverCell] = useState<{ col: string; swim: string } | null>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, colId: string, swimId: string) => {
    e.preventDefault();
    setDragOverCell({ col: colId, swim: swimId });
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, colId: string, swimId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onMoveTask(taskId, colId, swimId);
    }
    setDragOverCell(null);
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
        <div 
          className="inline-grid gap-4" 
          style={{ gridTemplateColumns: `minmax(150px, 1fr) repeat(${columns.length}, minmax(300px, 1fr)) minmax(150px, 1fr)` }}
        >
          {/* Top-left empty cell */}
          <div className="sticky top-0 z-10 bg-white/30 backdrop-blur-xl h-12" />

          {/* Column Headers */}
          {columns.map(col => (
            <div key={col.id} className="sticky top-0 z-10 bg-white/30 backdrop-blur-xl p-3 h-12 flex items-center font-bold text-slate-800 rounded-t-lg">
                <EditableTitle initialValue={col.title} onSave={(newTitle) => onUpdateColumnTitle(col.id, newTitle)} />
            </div>
          ))}
          <div className="sticky top-0 z-10 bg-white/30 backdrop-blur-xl h-12 p-2 flex items-center">
             <button onClick={onAddColumn} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-slate-200/70 text-slate-600 font-semibold rounded-lg hover:bg-slate-300/80 transition-colors">
                <Plus className="w-4 h-4" /> Добавить
            </button>
          </div>
          

          {/* Swimlanes Rows */}
          {swimlanes.map(swimlane => (
            <React.Fragment key={swimlane.id}>
              {/* Swimlane Header */}
              <div className="sticky left-0 bg-white/30 backdrop-blur-xl p-3 font-bold text-slate-800 rounded-l-lg flex items-center">
                  <EditableTitle initialValue={swimlane.title} onSave={(newTitle) => onUpdateSwimlaneTitle(swimlane.id, newTitle)} />
              </div>

              {/* Task Cells for this swimlane */}
              {columns.map(col => (
                <div 
                  key={col.id} 
                  onDrop={(e) => handleDrop(e, col.id, swimlane.id)}
                  onDragOver={(e) => handleDragOver(e, col.id, swimlane.id)}
                  onDragLeave={handleDragLeave}
                  className={`p-2 space-y-3 bg-black/5 rounded-lg min-h-[150px] transition-colors duration-300 ${dragOverCell?.col === col.id && dragOverCell?.swim === swimlane.id ? 'bg-blue-500/10' : ''}`}
                >
                  {tasks
                    .filter(t => t.columnId === col.id && t.swimlaneId === swimlane.id)
                    .map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        isDone={isDoneColumn(task.columnId)}
                        onEdit={() => onEditTask(task)}
                        onDelete={() => onDeleteTask(task.id)}
                      />
                  ))}
                  <button 
                    onClick={() => onAddTask(null, {columnId: col.id, swimlaneId: swimlane.id})}
                    className="w-full text-center text-sm py-1.5 text-slate-500 hover:bg-slate-500/20 hover:text-slate-700 rounded-md transition-colors"
                  >
                    + Добавить задачу
                  </button>
                </div>
              ))}
              {/* Empty cell for Add Column button alignment */}
              <div />
            </React.Fragment>
          ))}
          
          {/* Add Swimlane Row */}
          <div className="p-2">
            <button onClick={onAddSwimlane} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-slate-200/70 text-slate-600 font-semibold rounded-lg hover:bg-slate-300/80 transition-colors">
                <Plus className="w-4 h-4" /> Добавить
            </button>
          </div>
        </div>
         {tasks.length === 0 && (
          <div className="text-center py-16 flex-grow flex flex-col justify-center items-center">
            <p className="text-slate-500">Начните работу с добавления колонок и дорожек.</p>
          </div>
       )}
      </div>
    </div>
  );
};

export default TasksDashboard;
