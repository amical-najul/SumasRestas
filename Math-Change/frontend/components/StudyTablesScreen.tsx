import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Calculator, PlayCircle } from 'lucide-react';

interface Props {
  onBack: () => void;
  onPractice: () => void;
}

const StudyTablesScreen: React.FC<Props> = ({ onBack, onPractice }) => {
  const [selectedTable, setSelectedTable] = useState<number | null>(null);

  // Numbers 1 to 12
  const tables = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="w-full max-w-2xl flex flex-col h-[85vh] animate-fade-in">
      {/* Header */}
      <div className="flex items-center mb-4 px-2">
        <button 
          onClick={() => selectedTable ? setSelectedTable(null) : onBack()}
          className="p-2 hover:bg-white/10 rounded-full transition-colors mr-4 bg-white/5 border border-white/10"
        >
          <ArrowLeft className="text-white" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="text-pink-400" />
            {selectedTable ? `Tabla del ${selectedTable}` : 'Estudiar Tablas'}
          </h2>
          <p className="text-sm text-gray-400">
            {selectedTable ? 'Repasa los resultados.' : 'Selecciona una tabla o practica aleatoriamente.'}
          </p>
        </div>
      </div>

      <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6 relative flex flex-col">
        
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

        {!selectedTable ? (
          <div className="flex flex-col h-full">
            {/* Grid View */}
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar mb-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 pb-2">
                {tables.map((num) => (
                  <button
                    key={num}
                    onClick={() => setSelectedTable(num)}
                    className="aspect-square bg-white/5 hover:bg-white/20 border-2 border-white/10 hover:border-pink-400/50 rounded-2xl flex flex-col items-center justify-center transition-all group"
                  >
                    <span className="text-4xl font-bold text-white group-hover:scale-110 transition-transform">{num}</span>
                    <span className="text-xs text-gray-500 uppercase font-bold mt-1 group-hover:text-pink-300">Tabla</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Random Practice Button */}
            <button
              onClick={onPractice}
              className="w-full py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl shadow-lg border border-white/20 flex items-center justify-center space-x-3 transition-all transform hover:scale-[1.02] group"
            >
              <PlayCircle className="group-hover:animate-pulse" size={24} />
              <div className="text-left">
                <span className="block text-lg font-bold leading-none">Practicar Aleatorio (Quiz)</span>
                <span className="text-xs text-pink-200">Preguntas mixtas del 1 al 12</span>
              </div>
            </button>
          </div>
        ) : (
          // Detail View (The actual table)
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((multiplier) => (
                  <div 
                    key={multiplier}
                    className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center space-x-2 text-xl font-bold text-gray-300">
                      <span>{selectedTable}</span>
                      <span className="text-pink-500">×</span>
                      <span>{multiplier}</span>
                    </div>
                    <div className="text-2xl font-bold text-white">
                      = {selectedTable * multiplier}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Quick action footer */}
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-center">
                <p className="text-gray-400 text-sm flex items-center gap-2">
                    <Calculator size={16} />
                    ¡Memorízala y luego juega al modo Multiplicación!
                </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyTablesScreen;