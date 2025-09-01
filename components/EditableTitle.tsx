
import React, { useState, KeyboardEvent, useEffect, useRef } from 'react';

interface EditableTitleProps {
  initialValue: string;
  onSave: (newValue: string) => void;
  className?: string;
}

const EditableTitle: React.FC<EditableTitleProps> = ({ initialValue, onSave, className }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  // Update internal state if initialValue prop changes from outside
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleBlur = () => {
    if (value.trim() && value.trim() !== initialValue) {
      onSave(value.trim());
    } else {
      setValue(initialValue); // Reset if empty or unchanged
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`bg-white/80 border-2 border-blue-500 rounded-md p-1 -m-1 w-full text-base font-bold ${className}`}
      />
    );
  }

  return (
    <div onClick={() => setIsEditing(true)} className={`cursor-pointer p-1 -m-1 rounded hover:bg-slate-500/10 w-full truncate ${className}`}>
      {value || 'Нажмите для редактирования'}
    </div>
  );
};

export default EditableTitle;
