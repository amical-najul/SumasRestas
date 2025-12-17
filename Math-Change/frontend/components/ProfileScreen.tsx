
import React, { useState, useRef } from 'react';
import { User, Difficulty } from '../types';
import { saveUser, uploadAvatar, deleteScores } from '../services/storageService';
import { updateUserEmail, updateUserPassword } from '../services/firebaseAuthService';
import { ArrowLeft, Camera, Save, Settings, User as UserIcon, Clock, Trash2, ShieldAlert } from 'lucide-react';

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

  // State for deferred upload
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setMessage('La imagen es demasiado grande (Máx 5MB)');
        return;
      }

      // Create local preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Queue for upload
      setPendingFile(file);
      setMessage('Imagen seleccionada. Pulsa "Guardar" para subir y aplicar cambios.');
    }
  };

  const handleTimerChange = (diff: Difficulty, val: number) => {
    setTimers(prev => ({ ...prev, [diff]: val }));
  };

  const handleSave = async () => {
    setMessage('Procesando cambios...');

    try {
      // 0. Upload Avatar if pending
      let finalAvatarUrl = formData.avatar;

      if (pendingFile) {
        setMessage('Subiendo nueva imagen de perfil...');
        try {
          finalAvatarUrl = await uploadAvatar(pendingFile);
        } catch (uploadErr: any) {
          console.error("Upload error:", uploadErr);
          setMessage(`Error al subir imagen: ${uploadErr.message || 'Fallo de red'}`);
          return; // Stop saving if upload fails
        }
      }

      // 1. Sync with Firebase Auth (Critical Data)
      if (formData.email !== user.email) {
        const res = await updateUserEmail(formData.email);
        if (!res.success) {
          setMessage(`Error actualizando email: ${res.message}`);
          return;
        }
      }

      // Password Update
      if (formData.password && formData.password !== user.password && formData.password.length >= 6) {
        const res = await updateUserPassword(formData.password);
        if (!res.success) {
          setMessage(`Error actualizando contraseña: ${res.message}`);
          return;
        }
      } else if (formData.password && formData.password.length < 6) {
        setMessage('La contraseña debe tener al menos 6 caracteres');
        return;
      }

      // 2. Save to Backend (Profile Data)
      const updatedUser: User = {
        ...user,
        username: formData.username,
        email: formData.email,
        password: user.password,
        avatar: finalAvatarUrl, // Use the potentially new URL
        settings: {
          ...user.settings,
          customTimers: timers
        }
      };

      await saveUser(updatedUser);
      onUpdateUser(updatedUser);
      setPendingFile(null); // Clear pending
      setMessage('¡Perfil y Credenciales actualizados con éxito!');
      setTimeout(() => setMessage(''), 3000);

    } catch (saveError: any) {
      console.error("Save error:", saveError);
      setMessage(`Error al guardar: ${saveError.message || 'Failed to fetch'}`);
    }
  };

  const difficultyLabels: Record<Difficulty, string> = {
    'easy': 'Nivel 1 (Fácil)',
    'easy_medium': 'Nivel 2',
    'medium': 'Nivel 3 (Medio)',
    'medium_hard': 'Nivel 4',
    'hard': 'Nivel 5 (Difícil)',
    'random_tables': 'Tablas Aleatorias'
  };

  const handleDeleteHistory = async () => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar TODO tu historial de partidas? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      setMessage('Eliminando historial...');
      await deleteScores('all');
      setMessage('Historial eliminado correctamente.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error("Delete error:", error);
      setMessage(`Error: ${error.message}`);
    }
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
              {previewAvatar || formData.avatar ? (
                <img src={previewAvatar || formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
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

          <div className="flex items-center gap-2 mb-4 mt-8 text-red-300">
            <ShieldAlert size={20} />
            <h3 className="font-bold text-lg">Zona de Peligro</h3>
          </div>

          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-red-200">Historial de Partidas</p>
              <p className="text-xs text-red-200/50">Elimina todos tus registros de puntuación de forma permanente.</p>
            </div>
            <button
              onClick={handleDeleteHistory}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500 hover:text-white text-red-400 rounded-lg transition-colors border border-red-500/30"
            >
              <Trash2 size={16} /> Eliminar
            </button>
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
