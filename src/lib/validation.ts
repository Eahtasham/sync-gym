import { z } from "zod";
import { EXERCISE_TYPES } from "./types";

export const workoutDaySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50, "Too long"),
});
export type WorkoutDayInput = z.infer<typeof workoutDaySchema>;

export const exerciseSchema = z.object({
  workoutDayId: z.string().min(1),
  name: z.string().trim().min(1, "Name is required").max(60, "Too long"),
  type: z.enum(EXERCISE_TYPES),
});
export type ExerciseInput = z.infer<typeof exerciseSchema>;

export const exerciseUpdateSchema = exerciseSchema.omit({ workoutDayId: true });

/** A single strength set, as entered in the session screen. */
export const setSchema = z.object({
  weight: z.coerce.number().min(0, "≥ 0").max(2000, "Too high"),
  reps: z.coerce.number().int("Whole number").min(0, "≥ 0").max(1000, "Too high"),
});

/** Strength exercise log payload saved from the session screen. */
export const exerciseLogSchema = z.object({
  exerciseId: z.string().min(1),
  notes: z.string().max(500).optional().nullable(),
  sets: z.array(setSchema).max(30),
});

/** Cardio entry payload. */
export const cardioLogSchema = z.object({
  exerciseId: z.string().min(1).optional().nullable(),
  durationMinutes: z.coerce.number().min(0).max(1440),
  distanceKm: z.coerce.number().min(0).max(1000).optional().nullable(),
  calories: z.coerce.number().int().min(0).max(20000).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});
export type CardioLogInput = z.infer<typeof cardioLogSchema>;

export const pinSchema = z
  .string()
  .regex(/^\d{4}$/, "PIN must be 4 digits");
