import type { WordProgress } from "./srs";

const STORAGE_VERSION = 2;
const PROGRESS_KEY = `hsk-progress-v${STORAGE_VERSION}`;
const STREAK_KEY = `hsk-streak-v${STORAGE_VERSION}`;

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null; // YYYY-MM-DD
  totalDaysStudied: number;
}

export interface StorageData {
  progress: Record<string, WordProgress>;
  streak: StreakData;
}

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastStudyDate: null,
  totalDaysStudied: 0,
};

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Progress ──────────────────────────────────────────────────

export function loadProgress(): Record<string, WordProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, WordProgress>;
  } catch {
    return {};
  }
}

export function saveProgress(progress: Record<string, WordProgress>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function clearProgress(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROGRESS_KEY);
  localStorage.removeItem(STREAK_KEY);
}

// ── Streak ────────────────────────────────────────────────────

export function loadStreak(): StreakData {
  if (typeof window === "undefined") return DEFAULT_STREAK;
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return DEFAULT_STREAK;
    return JSON.parse(raw) as StreakData;
  } catch {
    return DEFAULT_STREAK;
  }
}

export function saveStreak(streak: StreakData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
}

/** Call this once per study session to update streak. */
export function updateStreak(): StreakData {
  const streak = loadStreak();
  const todayStr = today();

  if (streak.lastStudyDate === todayStr) return streak; // already counted

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  const newStreak: StreakData = {
    currentStreak:
      streak.lastStudyDate === yesterdayStr
        ? streak.currentStreak + 1
        : 1,
    longestStreak: 0,
    lastStudyDate: todayStr,
    totalDaysStudied: streak.totalDaysStudied + 1,
  };
  newStreak.longestStreak = Math.max(
    streak.longestStreak,
    newStreak.currentStreak
  );

  saveStreak(newStreak);
  return newStreak;
}

// ── Export / Import ───────────────────────────────────────────

export function exportData(): string {
  const progress = loadProgress();
  const streak = loadStreak();
  return JSON.stringify(
    { version: STORAGE_VERSION, progress, streak, exportedAt: new Date().toISOString() },
    null,
    2
  );
}

export function importData(json: string): { success: boolean; error?: string } {
  try {
    const data = JSON.parse(json) as {
      version?: number;
      progress: Record<string, WordProgress>;
      streak: StreakData;
    };
    if (!data.progress || typeof data.progress !== "object") {
      return { success: false, error: "Invalid data format" };
    }
    saveProgress(data.progress);
    if (data.streak) saveStreak(data.streak);
    return { success: true };
  } catch {
    return { success: false, error: "Failed to parse JSON" };
  }
}
