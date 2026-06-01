/**
 * Simplified SM-2 Spaced Repetition System
 * Ratings: 0=Again, 1=Hard, 2=Good, 3=Easy
 * Cards go through learning steps (minutes) before graduating to daily review.
 */

export type SRSRating = 0 | 1 | 2 | 3;
export type CardStatus = "new" | "learning" | "review" | "known";

export interface WordProgress {
  wordId: string;
  status: CardStatus;
  easeFactor: number;   // 1.3–2.5
  interval: number;     // days (0 while in learning)
  repetitions: number;  // successful review count
  learningStep: number; // index into LEARNING_STEPS
  nextReview: string;   // ISO date string
  lastReview: string;   // ISO date string
}

// Learning steps in minutes before a card graduates to review
const LEARNING_STEPS = [1, 10];
const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function createNewProgress(wordId: string): WordProgress {
  return {
    wordId,
    status: "new",
    easeFactor: DEFAULT_EASE,
    interval: 0,
    repetitions: 0,
    learningStep: 0,
    nextReview: new Date().toISOString(),
    lastReview: new Date().toISOString(),
  };
}

export function calculateNextReview(
  card: WordProgress,
  rating: SRSRating
): WordProgress {
  const now = new Date();
  const updated = { ...card, lastReview: now.toISOString() };

  // --- Again: reset to start of learning ---
  if (rating === 0) {
    return {
      ...updated,
      status: "learning",
      learningStep: 0,
      interval: 0,
      repetitions: 0,
      easeFactor: Math.max(MIN_EASE, card.easeFactor - 0.2),
      nextReview: addMinutes(now, LEARNING_STEPS[0]).toISOString(),
    };
  }

  // --- Cards still in learning (new/learning) ---
  if (card.status === "new" || card.status === "learning") {
    if (rating === 3) {
      // Easy: skip remaining steps, graduate immediately
      return {
        ...updated,
        status: "review",
        learningStep: 0,
        repetitions: 1,
        interval: 1,
        easeFactor: card.easeFactor + 0.15,
        nextReview: addDays(now, 1).toISOString(),
      };
    }

    const nextStep = card.learningStep + 1;
    if (nextStep < LEARNING_STEPS.length) {
      // Advance within learning steps
      return {
        ...updated,
        status: "learning",
        learningStep: nextStep,
        nextReview: addMinutes(now, LEARNING_STEPS[nextStep]).toISOString(),
      };
    } else {
      // Graduate to review with 1-day interval
      return {
        ...updated,
        status: "review",
        learningStep: 0,
        repetitions: 1,
        interval: 1,
        nextReview: addDays(now, 1).toISOString(),
      };
    }
  }

  // --- Review cards ---
  let newInterval: number;
  let newEase = card.easeFactor;

  if (rating === 1) {
    // Hard: smaller interval, ease decreases
    newInterval = Math.max(1, Math.ceil(card.interval * 1.2));
    newEase = Math.max(MIN_EASE, card.easeFactor - 0.15);
  } else if (rating === 2) {
    // Good: normal progression
    newInterval = Math.max(1, Math.ceil(card.interval * card.easeFactor));
  } else {
    // Easy: bonus multiplier, ease increases
    newInterval = Math.max(1, Math.ceil(card.interval * card.easeFactor * 1.3));
    newEase = card.easeFactor + 0.15;
  }

  // If first review after graduating, ensure minimum interval
  if (card.interval <= 1) {
    newInterval = rating === 1 ? 1 : rating === 2 ? 3 : 4;
  }

  return {
    ...updated,
    status: newInterval >= 21 ? "known" : "review",
    easeFactor: Math.min(2.5, newEase),
    interval: newInterval,
    repetitions: card.repetitions + 1,
    nextReview: addDays(now, newInterval).toISOString(),
  };
}

export function isDue(card: WordProgress): boolean {
  return new Date(card.nextReview) <= new Date();
}

export function getDueCards(progress: WordProgress[]): WordProgress[] {
  return progress.filter(isDue);
}
