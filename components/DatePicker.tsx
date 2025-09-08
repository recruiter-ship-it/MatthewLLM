import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from './icons/Icons';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  onClose: () => void;
  minDate?: string; // YYYY-MM-DD
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, onClose, minDate }) => {
  const selectedDate = value ? new Date(`${value}T00:00:00`) : null;
  const [viewDate, setViewDate] = useState(selectedDate || new Date());
  const pickerRef = useRef<HTMLDivElement>(null);
  
  const minDateTime = minDate ? new Date(`${minDate}T00:00:00`).getTime() : 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  const dayNames = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  const calendarGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Adjust for Monday start
    const dayOfWeekOffset = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1;

    const days = [];
    for (let i = 0; i < dayOfWeekOffset; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [viewDate]);

  const handleDateClick = (date: Date) => {
    // Check if the date is disabled, but allow clicking today even if it's minDate
    const clickedTime = new Date(date);
    clickedTime.setHours(0,0,0,0);
    if (clickedTime.getTime() < minDateTime) return; 
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    onChange(`${year}-${month}-${day}`);
    onClose();
  };

  const handleMonthChange = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };
  
  const handleSetToday = () => {
      const today = new Date();
      setViewDate(today);
      handleDateClick(today);
  }

  return (
    <div ref={pickerRef} className="absolute top-full mt-2 w-72 bg-gray-700/50 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl p-4 z-20 text-white animate-fade-in-down">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => handleMonthChange(-1)} className="p-1 rounded-full hover:bg-white/10"><ChevronLeft className="w-5 h-5" /></button>
        <div className="font-bold text-center">
            {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
        </div>
        <button onClick={() => handleMonthChange(1)} className="p-1 rounded-full hover:bg-white/10"><ChevronRight className="w-5 h-5" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-300 mb-2">
        {dayNames.map(day => <div key={day}>{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarGrid.map((date, i) => {
          if (!date) return <div key={`empty-${i}`}></div>;
          
          const dateWithoutTime = new Date(date);
          dateWithoutTime.setHours(0,0,0,0);

          const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
          const isToday = date.toDateString() === new Date().toDateString();
          const isDisabled = dateWithoutTime.getTime() < minDateTime;
          
          let buttonClass = 'p-1 rounded-full text-sm hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed';
          if (isSelected) buttonClass += ' bg-blue-500 font-bold';
          if (isToday && !isSelected) buttonClass += ' ring-2 ring-blue-400';

          return (
            <button
              key={date.toISOString()}
              onClick={() => handleDateClick(date)}
              className={buttonClass}
              disabled={isDisabled}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
       <div className="mt-4 pt-3 border-t border-white/20 flex justify-between">
            <button onClick={() => { onChange(''); onClose(); }} className="text-sm text-gray-300 hover:text-white">Удалить</button>
            <button onClick={handleSetToday} className="text-sm font-semibold text-blue-300 hover:text-blue-200">Сегодня</button>
       </div>
    </div>
  );
};

export default DatePicker;
