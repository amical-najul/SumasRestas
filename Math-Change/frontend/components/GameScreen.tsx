
import React, { useState, useEffect, useRef } from 'react';
import { GameStats, Question, GameCategory, Difficulty, UserSettings } from '../types';
import { generateQuestion, calculateTimeLimit } from '../services/mathService';
import { Clock, CheckCircle2, XCircle, LogOut, Delete, ArrowRight } from 'lucide-react';

interface Props {
  category: GameCategory;
  difficulty: Difficulty;
  userSettings?: UserSettings; // New Prop
  onEndGame: (stats: GameStats) => void;
  onExit: () => void;
}

type FeedbackState = 'none' | 'correct' | 'incorrect';

const TOTAL_QUESTIONS = 50;

const CATEGORY_LABELS: Record<GameCategory, string> = {
  addition: 'Sumas',
  subtraction: 'Restas',
  multiplication: 'Tablas',
  division: 'División',
  mixed_add_sub: 'Suma y Resta',
  mixed_mult_add: 'Mult + Oper',
  all_mixed: 'Experto',
  challenge: 'Desafío Mix'
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Nivel 1',
  easy_medium: 'Nivel 2',
  medium: 'Nivel 3',
  medium_hard: 'Nivel 4',
  hard: 'Nivel 5',
  random_tables: 'Aleatorio'
};

const GameScreen: React.FC<Props> = ({ category, difficulty, userSettings, onEndGame, onExit }) => {
  const [attempt, setAttempt] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [timeLeft, setTimeLeft] = useState(10);
  const [stats, setStats] = useState<GameStats>({ correct: 0, incorrect: 0, totalTime: 0 });
  const [feedback, setFeedback] = useState<FeedbackState>('none');
  const [maxTimeForQuestion, setMaxTimeForQuestion] = useState(10);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize first question & Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    loadNextQuestion(0);

    return () => {
      isMounted.current = false;
      clearTimer();
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Timer Logic
  useEffect(() => {
    if (feedback !== 'none') {
      clearTimer();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearTimer();
  }, [feedback, attempt]);

  const loadNextQuestion = (currentAttempt: number) => {
    if (!isMounted.current) return;

    if (currentAttempt >= TOTAL_QUESTIONS) {
      onEndGame(stats);
      return;
    }
    const q = generateQuestion(currentAttempt, category, difficulty);

    // Pass userSettings to calculation
    const timeLimit = calculateTimeLimit(currentAttempt, difficulty, category, userSettings);

    setQuestion(q);
    setAttempt(currentAttempt);
    setMaxTimeForQuestion(timeLimit);
    setTimeLeft(timeLimit);
    setInputValue('');
    setFeedback('none');

    setTimeout(() => {
      if (isMounted.current) {
        inputRef.current?.focus();
      }
    }, 50);
  };

  const handleTimeOut = () => {
    clearTimer();
    setFeedback('incorrect');
    setStats((prev) => ({
      ...prev,
      incorrect: prev.incorrect + 1,
      totalTime: prev.totalTime + maxTimeForQuestion
    }));

    transitionTimeoutRef.current = setTimeout(() => {
      loadNextQuestion(attempt + 1);
    }, 2000);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question || feedback !== 'none') return;

    clearTimer();

    const userAnswer = parseInt(inputValue);
    const timeSpent = maxTimeForQuestion - timeLeft;

    const isCorrect = !isNaN(userAnswer) && userAnswer === question.answer;

    if (isCorrect) {
      setFeedback('correct');
      setStats((prev) => ({
        ...prev,
        correct: prev.correct + 1,
        totalTime: prev.totalTime + timeSpent
      }));
      transitionTimeoutRef.current = setTimeout(() => {
        loadNextQuestion(attempt + 1);
      }, 800);
    } else {
      setFeedback('incorrect');
      setStats((prev) => ({
        ...prev,
        incorrect: prev.incorrect + 1,
        totalTime: prev.totalTime + timeSpent
      }));
      transitionTimeoutRef.current = setTimeout(() => {
        loadNextQuestion(attempt + 1);
      }, 2000);
    }
  };

  // --- VIRTUAL KEYPAD HANDLERS ---
  const handleKeypadInput = (num: number) => {
    if (feedback !== 'none') return;
    setInputValue(prev => {
      if (prev.length >= 6) return prev; // Limit length
      return prev + num.toString();
    });
    inputRef.current?.focus();
  };

  const handleBackspace = () => {
    if (feedback !== 'none') return;
    setInputValue(prev => prev.slice(0, -1));
    inputRef.current?.focus();
  };

  if (!question) return <div className="text-white">Cargando...</div>;

  let containerClass = "relative w-full max-w-md p-8 rounded-3xl backdrop-blur-xl border-2 transition-all duration-300 ";
  if (feedback === 'correct') containerClass += "bg-green-500/20 border-green-400 shadow-[0_0_30px_rgba(74,222,128,0.3)]";
  else if (feedback === 'incorrect') containerClass += "bg-red-500/20 border-red-400 shadow-[0_0_30px_rgba(248,113,113,0.3)]";
  else containerClass += "bg-white/10 border-white/10 shadow-2xl";

  const progressPercentage = (attempt / TOTAL_QUESTIONS) * 100;
  const timePercentage = (timeLeft / maxTimeForQuestion) * 100;

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-4 animate-fade-in-up">

      {/* Top Controls */}
      <div className="w-full max-w-4xl flex justify-between items-center px-4">
        <button
          onClick={onExit}
          className="flex items-center space-x-2 text-gray-500 hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
          title="Salir del juego"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium hidden sm:inline">Salir</span>
        </button>

        {/* Header Info */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center sm:space-x-6 text-gray-400 text-sm font-semibold uppercase tracking-wider">
          {/* Context Info */}
          <div className="flex items-center space-x-2 text-blue-300">
            <span className="hidden sm:inline">{CATEGORY_LABELS[category]}</span>
            <span className="text-gray-600 hidden sm:inline">|</span>
            <span className="text-yellow-500">{DIFFICULTY_LABELS[difficulty]}</span>
          </div>

          {/* Progress & Time */}
          <div className="flex space-x-4">
            <span>Pregunta {attempt + 1}/{TOTAL_QUESTIONS}</span>
            <span className={timeLeft <= 3 ? "text-red-400 animate-pulse" : "text-white"}>
              {timeLeft}s
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar (Full Width) */}
      <div className="w-full max-w-4xl h-2 bg-gray-700 rounded-full overflow-hidden mb-2 px-4 mx-auto">
        <div className="w-full h-full bg-gray-800 rounded-full relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-400 to-purple-500 transition-all duration-500 ease-out absolute left-0 top-0"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Split Layout for Landscape Tablets */}
      <div className="flex flex-col md:landscape:flex-row lg:flex-row items-center justify-center gap-6 w-full max-w-5xl px-4">

        {/* LEFT SIDE: QUESTION CARD */}
        <div className={`${containerClass} flex-1`}>

          {/* Timer Bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-white/10 overflow-hidden rounded-t-3xl">
            <div
              className={`h-full transition-all duration-1000 linear ${timeLeft <= 3 ? 'bg-red-500' : 'bg-blue-400'}`}
              style={{ width: `${timePercentage}%` }}
            />
          </div>

          <div className="flex flex-col items-center space-y-8 mt-4">
            <h2 className="text-6xl font-bold text-white tracking-tight drop-shadow-lg">
              {question.text}
            </h2>

            <form onSubmit={handleSubmit} className="w-full relative">
              <input
                ref={inputRef}
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-black/20 text-center text-4xl font-bold text-white py-4 rounded-xl border-2 border-white/10 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all placeholder-white/10"
                placeholder="?"
                autoFocus
                disabled={feedback !== 'none'}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                {feedback === 'correct' && <CheckCircle2 className="text-green-400 w-8 h-8 animate-bounce" />}
                {feedback === 'incorrect' && (
                  <div className="flex items-center space-x-2 animate-shake">
                    <span className="text-white bg-red-500 px-2 py-1 rounded text-sm font-bold shadow-lg">
                      Era: {question.answer}
                    </span>
                    <XCircle className="text-red-400 w-8 h-8" />
                  </div>
                )}
                {feedback === 'none' && <Clock className="text-gray-400 w-6 h-6 opacity-50" />}
              </div>
            </form>

            <div className="grid grid-cols-2 gap-4 w-full text-center">
              <div className="bg-white/5 rounded-lg p-2">
                <span className="block text-xs text-gray-400 uppercase">Correctas</span>
                <span className="text-xl font-bold text-green-400">{stats.correct}</span>
              </div>
              <div className="bg-white/5 rounded-lg p-2">
                <span className="block text-xs text-gray-400 uppercase">Errores</span>
                <span className="text-xl font-bold text-red-400">{stats.incorrect}</span>
              </div>
            </div>
          </div>

          <p className="text-gray-500 text-sm text-center mt-4 md:landscape:hidden lg:hidden">Presiona Enter para enviar</p>
        </div>

        {/* RIGHT SIDE: VIRTUAL KEYPAD */}
        <div className="hidden md:landscape:block lg:block w-[300px] h-full shrink-0">
          <div className="grid grid-cols-3 gap-3 p-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl shadow-xl">
            {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => handleKeypadInput(num)}
                disabled={feedback !== 'none'}
                className="aspect-square rounded-2xl bg-white/5 hover:bg-white/20 border border-white/10 text-3xl font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-sm"
              >
                {num}
              </button>
            ))}

            <button
              onClick={handleBackspace}
              disabled={feedback !== 'none'}
              className="aspect-square rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
            >
              <Delete size={28} />
            </button>

            <button
              onClick={() => handleKeypadInput(0)}
              disabled={feedback !== 'none'}
              className="aspect-square rounded-2xl bg-white/5 hover:bg-white/20 border border-white/10 text-3xl font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              0
            </button>

            <button
              onClick={() => handleSubmit()}
              disabled={feedback !== 'none'}
              className="aspect-square rounded-2xl bg-blue-500 hover:bg-blue-400 text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-blue-500/30 flex items-center justify-center"
            >
              <ArrowRight size={32} />
            </button>
          </div>
          <p className="text-center text-gray-500 text-xs mt-3 uppercase tracking-widest font-semibold opacity-60">Teclado Numérico</p>
        </div>

      </div>
    </div>
  );
};

export default GameScreen;
