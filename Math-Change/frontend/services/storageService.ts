import { ScoreRecord, User, UserRole } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function apiRequest<T>(endpoint: string, method: string = 'GET', body?: any): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'API Error');
  }

  return response.json() as Promise<T>;
}

// --- SCORE MANAGEMENT ---

export const saveScore = async (record: ScoreRecord): Promise<void> => {
  try {
    await apiRequest('/scores', 'POST', record);
  } catch (error) {
    console.error("Error saving score:", error);
  }
};

export const getTopScoresByUser = async (username: string): Promise<ScoreRecord[]> => {
  try {
    const scores = await apiRequest<ScoreRecord[]>(`/scores?user=${encodeURIComponent(username)}`);
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  } catch (error) {
    console.error("Error fetching top scores:", error);
    return [];
  }
};

// NEW: Get all scores for admin analytics
export const getAllScores = async (): Promise<ScoreRecord[]> => {
  try {
    return await apiRequest<ScoreRecord[]>('/scores');
  } catch (error) {
    console.error("Error fetching all scores:", error);
    return [];
  }
};

// NEW: Get basic stats (used in table list)
export const getUserStatsSummary = async (username: string) => {
  const userScores = await apiRequest<ScoreRecord[]>(`/scores?user=${encodeURIComponent(username)}`); // Optimized to fetch only user scores

  const totalGames = userScores.length;
  if (totalGames === 0) {
    return { totalGames: 0, avgScore: 0, accuracy: 0, recentGames: [] };
  }

  const totalScore = userScores.reduce((acc, curr) => acc + curr.score, 0);
  const totalCorrect = userScores.reduce((acc, curr) => acc + curr.correctCount, 0);
  const totalQuestions = userScores.reduce((acc, curr) => acc + (curr.correctCount + curr.errorCount), 0);

  const avgScore = Math.round(totalScore / totalGames);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  // Sort by date descending
  const recentGames = userScores.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  return { totalGames, avgScore, accuracy, recentGames };
};

// NEW: Advanced Analytics for Charts and Breakdowns
export const getUserDetailedAnalytics = async (username: string) => {
  // Can optimize by fetching only user scores if backend supports it (which it does now)
  const userScores = await apiRequest<ScoreRecord[]>(`/scores?user=${encodeURIComponent(username)}`);

  // Filter and Sort by Date Ascending for the Graph
  userScores.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (userScores.length === 0) return null;

  // 1. History for Graph
  const history = userScores.map(s => ({
    date: new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    score: s.score,
    category: s.category || 'N/A',
    difficulty: s.difficulty || 'N/A'
  }));

  // 2. Breakdown by Category
  const byCategory: Record<string, { games: number; totalScore: number; totalTime: number; correct: number; totalQ: number }> = {};

  // 3. Breakdown by Difficulty
  const byDifficulty: Record<string, { games: number; totalScore: number; totalTime: number; correct: number; totalQ: number }> = {};

  userScores.forEach(s => {
    // Init Category
    const cat = s.category || 'Unknown';
    if (!byCategory[cat]) byCategory[cat] = { games: 0, totalScore: 0, totalTime: 0, correct: 0, totalQ: 0 };
    byCategory[cat].games++;
    byCategory[cat].totalScore += s.score;
    byCategory[cat].totalTime += s.avgTime; // Storing sum of averages to average later
    byCategory[cat].correct += s.correctCount;
    byCategory[cat].totalQ += (s.correctCount + s.errorCount);

    // Init Difficulty
    const diff = s.difficulty || 'Unknown';
    if (!byDifficulty[diff]) byDifficulty[diff] = { games: 0, totalScore: 0, totalTime: 0, correct: 0, totalQ: 0 };
    byDifficulty[diff].games++;
    byDifficulty[diff].totalScore += s.score;
    byDifficulty[diff].totalTime += s.avgTime;
    byDifficulty[diff].correct += s.correctCount;
    byDifficulty[diff].totalQ += (s.correctCount + s.errorCount);
  });

  // Helper to process aggregations
  const processBreakdown = (obj: any) => {
    return Object.keys(obj).map(key => {
      const d = obj[key];
      return {
        key,
        games: d.games,
        avgScore: Math.round(d.totalScore / d.games),
        avgTimePerQuestion: parseFloat((d.totalTime / d.games).toFixed(2)),
        accuracy: d.totalQ > 0 ? Math.round((d.correct / d.totalQ) * 100) : 0,
        errors: d.totalQ - d.correct
      };
    });
  };

  return {
    history, // For Chart
    byCategory: processBreakdown(byCategory),
    byDifficulty: processBreakdown(byDifficulty),
    totalGames: userScores.length
  };
};

// --- USER MANAGEMENT ---

export const getAllUsers = async (): Promise<User[]> => {
  try {
    return await apiRequest<User[]>('/users');
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const saveUser = async (userToSave: User): Promise<void> => {
  try {
    await apiRequest('/users', 'POST', userToSave);
  } catch (e) {
    console.error("Error saving user", e);
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  console.warn("Delete user not implemented related to Supabase yet. Requires Admin API or direct DB deletion.");
  // Implementation depends on backend endpoint
};

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  // This is inefficient to fetch all, but sticking to previous interface logic roughly.
  // Better: add endpoint to search by email.
  // But standard users list is okay for admin.
  // For login we use specific login endpoint.
  // Let's implement a specific search optimization if possible, or just fetch all for now or rely on login's return.
  // Wait, loginUser calls this? No, loginUser in backend handles it.
  // Only used for registration check?
  try {
    // We don't have get-by-email endpoint publicly, but let's assume valid usage
    // Actually, let's just return undefined and let the backend endpoints handle uniqueness checks (register/login).
    return undefined;
  } catch (e) { return undefined; }
};

// --- AUTH SERVICES ---

export const loginUser = async (email: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
  try {
    const data = await apiRequest<any>('/login', 'POST', { email, password });
    if (data.success) {
      return { success: true, user: data.user };
    }
    return { success: false, message: data.message || "Login failed" };
  } catch (e: any) {
    return { success: false, message: e.message || "Error de conexión" };
  }
};

export const registerUser = async (username: string, email: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
  try {
    // New User creation is handled by backend which assigns ID and Dates
    const dummyUser = { username, email, password }; // Backend expects UserCreate structure
    const data = await apiRequest<any>('/register', 'POST', dummyUser);
    if (data.success) {
      return { success: true, user: data.user };
    }
    return { success: false, message: data.message || "Error al registrar" };
  } catch (e: any) {
    return { success: false, message: e.message || "Error de conexión" };
  }
};

// --- ANALYTICS HELPERS ---
export const getStorageUsage = (): string => {
  return "Cloud";
};

