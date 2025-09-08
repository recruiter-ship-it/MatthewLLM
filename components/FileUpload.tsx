import React, { useState, useCallback } from 'react';
import { UploadCloud, Paperclip, X, Video, Mic } from './icons/Icons';

interface FileUploadProps {
  title: string;
  files: File[];
  setFiles: (files: File[]) => void;
  multiple: boolean;
  accept: string;
}

const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const FilePreviewIcon: React.FC<{ file: File }> = ({ file }) => {
    if (file.type.startsWith('video/')) {
        return <Video className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0" />;
    }
    if (file.type.startsWith('audio/')) {
        return <Mic className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0" />;
    }
    return <Paperclip className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0" />;
};


export const FileUpload: React.FC<FileUploadProps> = ({ title, files, setFiles, multiple, accept }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (multiple) {
        const newFiles = [...files, ...droppedFiles].reduce((acc, file) => {
            if (!acc.find(f => f.name === file.name && f.size === file.size)) {
                acc.push(file);
            }
            return acc;
        }, [] as File[]);
        setFiles(newFiles);
      } else {
        setFiles([droppedFiles[0]]);
      }
      e.dataTransfer.clearData();
    }
  }, [files, multiple, setFiles]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
       if (multiple) {
         const newFiles = [...files, ...selectedFiles].reduce((acc, file) => {
            if (!acc.find(f => f.name === file.name && f.size === file.size)) {
                acc.push(file);
            }
            return acc;
        }, [] as File[]);
        setFiles(newFiles);
      } else {
        setFiles([selectedFiles[0]]);
      }
    }
  };

  const removeFile = (fileToRemove: File) => {
    setFiles(files.filter(file => file !== fileToRemove));
  };

  return (
    <div 
        className="flex flex-col h-full relative"
        onDragEnter={handleDragIn}
    >
      <h3 className="mb-2 font-medium text-slate-700 dark:text-slate-300">{title}</h3>
      <div className="flex-grow flex flex-col p-4 bg-white/30 dark:bg-slate-800/30 backdrop-blur-xl border border-white/40 dark:border-slate-700/40 rounded-2xl shadow-lg">
        {files.length === 0 ? (
          <div
            className="flex-grow flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-colors duration-300 border-slate-400/50 dark:border-slate-600/50 hover:border-blue-400 dark:hover:border-blue-500"
          >
            <input
              type="file"
              id={`file-upload-${title.replace(/\s/g, '-')}`}
              className="hidden"
              multiple={multiple}
              onChange={handleFileChange}
              accept={accept}
            />
            <label htmlFor={`file-upload-${title.replace(/\s/g, '-')}`} className="cursor-pointer text-center">
              <UploadCloud className="w-12 h-12 mx-auto text-slate-500 dark:text-slate-400 mb-2"/>
              <p className="font-semibold text-slate-700 dark:text-slate-300">Перетащите файлы сюда</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">или нажмите для выбора</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Поддерживается: {accept}</p>
            </label>
          </div>
        ) : (
          <div className="flex-grow overflow-y-auto pr-2">
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li key={index} className="flex items-center justify-between p-2 bg-white/50 dark:bg-slate-700/40 rounded-lg shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FilePreviewIcon file={file} />
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate" title={file.name}>{file.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                  <button onClick={() => removeFile(file)} className="p-1 rounded-full text-slate-500 dark:text-slate-400 hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
             {multiple && (
                <button onClick={() => document.getElementById(`file-upload-${title.replace(/\s/g, '-')}`)?.click()} className="w-full mt-3 text-center text-sm py-2 bg-white/40 dark:bg-slate-700/50 hover:bg-white/70 dark:hover:bg-slate-700/80 text-blue-600 dark:text-blue-400 font-semibold rounded-lg transition-colors">
                    Добавить еще файлы...
                </button>
            )}
          </div>
        )}
      </div>

       {isDragging && (
        <div 
          className="absolute inset-0 z-10"
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="w-full h-full flex items-center justify-center bg-blue-500/20 backdrop-blur-sm border-4 border-dashed border-blue-500 rounded-3xl">
            <div className="text-center font-bold text-blue-800 dark:text-blue-200 pointer-events-none">
                <UploadCloud className="w-16 h-16 mx-auto mb-2"/>
                <p>Отпустите, чтобы загрузить</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};