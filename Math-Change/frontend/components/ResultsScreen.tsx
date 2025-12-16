
import React from 'react';
import { GameStats } from '../types';
import { RefreshCcw, Home, Award, ArrowRight, Clock, Timer } from 'lucide-react';

interface Props {
  stats: GameStats;
  username: string;
  onRestart: () => void;
  onHome: () => void;
  onNextLevel: () => void;
  hasNextLevel: boolean;
  isPass: boolean;
}

const ResultsScreen: React.FC<Props> = ({ stats, username, onRestart, onHome, onNextLevel, hasNextLevel, isPass }) => {
  const totalQuestions = stats.correct + stats.incorrect;
  const score = totalQuestions > 0 ? Math.round((stats.correct / totalQuestions) * 100) : 0;
  const avgTime = totalQuestions > 0 ? (stats.totalTime / totalQuestions).toFixed(2) : "0.00";

  // Format Total Time (e.g., 65s -> 1m 5s)
  const formatTotalTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md animate-fade-in text-center space-y-4">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl w-full shadow-2xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-purple-500/30 blur-3xl rounded-full pointer-events-none"></div>

        <Award size={64} className="mx-auto text-yellow-400 mb-4 relative z-10" />
        
        <h2 className="text-3xl font-bold text-white mb-1">Resultados</h2>
        <p className="text-purple-300 mb-8 font-medium">¡Buen trabajo, {username}!</p>

        <div className="space-y-3">
          <div className="bg-black/20 rounded-xl p-4 flex justify-between items-center">
            <span className="text-gray-300">Puntuación Final</span>
            <span className="text-3xl font-bold text-white">{score} pts</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/20 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase font-bold">Correctas</span>
              <span className="text-2xl font-bold text-green-400">{stats.correct}</span>
            </div>
            <div className="bg-black/20 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase font-bold">Incorrectas</span>
              <span className="text-2xl font-bold text-red-400">{stats.incorrect}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/20 rounded-xl p-3 flex flex-col items-center justify-center">
               <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1">
                  <Clock size={10} /> Promedio
               </span>
               <span className="text-lg font-mono text-blue-300">{avgTime}s</span>
            </div>
            <div className="bg-black/20 rounded-xl p-3 flex flex-col items-center justify-center">
               <span className="text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1">
                  <Timer size={10} /> Total
               </span>
               <span className="text-lg font-mono text-purple-300">{formatTotalTime(stats.totalTime)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-full gap-3">
         {/* Next Level Button - Only if Passed and Next Level Exists */}
         {isPass && hasNextLevel && (
            <button
                onClick={onNextLevel}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/50 transition-all flex items-center justify-center space-x-2 animate-pulse"
            >
                <span>Siguiente Nivel</span>
                <ArrowRight size={20} />
            </button>
         )}

         <div className="flex space-x-3 w-full">
            <button
            onClick={onHome}
            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all flex items-center justify-center space-x-2"
            >
            <Home size={18} />
            <span>Inicio</span>
            </button>
            <button
            onClick={onRestart}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/50 transition-all flex items-center justify-center space-x-2"
            >
            <RefreshCcw size={18} />
            <span>Repetir</span>
            </button>
         </div>
      </div>
    </div>
  );
};

export default ResultsScreen;
