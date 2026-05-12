import { z } from 'zod';

// Hardcoded physical boundaries for animation size (pixels) and speed (animation duration inverse).
// These are intentionally not configurable by admin – they define the real-world extremes.
export const HARDCODED_MIN_SIZE_PX = 50;
export const HARDCODED_MAX_SIZE_PX = 250;
// Speed is stored as a "speed factor" where higher = faster.
// Animation duration (seconds) = Math.max(0.1, 3 - speed).
// At MIN_SPEED (0.5) → 2.5 s/cycle ≈ 0.4 cycles/s (slowest)
// At MAX_SPEED (3.0) → clamped to 0.1 s/cycle = 10 cycles/s (fastest)
export const HARDCODED_MIN_SPEED = 0.5;
export const HARDCODED_MAX_SPEED = 3.0;

/** Map a scale value (e.g. 1–10) to a physical pixel size (50–250 px). */
export function scaleToSize(scaleValue: number, minScale: number, maxScale: number): number {
  if (maxScale === minScale) return HARDCODED_MIN_SIZE_PX;
  const t = (scaleValue - minScale) / (maxScale - minScale);
  return HARDCODED_MIN_SIZE_PX + t * (HARDCODED_MAX_SIZE_PX - HARDCODED_MIN_SIZE_PX);
}

/** Map a physical pixel size back to a scale value. */
export function sizeToScale(sizePx: number, minScale: number, maxScale: number): number {
  const range = HARDCODED_MAX_SIZE_PX - HARDCODED_MIN_SIZE_PX;
  if (range === 0) return minScale;
  const t = (sizePx - HARDCODED_MIN_SIZE_PX) / range;
  return minScale + t * (maxScale - minScale);
}

/** Map a scale value (e.g. 1–10) to a physical speed factor (0.5–3.0). */
export function scaleToSpeed(scaleValue: number, minScale: number, maxScale: number): number {
  if (maxScale === minScale) return HARDCODED_MIN_SPEED;
  const t = (scaleValue - minScale) / (maxScale - minScale);
  return HARDCODED_MIN_SPEED + t * (HARDCODED_MAX_SPEED - HARDCODED_MIN_SPEED);
}

/** Map a physical speed factor back to a scale value. */
export function speedToScale(speed: number, minScale: number, maxScale: number): number {
  const range = HARDCODED_MAX_SPEED - HARDCODED_MIN_SPEED;
  if (range === 0) return minScale;
  const t = (speed - HARDCODED_MIN_SPEED) / range;
  return minScale + t * (maxScale - minScale);
}

/**
 * Convert a physical speed factor to animation cycles per second.
 * Animation duration (s) = Math.max(0.1, 3 − speed), so cycles/s = 1 / duration.
 */
export function speedToCyclesPerSecond(speed: number): number {
  return 1 / Math.max(0.1, 3 - speed);
}

export const storageModeSchema = z.enum(['internal_postgres', 'external_postgres', 'google_sheets']);
export type StorageMode = z.infer<typeof storageModeSchema>;

export const animationTypeSchema = z.string().min(1);
export const shapeSchema = z.string().min(1);

export const emotionSchema = z.object({
  id: z.string().optional(),
  key: z.string().min(1),
  label: z.string().min(1),
  order: z.number().int().nonnegative(),
  enabled: z.boolean().default(true)
});

export const additionalFieldTypeSchema = z.enum(['text', 'number', 'boolean']);

export const additionalFieldSchema = z.object({
  id: z.string().optional(),
  key: z.string().min(1),
  label: z.string().min(1),
  type: additionalFieldTypeSchema,
  required: z.boolean().default(false),
  enabled: z.boolean().default(true),
  order: z.number().int().nonnegative()
});

export const animationPresetSchema = z.object({
  id: z.string().optional(),
  keyframesJson: z.string().optional().or(z.literal('')),
  name: z.string().min(1),
  type: animationTypeSchema,
  enabled: z.boolean().default(true)
});

export const shapePresetSchema = z.object({
  id: z.string().optional(),
  key: z.string().min(1),
  name: z.string().min(1),
  svg: z.string().optional().or(z.literal('')),
  enabled: z.boolean().default(true),
  order: z.number().int().nonnegative()
});

export const vadSchema = z.object({
  valence: z.number().min(0).max(10),
  arousal: z.number().min(0).max(10),
  dominance: z.number().min(0).max(10)
});

export const emotionResponseSchema = z.object({
  emotionKey: z.string().min(1),
  shape: shapeSchema,
  animationType: animationTypeSchema,
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  size: z.number().min(1),
  speed: z.number().min(0.1),
  vad: vadSchema
});

export const demographicsSchema = z.object({
  age: z.number().int().min(1).max(120).optional(),
  country: z.string().max(100).optional(),
  gender: z.string().max(50).optional(),
  additional: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional()
});

export const surveySubmissionSchema = z.object({
  responses: z.array(emotionResponseSchema).min(1),
  demographics: demographicsSchema.optional()
});
export type SurveySubmission = z.infer<typeof surveySubmissionSchema>;

export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8)
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8)
});

export const createUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8)
});

export const analyticsSettingsSchema = z.object({
  outlierFilteringEnabled: z.boolean(),
  zScoreThreshold: z.number().positive()
});

export const storageConfigSchema = z.object({
  mode: storageModeSchema,
  externalDatabaseUrl: z.string().url().optional().or(z.literal('')),
  googleSheetId: z.string().optional().or(z.literal('')),
  googleServiceAccountJson: z.string().optional().or(z.literal(''))
});

export const surveyConfigSchema = z.object({
  introTitle: z.string().min(1),
  introDescription: z.string().min(1),
  emotionCount: z.number().int().positive().optional(),
  // Scale range for the survey sliders (e.g. 1–10). Actual physical min/max are hardcoded.
  minSizeScale: z.number().min(0).default(1),
  maxSizeScale: z.number().min(0).default(10),
  minSpeedScale: z.number().min(0).default(1),
  maxSpeedScale: z.number().min(0).default(10),
  emotions: z.array(emotionSchema),
  shapes: z.array(shapePresetSchema).min(1),
  animations: z.array(animationPresetSchema),
  additionalFields: z.array(additionalFieldSchema).optional().default([])
});

export type SurveyConfig = z.infer<typeof surveyConfigSchema>;
