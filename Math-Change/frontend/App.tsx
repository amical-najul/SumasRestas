import React, { useState, useEffect } from 'react';
import { GameScreenState, GameStats, GameCategory, ScoreRecord, Difficulty, User } from './types';
import WelcomeScreen from './components/WelcomeScreen';
import GameScreen from './components/GameScreen';
import ResultsScreen from './components/ResultsScreen';
import LeaderboardScreen from './components/LeaderboardScreen';
import StudyTablesScreen from './components/StudyTablesScreen';
import LoginScreen from './components/LoginScreen';
import ProfileScreen from './components/ProfileScreen';
import AdminPanel from './components/AdminPanel';
import { saveScore, saveUser, getCurrentUserFull } from './services/storageService';
import * as firebaseAuth from './services/firebaseAuthService';
import { User as FirebaseUser } from 'firebase/auth';

const App: React.FC = () => {
  // Start at LOGIN screen
  const [screen, setScreen] = useState<GameScreenState>(GameScreenState.LOGIN);

  // Current User Session (null if guest)
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [username, setUsername] = useState('');
  const [category, setCategory] = useState<GameCategory>('challenge');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [gameStats, setGameStats] = useState<GameStats | null>(null);

  // Auto-Restore Session with Firebase Auth State
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChange(async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser && firebaseUser.emailVerified) {
        try {
          // Sync with Backend to get Level/Avatar/Settings
          const dbUser = await getCurrentUserFull();
          setCurrentUser(dbUser);
          setUsername(dbUser.username);
        } catch (error) {
          console.error("Error syncing user profile:", error);
          // Fallback: Use basic Firebase info if backend fails
          const fallbackUser: User = {
            id: firebaseUser.uid,
            username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
            email: firebaseUser.email || '',
            password: '',
            role: 'USER',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            settings: {},
            unlockedLevel: 0
          };
          setCurrentUser(fallbackUser);
          setUsername(fallbackUser.username);
        }
        setScreen(GameScreenState.WELCOME);
      } else {
        // User is signed out or email not verified
        setCurrentUser(null);
        setUsername('');
        if (screen !== GameScreenState.LOGIN) {
          setScreen(GameScreenState.LOGIN);
        }
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Difficulty Mapping for Progression
  const difficultyOrder: Difficulty[] = ['easy', 'easy_medium', 'medium', 'medium_hard', 'hard', 'random_tables'];

  // --- AUTH HANDLERS ---
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setUsername(user.username);
    setScreen(GameScreenState.WELCOME);
  };

  const handleGuestPlay = () => {
    setCurrentUser(null);
    setUsername('');
    setScreen(GameScreenState.WELCOME);
  };

  const handleLogout = async () => {
    await firebaseAuth.logout();
    setCurrentUser(null);
    setUsername('');
    setScreen(GameScreenState.LOGIN);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setUsername(updatedUser.username);
  };

  // --- GAME HANDLERS ---

  const handleStartGame = (name: string, selectedCategory: GameCategory, selectedDifficulty: Difficulty) => {
    setUsername(name);
    setCategory(selectedCategory);
    setDifficulty(selectedDifficulty);
    setScreen(GameScreenState.PLAYING);
  };

  const handleShowLeaderboard = (name: string) => {
    setUsername(name);
    setScreen(GameScreenState.LEADERBOARD);
  };

  const handleEndGame = async (stats: GameStats) => {
    const totalQuestions = stats.correct + stats.incorrect;
    const score = totalQuestions > 0 ? Math.round((stats.correct / totalQuestions) * 100) : 0;
    const avgTime = totalQuestions > 0 ? parseFloat((stats.totalTime / totalQuestions).toFixed(2)) : 0;

    const record: ScoreRecord = {
      id: Date.now().toString(),
      user: username,
      score: score,
      correctCount: stats.correct,
      errorCount: stats.incorrect,
      avgTime: avgTime,
      date: new Date().toISOString(),
      category: category,
      difficulty: category === 'challenge' ? 'mixed' : difficulty
    };

    try {
      await saveScore(record);
    } catch (error: any) {
      console.error("Failed to save score:", error);
      alert(`Error guardando puntuación: ${error.message || 'Error desconocido'}`);
    }

    // --- LEVEL PROGRESSION LOGIC ---
    if (currentUser && currentUser.role !== 'ADMIN') {
      const currentDiffIndex = difficultyOrder.indexOf(difficulty);

      // Note: We don't need to check currentUnlocked strictly here because the API endpoints
      // in 'unlockLevel' handle the "don't downgrade" logic. 
      // We just need to know IF they passed a level that SHOULD unlock the next one.

      // If user passed this difficulty (and presumably it was their max or lower)
      if (currentDiffIndex !== -1 && currentDiffIndex < difficultyOrder.length - 1) {
        // Determine if pass? Let's say score >= 60%
        if (score >= 60) {
          const nextLevel = currentDiffIndex + 1;

          // Call API to attempt unlock
          // The backend guarantees it only updates if newLevel > currentLevel
          import('./services/storageService').then(service => {
            service.unlockLevel(category, nextLevel);
          });

          // We can optimistic update local currentUser if we want, but since we use
          // WelcomeScreen to fetch progress, we might just rely on that.
          // For Global Legacy 'unlockedLevel' update (Visual feedback immediately if used)
          const updatedUser: User = {
            ...currentUser,
            unlockedLevel: Math.max(currentUser.unlockedLevel, nextLevel)
          };
          setCurrentUser(updatedUser);
        }
      }
    }

    setGameStats(stats);
    setScreen(GameScreenState.RESULTS);
  };

  const handleRestart = () => {
    setScreen(GameScreenState.PLAYING);
  };

  const handleNextLevel = () => {
    const currentIndex = difficultyOrder.indexOf(difficulty);
    if (currentIndex !== -1 && currentIndex < difficultyOrder.length - 1) {
      const nextDiff = difficultyOrder[currentIndex + 1];
      setDifficulty(nextDiff);
      setScreen(GameScreenState.PLAYING);
    }
  };

  const handleGoHome = () => {
    setScreen(GameScreenState.WELCOME);
    setGameStats(null);
  };

  // Helper to determine if next level button should show
  const currentDiffIndex = difficultyOrder.indexOf(difficulty);
  const hasNextLevel = category !== 'challenge' && currentDiffIndex !== -1 && currentDiffIndex < difficultyOrder.length - 1;
  const totalQ = gameStats ? gameStats.correct + gameStats.incorrect : 0;
  const lastScore = gameStats && totalQ > 0 ? (gameStats.correct / totalQ) * 100 : 0;
  const isPass = lastScore >= 60;

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-700 via-slate-900 to-black flex flex-col items-center justify-center p-4 overflow-hidden">

      {/* Decorative Circles */}
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-4xl flex justify-center items-center relative z-10 min-h-[600px]">

        {screen === GameScreenState.LOGIN && (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onGuestPlay={handleGuestPlay}
          />
        )}

        {screen === GameScreenState.WELCOME && (
          <WelcomeScreen
            user={currentUser}
            onStart={handleStartGame}
            onLeaderboard={handleShowLeaderboard}
            onStudy={() => setScreen(GameScreenState.STUDY_TABLES)}
            onProfile={() => setScreen(GameScreenState.PROFILE)}
            onAdmin={() => setScreen(GameScreenState.ADMIN_PANEL)}
            onLogout={handleLogout}
          />
        )}

        {screen === GameScreenState.PLAYING && (
          <GameScreen
            category={category}
            difficulty={difficulty}
            userSettings={currentUser?.settings}
            onEndGame={handleEndGame}
            onExit={handleGoHome}
          />
        )}

        {screen === GameScreenState.RESULTS && gameStats && (
          <ResultsScreen
            stats={gameStats}
            username={username}
            onRestart={handleRestart}
            onHome={handleGoHome}
            onNextLevel={handleNextLevel}
            hasNextLevel={hasNextLevel}
            isPass={isPass}
          />
        )}

        {screen === GameScreenState.LEADERBOARD && (
          <LeaderboardScreen
            username={username}
            onBack={() => setScreen(GameScreenState.WELCOME)}
          />
        )}

        {screen === GameScreenState.STUDY_TABLES && (
          <StudyTablesScreen
            onBack={() => setScreen(GameScreenState.WELCOME)}
            onPractice={() => handleStartGame(username || 'Estudiante', 'multiplication', 'random_tables')}
          />
        )}

        {screen === GameScreenState.PROFILE && currentUser && (
          <ProfileScreen
            user={currentUser}
            onUpdateUser={handleUpdateUser}
            onBack={() => setScreen(GameScreenState.WELCOME)}
          />
        )}

        {screen === GameScreenState.ADMIN_PANEL && currentUser?.role === 'ADMIN' && (
          <AdminPanel
            onBack={() => setScreen(GameScreenState.WELCOME)}
          />
        )}
      </div>
    </div>
  );
};

export default App;
