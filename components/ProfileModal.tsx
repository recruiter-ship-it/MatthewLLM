
import React, { useRef } from 'react';
import { User } from '../types';
import { X, UserCircle as UserIcon, Camera } from './icons/Icons';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onUpdateUser: (updatedUserInfo: Partial<User>) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onUpdateUser }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert("Файл слишком большой. Пожалуйста, выберите изображение до 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          onUpdateUser({ avatar: reader.result as string });
        }
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        alert("Не удалось прочитать файл.");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="relative bg-gray-800/20 backdrop-blur-2xl border border-white/20 w-full max-w-md rounded-3xl shadow-2xl p-8 animate-zoom-in text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-300 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6">Профиль</h2>

        <div className="flex flex-col items-center gap-4 mb-6">
            <div className="relative group">
                <img src={user.avatar} alt="Avatar" className="w-28 h-28 rounded-full object-cover border-4 border-white/20 transition-all duration-300 group-hover:brightness-75" />
                <label 
                    htmlFor="avatar-upload"
                    className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-300"
                >
                    <Camera className="w-8 h-8 text-white" />
                    <span className="sr-only">Изменить аватар</span>
                </label>
                <input
                    id="avatar-upload"
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/png, image/jpeg, image/gif, image/webp"
                    onChange={handleAvatarChange}
                />
            </div>
            <div className="text-center">
                <p className="text-xl font-bold text-white">{user.name}</p>
                {user.email && <p className="text-sm text-gray-300">{user.email}</p>}
            </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
             <UserIcon className="w-5 h-5 text-gray-300"/>
             <span className="text-gray-200">ID: {user.id}</span>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Закрыть
          </button>
        </div>
      </div>
      <style>{`
        @keyframes zoom-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-zoom-in { animation: zoom-in 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default ProfileModal;
