import React, { useState, useEffect } from 'react';
import { ScoreRecord } from '../types';
import { getTopScoresByUser, deleteScoreById } from '../services/storageService';
import { ArrowLeft, Calendar, Clock, CheckCircle, Trash2 } from 'lucide-react';

interface Props {
  username: string;
  onBack: () => void;
}

const LeaderboardScreen: React.FC<Props> = ({ username, onBack }) => {
  const [scores, setScores] = useState<ScoreRecord[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getTopScoresByUser(username);
      setScores(data);
    };
    fetchData();
  }, [username]);

  const handleDelete = async (scoreId: string) => {
    if (!window.confirm("¿Eliminar este registro?")) return;
    try {
      await deleteScoreById(scoreId);
      setScores(prev => prev.filter(s => s.id !== scoreId));
    } catch (e) {
      alert("Error eliminando: " + e);
    }
  };

  return (
    <div className="w-full max-w-lg flex flex-col h-[80vh] animate-fade-in">
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/10 rounded-full transition-colors mr-4"
        >
          <ArrowLeft className="text-white" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Tabla de Posiciones</h2>
          <p className="text-sm text-gray-400">Top 5 puntuaciones de <span className="text-blue-400">{username}</span></p>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden flex-1 shadow-2xl">
        {scores.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8 text-center">
            <p className="mb-2">No hay registros aún para este usuario.</p>
            <p className="text-sm">¡Juega una partida para aparecer aquí!</p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-full p-4 space-y-3">
            {scores.map((record, index) => (
              <div
                key={record.id}
                className="bg-black/20 hover:bg-black/30 transition-colors p-4 rounded-xl border border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center space-x-4">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                    ${index === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                      index === 1 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' :
                        index === 2 ? 'bg-orange-600/20 text-orange-400 border border-orange-600/30' :
                          'bg-white/5 text-gray-500'}
                  `}>
                    #{index + 1}
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">{record.score} pts</div>
                    <div className="flex items-center space-x-3 text-xs text-gray-400 mt-1">
                      <span className="flex items-center"><Calendar size={12} className="mr-1" /> {new Date(record.date).toLocaleDateString()}</span>
                      <span className="flex items-center"><Clock size={12} className="mr-1" /> {record.avgTime}s/avg</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <div className="flex items-center text-green-400 text-sm font-bold">
                    <CheckCircle size={14} className="mr-1" /> {record.correctCount}
                  </div>
                  <div className="text-xs text-red-400 mt-1 mb-2">
                    {record.errorCount} errores
                  </div>
                  <button
                    onClick={() => handleDelete(record.id)}
                    className="p-1 hover:bg-red-500/20 text-gray-500 hover:text-red-400 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardScreen;