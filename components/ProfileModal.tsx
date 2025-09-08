import React, { useState, useEffect, useRef } from 'react';
import { CompanyProfile, Recruiter } from '../types';
import { X, User, Plus, Trash2, Edit, Camera, CheckSquare } from './icons/Icons';

interface ProfileModalProps {
  companyProfile: CompanyProfile;
  activeRecruiterId: string | null;
  onClose: () => void;
  onUpdateCompanyProfile: (updatedUserInfo: Partial<CompanyProfile>) => void;
  onUpdateRecruiters: (updatedRecruiters: Recruiter[]) => void;
  onSetActiveRecruiter: (recruiterId: string | null) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  companyProfile,
  activeRecruiterId,
  onClose,
  onUpdateCompanyProfile,
  onUpdateRecruiters,
  onSetActiveRecruiter,
}) => {
  const [name, setName] = useState(companyProfile.name);
  const [email, setEmail] = useState(companyProfile.email || '');
  const [recruiters, setRecruiters] = useState<Recruiter[]>(companyProfile.recruiters || []);
  const [newRecruiterName, setNewRecruiterName] = useState('');
  const [editingRecruiterId, setEditingRecruiterId] = useState<string | null>(null);
  const [editingRecruiterName, setEditingRecruiterName] = useState('');
  const [selectedActiveRecruiter, setSelectedActiveRecruiter] = useState(activeRecruiterId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setName(companyProfile.name);
    setEmail(companyProfile.email || '');
    setRecruiters(companyProfile.recruiters || []);
    setSelectedActiveRecruiter(activeRecruiterId);
  }, [companyProfile, activeRecruiterId]);

  const handleSaveChanges = () => {
    onUpdateCompanyProfile({ name, email });
    onUpdateRecruiters(recruiters);
    if (selectedActiveRecruiter) {
        onSetActiveRecruiter(selectedActiveRecruiter);
    }
    onClose();
  };
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onUpdateCompanyProfile({ avatar: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRecruiterAvatarChange = (e: React.ChangeEvent<HTMLInputElement>, recruiterId: string) => {
     const file = e.target.files?.[0];
     if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
          const newAvatar = event.target?.result as string;
          setRecruiters(prev => prev.map(r => r.id === recruiterId ? {...r, avatar: newAvatar} : r));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddRecruiter = () => {
    if (newRecruiterName.trim()) {
      const newRecruiter: Recruiter = {
        id: Date.now().toString(),
        name: newRecruiterName.trim(),
        avatar: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2NDc0OGIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNi41MiAxOWMuNjQtMi4yIDEuODQtNCAzLjIyLTUuMjZD MTAuMDcgMTIuNDkgMTEuMDEgMTIgMTIgMTJzMS45My40OSAzLjI2IDEuNzRjMS4zOCAxLjI2IDIuNTggMy4wNiAzLjIyIDUuMjYiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTAiIHI9IjMiLz48L3N2Zz4=',
      };
      setRecruiters([...recruiters, newRecruiter]);
      setNewRecruiterName('');
    }
  };

  const handleDeleteRecruiter = (id: string) => {
    setRecruiters(recruiters.filter(r => r.id !== id));
    if (selectedActiveRecruiter === id) {
        setSelectedActiveRecruiter(companyProfile.id);
    }
  };

  const handleEditRecruiter = (recruiter: Recruiter) => {
    setEditingRecruiterId(recruiter.id);
    setEditingRecruiterName(recruiter.name);
  };
  
  const handleSaveRecruiterName = (id: string) => {
     setRecruiters(recruiters.map(r => r.id === id ? { ...r, name: editingRecruiterName.trim() } : r));
     setEditingRecruiterId(null);
     setEditingRecruiterName('');
  };
  
  const allUsers = [{id: companyProfile.id, name: companyProfile.name, avatar: companyProfile.avatar}, ...recruiters];


  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="relative aurora-panel w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8 animate-zoom-in text-slate-800 dark:text-slate-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 text-center">Профиль и команда</h2>

        <div className="overflow-y-auto pr-2 flex-grow space-y-6">
            <section className="text-center">
                 <h3 className="font-semibold text-lg mb-4 text-slate-700 dark:text-slate-300">Основной профиль</h3>
                 <div className="flex flex-col items-center gap-4">
                     <div className="relative group">
                        <img src={companyProfile.avatar} alt="Company Avatar" className="w-24 h-24 rounded-full object-cover ring-4 ring-white/20 dark:ring-slate-700/30" />
                        <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-8 h-8 text-white"/>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden"/>
                     </div>
                     <div className="w-full">
                         <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Название компании" className="w-full text-xl font-bold bg-transparent p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-slate-900 dark:text-slate-100"/>
                         {companyProfile.email && (
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full text-sm bg-transparent p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-slate-600 dark:text-slate-400" />
                         )}
                     </div>
                 </div>
            </section>

            <section className="pt-6 border-t border-slate-300/50 dark:border-slate-600/50">
                 <h3 className="font-semibold text-lg mb-4 text-slate-700 dark:text-slate-300">Команда рекрутеров</h3>
                 <div className="space-y-3">
                    {recruiters.map(recruiter => (
                         <div key={recruiter.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/50 dark:hover:bg-slate-700/50">
                             <div className="flex items-center gap-3 flex-grow overflow-hidden">
                                 <div className="relative group flex-shrink-0">
                                    <img src={recruiter.avatar} alt={recruiter.name} className="w-10 h-10 rounded-full object-cover"/>
                                    <label className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <Camera className="w-5 h-5 text-white"/>
                                        <input type="file" onChange={(e) => handleRecruiterAvatarChange(e, recruiter.id)} accept="image/*" className="hidden"/>
                                    </label>
                                 </div>
                                 {editingRecruiterId === recruiter.id ? (
                                     <input 
                                        type="text" 
                                        value={editingRecruiterName}
                                        onChange={(e) => setEditingRecruiterName(e.target.value)}
                                        onBlur={() => handleSaveRecruiterName(recruiter.id)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveRecruiterName(recruiter.id)}
                                        className="bg-transparent p-1 rounded-md focus:outline-none ring-2 ring-blue-500 text-slate-800 dark:text-slate-200 w-full"
                                        autoFocus
                                     />
                                 ) : (
                                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{recruiter.name}</span>
                                 )}
                             </div>
                             <div className="flex items-center gap-2 flex-shrink-0">
                                {editingRecruiterId !== recruiter.id && (
                                    <button onClick={() => handleEditRecruiter(recruiter)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Редактировать имя">
                                        <Edit className="w-5 h-5"/>
                                    </button>
                                )}
                                 <button onClick={() => handleDeleteRecruiter(recruiter.id)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Удалить">
                                     <Trash2 className="w-5 h-5"/>
                                 </button>
                             </div>
                         </div>
                    ))}
                 </div>
                 <div className="flex items-center gap-2 mt-4">
                     <input 
                        type="text"
                        value={newRecruiterName}
                        onChange={(e) => setNewRecruiterName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddRecruiter()}
                        placeholder="Имя нового рекрутера"
                        className="flex-grow bg-white/50 dark:bg-slate-700/50 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 dark:placeholder-slate-400"
                     />
                     <button onClick={handleAddRecruiter} className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0">
                        <Plus className="w-6 h-6"/>
                     </button>
                 </div>
            </section>
            
            <section className="pt-6 border-t border-slate-300/50 dark:border-slate-600/50">
                <h3 className="font-semibold text-lg mb-2 text-slate-700 dark:text-slate-300">Активный пользователь</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Выберите, от чьего имени вы работаете. Это изменит аватар и имя в шапке.</p>
                <div className="flex flex-wrap gap-3">
                    {allUsers.map(user => (
                        <button 
                            key={user.id}
                            onClick={() => setSelectedActiveRecruiter(user.id)}
                            className={`flex items-center gap-3 p-2 pr-4 rounded-full border-2 transition-all duration-200 ${selectedActiveRecruiter === user.id ? 'bg-blue-500/20 border-blue-500 shadow-md' : 'bg-white/40 dark:bg-slate-700/40 border-transparent hover:border-blue-400/50'}`}
                        >
                            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                            <span className="font-semibold text-sm">{user.name}</span>
                             {selectedActiveRecruiter === user.id && <CheckSquare className="w-5 h-5 text-blue-600 -ml-1"/>}
                        </button>
                    ))}
                </div>
            </section>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-300/50 dark:border-slate-600/50 flex-shrink-0 flex justify-end">
          <button onClick={handleSaveChanges} className="w-full sm:w-auto px-8 py-3 text-white rounded-lg font-bold aurora-button-primary text-base">
            Сохранить и закрыть
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