
import React, { useState, useRef } from 'react';
import { User, Difficulty } from '../types';
import { saveUser } from '../services/storageService';
import { ArrowLeft, Camera, Save, Settings, User as UserIcon, Clock } from 'lucide-react';

interface Props {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onBack: () => void;
}

const ProfileScreen: React.FC<Props> = ({ user, onUpdateUser, onBack }) => {
  const [formData, setFormData] = useState({
    username: user.username,
    email: user.email,
    password: user.password,
    avatar: user.avatar || ''
  });

  const [timers, setTimers] = useState<Partial<Record<Difficulty, number>>>(user.settings.customTimers || {});
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit
        setMessage('La imagen es demasiado grande (Máx 500KB)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTimerChange = (diff: Difficulty, val: number) => {
    setTimers(prev => ({ ...prev, [diff]: val }));
  };

  const handleSave = async () => {
    const updatedUser: User = {
      ...user,
      username: formData.username,
      email: formData.email,
      password: formData.password,
      avatar: formData.avatar,
      settings: {
        ...user.settings,
        customTimers: timers
      }
    };

    await saveUser(updatedUser);
    onUpdateUser(updatedUser);
    setMessage('¡Perfil actualizado con éxito!');
    setTimeout(() => setMessage(''), 3000);
  };

  const difficultyLabels: Record<Difficulty, string> = {
    'easy': 'Nivel 1 (Fácil)',
    'easy_medium': 'Nivel 2',
    'medium': 'Nivel 3 (Medio)',
    'medium_hard': 'Nivel 4',
    'hard': 'Nivel 5 (Difícil)',
    'random_tables': 'Tablas Aleatorias'
  };

  return (
    <div className="w-full max-w-4xl flex flex-col h-[85vh] animate-fade-in">
      <div className="flex items-center mb-6 px-2">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/10 rounded-full transition-colors mr-4 bg-white/5 border border-white/10"
        >
          <ArrowLeft className="text-white" />
        </button>
        <h2 className="text-2xl font-bold text-white">Mi Perfil y Configuración</h2>
      </div>

      <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">

        {/* Left Column: Personal Info */}
        <div className="p-6 md:w-1/3 border-b md:border-b-0 md:border-r border-white/10 bg-black/20 flex flex-col items-center space-y-6">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 group-hover:border-blue-500 transition-all bg-slate-800 flex items-center justify-center">
              {formData.avatar ? (
                <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={48} className="text-gray-500" />
              )}
            </div>
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="text-white" />
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>

          <div className="w-full space-y-4">
            <div>
              <label className="text-xs text-gray-400 uppercase font-bold ml-1">Nombre</label>
              <input
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase font-bold ml-1">Email</label>
              <input
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase font-bold ml-1">Contraseña</label>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Game Settings */}
        <div className="p-6 md:w-2/3 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-2 mb-4 text-blue-300">
            <Settings size={20} />
            <h3 className="font-bold text-lg">Configuración de Estudio</h3>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-blue-200">
              Ajusta el tiempo límite por pregunta según la dificultad.
              <br />
              <span className="text-xs opacity-70">(Mínimo 3s - Máximo 60s)</span>
            </p>
          </div>

          <div className="space-y-6">
            {(Object.keys(difficultyLabels) as Difficulty[]).map((diff) => (
              <div key={diff} className="flex flex-col space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-300">{difficultyLabels[diff]}</label>
                  <span className="text-sm font-bold text-white bg-white/10 px-2 py-1 rounded">
                    {timers[diff] || 'Default'} s
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <Clock size={16} className="text-gray-500" />
                  <input
                    type="range"
                    min="3"
                    max="60"
                    step="1"
                    value={timers[diff] || 15} // Fallback just for slider position
                    onChange={(e) => handleTimerChange(diff, parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-6 flex justify-end items-center gap-4">
            {message && <span className="text-green-400 font-medium animate-pulse">{message}</span>}
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/50 transition-all"
            >
              <Save size={18} /> Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileScreen;
