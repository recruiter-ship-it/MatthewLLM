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
        return <Video className="w-5 h-5 text-slate-500 flex-shrink-0" />;
    }
    if (file.type.startsWith('audio/')) {
        return <Mic className="w-5 h-5 text-slate-500 flex-shrink-0" />;
    }
    return <Paperclip className="w-5 h-5 text-slate-500 flex-shrink-0" />;
};


export const FileUpload: React.FC<FileUploadProps> = ({ title, files, setFiles, multiple, accept }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
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
    <div className="flex flex-col h-full">
      <h3 className="mb-2 font-medium text-slate-700">{title}</h3>
      <div className="flex-grow flex flex-col p-4 bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg">
        {files.length === 0 ? (
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`flex-grow flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-colors duration-300 ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-400/50 hover:border-blue-400'}`}
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
              <UploadCloud className="w-12 h-12 mx-auto text-slate-500 mb-2"/>
              <p className="font-semibold text-slate-700">Перетащите файлы сюда</p>
              <p className="text-sm text-slate-500">или нажмите для выбора</p>
              <p className="text-xs text-slate-400 mt-2">Поддерживается: {accept}</p>
            </label>
          </div>
        ) : (
          <div className="flex-grow overflow-y-auto pr-2">
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li key={index} className="flex items-center justify-between p-2 bg-white/50 rounded-lg shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FilePreviewIcon file={file} />
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-slate-800 truncate" title={file.name}>{file.name}</p>
                      <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                  <button onClick={() => removeFile(file)} className="p-1 rounded-full text-slate-500 hover:bg-red-500/20 hover:text-red-600 transition-colors flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
             {multiple && (
                <button onClick={() => document.getElementById(`file-upload-${title.replace(/\s/g, '-')}`)?.click()} className="w-full mt-3 text-center text-sm py-2 bg-white/40 hover:bg-white/70 text-blue-600 font-semibold rounded-lg transition-colors">
                    Добавить еще файлы...
                </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};