
export enum GameScreenState {
  LOGIN, // New initial state
  WELCOME,
  PLAYING,
  RESULTS,
  LEADERBOARD,
  STUDY_TABLES,
  PROFILE, // New Profile Screen
  ADMIN_PANEL // New Admin Dashboard
}

export type GameCategory =
  | 'challenge'
  | 'addition'
  | 'subtraction'
  | 'multiplication'
  | 'division'
  | 'mixed_add_sub'
  | 'mixed_mult_add'
  | 'all_mixed';

export type Difficulty = 'easy' | 'easy_medium' | 'medium' | 'medium_hard' | 'hard' | 'random_tables';

export interface Question {
  text: string;
  answer: number;
}

export interface ScoreRecord {
  id: string;
  user: string;
  score: number;
  correctCount: number;
  errorCount: number;
  avgTime: number;
  date: string;
  category?: string;
  difficulty?: string;
}

export interface GameStats {
  correct: number;
  incorrect: number;
  totalTime: number;
}

// --- NEW USER TYPES ---

export type UserRole = 'ADMIN' | 'USER';
export type UserStatus = 'ACTIVE' | 'BANNED';

export interface UserSettings {
  customTimers?: Partial<Record<Difficulty, number>>; // Custom seconds per difficulty
  unlockedLevels?: Record<string, number>; // Category -> Level Index
}

export interface User {
  id: string;
  username: string;
  email: string;
  password: string; // Legacy field - not used with Firebase Auth
  role: UserRole;
  status: UserStatus;
  avatar?: string; // Base64 string
  createdAt: string;
  lastLogin?: string;
  settings: UserSettings;
  unlockedLevel: number; // 0=Easy, 1=EasyMedium, etc. (Max 4)
}

export interface CategoryProgress {
  category: string;
  unlocked_level: number;
  total_games: number;
  total_score: number;
  total_correct: number;
  total_errors: number;
  total_time_seconds: number;
  accuracy_rate?: number;
  avg_response_time?: number;
}
