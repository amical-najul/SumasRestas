import React, { useState, useEffect } from 'react';
import { ScoreRecord, CategoryProgress, GameCategory } from '../types';
import { getTopScoresByUser, getUserProgress } from '../services/storageService';
import { ArrowLeft, Calendar, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Plus, Minus, X, Divide, Hash, Zap, BrainCircuit, Calculator, TrendingUp, Target, Gamepad2 } from 'lucide-react';

interface Props {
  username: string;
  onBack: () => void;
}

const CATEGORY_CONFIG: Record<GameCategory, { label: string; color: string; icon: React.ReactNode }> = {
  addition: { label: 'Sumas', color: 'bg-green-500', icon: <Plus size={16} /> },
  subtraction: { label: 'Restas', color: 'bg-orange-500', icon: <Minus size={16} /> },
  multiplication: { label: 'Tablas', color: 'bg-purple-500', icon: <X size={16} /> },
  division: { label: 'División', color: 'bg-pink-500', icon: <Divide size={16} /> },
  mixed_add_sub: { label: 'Suma y Resta', color: 'bg-teal-500', icon: <Hash size={16} /> },
  mixed_mult_add: { label: 'Mult + Oper', color: 'bg-indigo-500', icon: <Zap size={16} /> },
  all_mixed: { label: 'Experto', color: 'bg-rose-500', icon: <BrainCircuit size={16} /> },
  challenge: { label: 'Desafío Mix', color: 'bg-blue-500', icon: <Calculator size={16} /> }
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Nv.1',
  easy_medium: 'Nv.2',
  medium: 'Nv.3',
  medium_hard: 'Nv.4',
  hard: 'Nv.5',
  mixed: 'Mix'
};

const ProgressScreen: React.FC<Props> = ({ username, onBack }) => {
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [progress, setProgress] = useState<CategoryProgress[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [scoresData, progressData] = await Promise.all([
        getTopScoresByUser(username),
        getUserProgress()
      ]);
      setScores(scoresData);
      setProgress(progressData);
    };
    fetchData();
  }, [username]);

  // Calculate overall stats
  const totalGames = scores.length;
  const totalCorrect = scores.reduce((sum, s) => sum + s.correctCount, 0);
  const totalErrors = scores.reduce((sum, s) => sum + s.errorCount, 0);
  const avgScore = totalGames > 0 ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / totalGames) : 0;

  // Group scores by category
  const scoresByCategory: Record<string, ScoreRecord[]> = {};
  scores.forEach(s => {
    const cat = s.category || 'unknown';
    if (!scoresByCategory[cat]) scoresByCategory[cat] = [];
    scoresByCategory[cat].push(s);
  });

  // Get categories with history (from progress or scores)
  const playedCategories = [...new Set([
    ...progress.map(p => p.category),
    ...Object.keys(scoresByCategory)
  ])];

  return (
    <div className="w-full max-w-lg flex flex-col h-[85vh] animate-fade-in">
      {/* Header */}
      <div className="flex items-center mb-4">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors mr-3">
          <ArrowLeft className="text-white" size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">Mi Progreso</h2>
          <p className="text-sm text-gray-400">{username}</p>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <Gamepad2 className="mx-auto text-blue-400 mb-1" size={18} />
          <div className="text-lg font-bold text-white">{totalGames}</div>
          <div className="text-[10px] text-gray-500 uppercase">Partidas</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <TrendingUp className="mx-auto text-yellow-400 mb-1" size={18} />
          <div className="text-lg font-bold text-white">{avgScore}%</div>
          <div className="text-[10px] text-gray-500 uppercase">Promedio</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
          <Target className="mx-auto text-green-400 mb-1" size={18} />
          <div className="text-lg font-bold text-white">{totalCorrect}</div>
          <div className="text-[10px] text-gray-500 uppercase">Correctas</div>
        </div>
      </div>

      {/* Category Progress Cards */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        <h3 className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Progreso por Categoría</h3>

        {playedCategories.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No hay historial aún.</p>
            <p className="text-sm">¡Juega una partida para ver tu progreso!</p>
          </div>
        ) : (
          playedCategories.map(catKey => {
            const config = CATEGORY_CONFIG[catKey as GameCategory] || { label: catKey, color: 'bg-gray-500', icon: null };
            const catProgress = progress.find(p => p.category === catKey);
            const catScores = scoresByCategory[catKey] || [];
            const isExpanded = expandedCategory === catKey;

            const catTotalGames = catProgress?.total_games || catScores.length;
            const catAccuracy = catProgress && catProgress.total_correct + catProgress.total_errors > 0
              ? Math.round((catProgress.total_correct / (catProgress.total_correct + catProgress.total_errors)) * 100)
              : catScores.length > 0
                ? Math.round(catScores.reduce((sum, s) => sum + s.score, 0) / catScores.length)
                : 0;
            const unlockedLevel = catProgress?.unlocked_level ?? 0;

            return (
              <div key={catKey} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : catKey)}
                  className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 ${config.color} rounded-lg flex items-center justify-center text-white`}>
                      {config.icon}
                    </div>
                    <div className="text-left">
                      <div className="text-white font-semibold">{config.label}</div>
                      <div className="text-xs text-gray-400">
                        {catTotalGames} partidas • {catAccuracy}% precisión
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-yellow-400 text-sm font-bold">Nivel {unlockedLevel + 1}</div>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-2 h-2 rounded-full mx-0.5 ${i <= unlockedLevel ? 'bg-yellow-400' : 'bg-gray-700'}`} />
                        ))}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </button>

                {/* Expanded History */}
                {isExpanded && catScores.length > 0 && (
                  <div className="border-t border-white/5 p-2 space-y-2 max-h-48 overflow-y-auto bg-black/20">
                    {catScores.slice(0, 10).map(score => (
                      <div key={score.id} className="flex items-center justify-between text-sm p-2 bg-white/5 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-300">
                            {DIFFICULTY_LABELS[score.difficulty || 'easy'] || score.difficulty}
                          </span>
                          <span className="text-white font-medium">{score.score}%</span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-gray-400">
                          <span className="flex items-center text-green-400">
                            <CheckCircle size={12} className="mr-1" />{score.correctCount}
                          </span>
                          <span className="flex items-center text-red-400">
                            <XCircle size={12} className="mr-1" />{score.errorCount}
                          </span>
                          <span className="flex items-center">
                            <Calendar size={12} className="mr-1" />{new Date(score.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProgressScreen;