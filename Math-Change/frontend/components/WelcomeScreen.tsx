
import React, { useState, useEffect } from 'react';
import { GameCategory, Difficulty, User } from '../types';
import { Trophy, Play, Calculator, Plus, Minus, X, Divide, Signal, Hash, Zap, BrainCircuit, BookOpen, Settings, Shield, LogOut, Lock } from 'lucide-react';

interface Props {
  user: User | null;
  onStart: (username: string, category: GameCategory, difficulty: Difficulty) => void;
  onLeaderboard: (username: string) => void;
  onStudy: () => void;
  onProfile: () => void;
  onAdmin: () => void;
  onLogout: () => void;
}

const WelcomeScreen: React.FC<Props> = ({ user, onStart, onLeaderboard, onStudy, onProfile, onAdmin, onLogout }) => {
  const [username, setUsername] = useState(user?.username || '');
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>('challenge');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [imgError, setImgError] = useState(false);

  const [progress, setProgress] = useState<import('../types').CategoryProgress[]>([]);

  // Fetch progress on mount/user change
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      import('../services/storageService').then(service => {
        service.getUserProgress().then(setProgress);
      });
    }
  }, [user]);

  // Sync unlocked level logic
  // Difficulty Order: Easy(0), EasyMedium(1), Medium(2), MedHard(3), Hard(4)
  // Guests have all unlocked by default, Admins have all unlocked.
  // Standard Users use API progress data

  const difficultyOrder: Difficulty[] = ['easy', 'easy_medium', 'medium', 'medium_hard', 'hard'];

  // Reset difficulty to 'easy' if the current selected difficulty is locked when user logs in OR category changes
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      const currentIdx = difficultyOrder.indexOf(difficulty);

      // Independent Level Logic via API
      const catProgress = progress.find(p => p.category === selectedCategory);
      // Fallback to legacy or 0
      const catLevel = catProgress?.unlocked_level ?? user.unlockedLevel ?? 0;

      if (currentIdx > catLevel) {
        setDifficulty('easy');
      }
    }
    if (user) setUsername(user.username);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, difficulty, selectedCategory, progress]);

  const handleStart = () => {
    const finalName = username.trim() || "Usuario";
    onStart(finalName, selectedCategory, difficulty);
  };

  const handleLeaderboard = () => {
    if (!username.trim()) {
      setError('Ingresa tu nombre para ver tu historial.');
      return;
    }
    onLeaderboard(username.trim());
  };

  const categories: { id: GameCategory; label: string; icon: React.ReactNode; color: string; colSpan?: string }[] = [
    { id: 'challenge', label: 'Desafío Mix', icon: <Calculator size={20} />, color: 'bg-blue-600', colSpan: 'col-span-2' },
    { id: 'addition', label: 'Sumas', icon: <Plus size={20} />, color: 'bg-green-600' },
    { id: 'subtraction', label: 'Restas', icon: <Minus size={20} />, color: 'bg-orange-600' },
    { id: 'multiplication', label: 'Tablas (×)', icon: <X size={20} />, color: 'bg-purple-600' },
    { id: 'division', label: 'División (÷)', icon: <Divide size={20} />, color: 'bg-pink-600' },
    { id: 'mixed_add_sub', label: 'Suma y Resta', icon: <Hash size={20} />, color: 'bg-teal-600', colSpan: 'col-span-2' },
    { id: 'mixed_mult_add', label: 'Mult + Oper.', icon: <Zap size={20} />, color: 'bg-indigo-600' },
    { id: 'all_mixed', label: 'Experto (Todas)', icon: <BrainCircuit size={20} />, color: 'bg-rose-600' },
  ];

  const difficulties: { id: Difficulty; label: string; color: string; hover: string; index: number }[] = [
    { id: 'easy', label: '1', color: 'bg-emerald-400', hover: 'hover:bg-emerald-300', index: 0 },
    { id: 'easy_medium', label: '2', color: 'bg-emerald-600', hover: 'hover:bg-emerald-500', index: 1 },
    { id: 'medium', label: '3', color: 'bg-yellow-500', hover: 'hover:bg-yellow-400', index: 2 },
    { id: 'medium_hard', label: '4', color: 'bg-orange-500', hover: 'hover:bg-orange-400', index: 3 },
    { id: 'hard', label: '5', color: 'bg-red-600', hover: 'hover:bg-red-500', index: 4 },
  ];

  const isLevelLocked = (levelIndex: number) => {
    if (!user) return false; // Guests have all unlocked
    if (user.role === 'ADMIN') return false; // Admins have all unlocked

    // Independent Level Logic via API
    const catProgress = progress.find(p => p.category === selectedCategory);
    // Fallback to legacy global level for smooth transition if API returns empty
    const catLevel = catProgress?.unlocked_level ?? user.unlockedLevel ?? 0;

    return levelIndex > catLevel;
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-center space-y-4 animate-fade-in py-4 relative">

      {/* Top Right Controls (User & Admin) */}
      <div className="absolute top-0 right-0 flex gap-2">
        {user && user.role === 'ADMIN' && (
          <button onClick={onAdmin} className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-lg transition-colors border border-red-500/30" title="Panel Administrador">
            <Shield size={20} />
          </button>
        )}
        {user && (
          <button onClick={onProfile} className="p-2 bg-white/5 hover:bg-white/20 text-gray-300 rounded-lg transition-colors border border-white/10" title="Mi Perfil">
            <Settings size={20} />
          </button>
        )}
        <button onClick={onLogout} className="p-2 bg-white/5 hover:bg-white/20 text-gray-300 rounded-lg transition-colors border border-white/10" title="Salir">
          <LogOut size={20} />
        </button>
      </div>

      <div className="relative mb-1">
        <div className="absolute -inset-4 bg-blue-500/30 rounded-full blur-xl animate-pulse"></div>
        {user?.avatar && !imgError ? (
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-400 relative z-10 shadow-lg">
            <img
              src={user.avatar}
              alt="User"
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          </div>
        ) : (
          <Calculator size={50} className="text-blue-400 relative z-10" />
        )}
      </div>

      <div>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 mb-1">
          Math Challenge
        </h1>
        <p className="text-gray-400 text-sm">
          {user ? `¡Hola, ${user.username}!` : 'Entrenamiento mental'}
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {/* Username Input (Only if Guest) */}
        {!user && (
          <div className="relative">
            <input
              type="text"
              placeholder="Tu Nombre (Opcional)"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              className="w-full px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center text-lg"
            />
          </div>
        )}

        {error && <p className="text-red-400 text-xs font-medium">{error}</p>}

        {/* Category Selector */}
        <div className="grid grid-cols-2 gap-2 mt-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${selectedCategory === cat.id
                ? `${cat.color} border-white/40 text-white shadow-lg scale-[1.02] z-10 ring-2 ring-white/20`
                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                } ${cat.colSpan || ''}`}
            >
              <div className="flex items-center space-x-2">
                {cat.icon}
                <span className="text-xs font-bold uppercase">{cat.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Difficulty Selector */}
        {selectedCategory !== 'challenge' && (
          <div className="animate-fade-in-up bg-black/20 p-2 rounded-xl border border-white/5">
            <div className="flex items-center justify-center space-x-2 mb-1 text-gray-400">
              <Signal size={14} />
              <span className="text-[10px] uppercase font-bold tracking-wider">Nivel de Dificultad</span>
            </div>
            <div className="flex justify-between gap-2">
              {difficulties.map((diff) => {
                const locked = isLevelLocked(diff.index);
                return (
                  <button
                    key={diff.id}
                    onClick={() => !locked && setDifficulty(diff.id)}
                    disabled={locked}
                    className={`w-full aspect-square rounded-lg border text-lg font-bold transition-all flex items-center justify-center relative ${locked
                      ? 'bg-black/40 border-white/5 text-gray-600 cursor-not-allowed'
                      : difficulty === diff.id
                        ? `${diff.color} border-white text-white shadow-md scale-110 z-10`
                        : `bg-white/5 border-white/10 text-gray-400 ${diff.hover}`
                      }`}
                    title={locked ? "Nivel Bloqueado" : diff.label}
                  >
                    {locked ? <Lock size={16} /> : diff.label}
                  </button>
                );
              })}
            </div>
            {user && user.role !== 'ADMIN' && (
              <p className="text-[10px] text-gray-500 mt-1">Completa un nivel con &gt;60% para desbloquear el siguiente.</p>
            )}
          </div>
        )}

        {selectedCategory === 'challenge' && (
          <p className="text-xs text-gray-500 italic">El modo Desafío aumenta la dificultad automáticamente.</p>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-1">
          <button
            onClick={onStudy}
            className="px-4 py-3 bg-pink-600/20 hover:bg-pink-600/40 border border-pink-500/30 text-pink-300 rounded-xl transition-all flex items-center justify-center"
            title="Estudiar Tablas"
          >
            <BookOpen size={20} />
          </button>
          <button
            onClick={handleLeaderboard}
            className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl transition-all flex items-center justify-center"
            title="Ver Resultados"
          >
            <Trophy size={20} />
          </button>
          <button
            onClick={handleStart}
            className="flex-1 group relative px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/50 flex items-center justify-center space-x-2 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <Play size={20} className="relative z-10" />
            <span className="relative z-10">Jugar Ahora</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
