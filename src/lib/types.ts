export const EXERCISE_TYPES = ["STRENGTH", "CARDIO"] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const RETENTION_DAYS = 30;
