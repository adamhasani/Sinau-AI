// Simple Spaced Repetition System (SuperMemo-2 Inspired)
export const calculateNextReview = (quality: number, interval: number, repetitions: number, easeFactor: number) => {
  // quality: 0-5
  // quality < 3: reset repetitions
  let nextInterval: number;
  let nextRepetitions: number;
  let nextEaseFactor: number = easeFactor;

  if (quality >= 3) {
    if (repetitions === 0) {
      nextInterval = 1;
    } else if (repetitions === 1) {
      nextInterval = 6;
    } else {
      nextInterval = Math.round(interval * easeFactor);
    }
    nextRepetitions = repetitions + 1;
  } else {
    nextInterval = 1;
    nextRepetitions = 0;
  }

  nextEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (nextEaseFactor < 1.3) nextEaseFactor = 1.3;

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + nextInterval);

  return {
    nextReviewDate: nextDate.toISOString(),
    interval: nextInterval,
    repetitions: nextRepetitions,
    easeFactor: nextEaseFactor
  };
};

export const getMasteryColor = (mastery: number) => {
  if (mastery >= 5) return 'bg-emerald-500';
  if (mastery >= 3) return 'bg-sky-500';
  if (mastery >= 1) return 'bg-amber-500';
  return 'bg-slate-300';
};
