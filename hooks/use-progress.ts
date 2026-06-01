"use client";

import { useState, useEffect, useCallback } from "react";
import type { WordProgress, SRSRating, CardStatus } from "@/lib/srs";
import { createNewProgress, calculateNextReview, isDue } from "@/lib/srs";
import {
  loadProgress,
  saveProgress,
  loadStreak,
  saveStreak,
  updateStreak,
  type StreakData,
} from "@/lib/storage";
import { hskVocabulary } from "@/data/hsk-vocabulary";

export interface ProgressStats {
  total: number;
  new: number;
  learning: number;
  review: number;
  known: number;
  dueNow: number;
}

export interface LevelStats {
  level: number;
  total: number;
  new: number;
  learning: number;
  review: number;
  known: number;
}

export function useProgress() {
  const [progress, setProgress] = useState<Record<string, WordProgress>>({});
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastStudyDate: null,
    totalDaysStudied: 0,
  });
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount (client only)
  useEffect(() => {
    setProgress(loadProgress());
    setStreak(loadStreak());
    setHydrated(true);
  }, []);

  // Persist to localStorage whenever progress changes
  useEffect(() => {
    if (hydrated) saveProgress(progress);
  }, [progress, hydrated]);

  const getWordProgress = useCallback(
    (wordId: string): WordProgress => {
      return progress[wordId] ?? createNewProgress(wordId);
    },
    [progress]
  );

  const rateWord = useCallback(
    (wordId: string, rating: SRSRating): WordProgress => {
      const current = progress[wordId] ?? createNewProgress(wordId);
      const updated = calculateNextReview(current, rating);
      setProgress((prev) => ({ ...prev, [wordId]: updated }));

      // Update streak on first interaction each day
      const newStreak = updateStreak();
      setStreak(newStreak);
      saveStreak(newStreak);

      return updated;
    },
    [progress]
  );

  const markKnown = useCallback((wordId: string) => {
    setProgress((prev) => ({
      ...prev,
      [wordId]: {
        ...(prev[wordId] ?? createNewProgress(wordId)),
        status: "known" as CardStatus,
        interval: 21,
      },
    }));
  }, []);

  const resetWord = useCallback((wordId: string) => {
    setProgress((prev) => {
      const next = { ...prev };
      delete next[wordId];
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    setProgress({});
  }, []);

  // ── Statistics ─────────────────────────────────────────────

  const getStats = useCallback(
    (levelFilter?: number): ProgressStats => {
      const words = levelFilter
        ? hskVocabulary.filter((w) => w.level === levelFilter)
        : hskVocabulary;

      let newCount = 0, learning = 0, review = 0, known = 0, dueNow = 0;

      for (const word of words) {
        const p = progress[word.id];
        if (!p || p.status === "new") {
          newCount++;
        } else if (p.status === "learning") {
          learning++;
          if (isDue(p)) dueNow++;
        } else if (p.status === "review") {
          review++;
          if (isDue(p)) dueNow++;
        } else {
          known++;
        }
      }

      // Count new cards as due (they haven't been started yet)
      dueNow += newCount;

      return { total: words.length, new: newCount, learning, review, known, dueNow };
    },
    [progress]
  );

  const getLevelStats = useCallback((): LevelStats[] => {
    return [1, 2, 3, 4, 5, 6].map((level) => {
      const stats = getStats(level);
      return { level, ...stats };
    });
  }, [getStats]);

  const getDueWords = useCallback(
    (levelFilter?: number) => {
      const words = levelFilter
        ? hskVocabulary.filter((w) => w.level === levelFilter)
        : hskVocabulary;

      return words.filter((word) => {
        const p = progress[word.id];
        if (!p || p.status === "new") return true;
        return isDue(p);
      });
    },
    [progress]
  );

  return {
    progress,
    streak,
    hydrated,
    getWordProgress,
    rateWord,
    markKnown,
    resetWord,
    resetAll,
    getStats,
    getLevelStats,
    getDueWords,
  };
}
