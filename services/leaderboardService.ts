import { LeaderboardEntry } from "../types";

const STORAGE_KEY = 'anime_nexus_leaderboard';

export const getLeaderboard = (gameMode: string): LeaderboardEntry[] => {
  try {
    const data = localStorage.getItem(`${STORAGE_KEY}_${gameMode}`);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load leaderboard", e);
    return [];
  }
};

export const saveScore = (gameMode: string, entry: LeaderboardEntry): LeaderboardEntry[] => {
  try {
    const current = getLeaderboard(gameMode);
    const updated = [...current, entry]
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, 10); // Keep top 10
    
    localStorage.setItem(`${STORAGE_KEY}_${gameMode}`, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Failed to save score", e);
    return [];
  }
};

export const clearLeaderboard = (gameMode: string) => {
    localStorage.removeItem(`${STORAGE_KEY}_${gameMode}`);
};