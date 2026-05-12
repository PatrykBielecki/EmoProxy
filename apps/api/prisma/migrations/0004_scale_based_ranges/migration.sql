-- Replace physical size/speed range and threshold fields in SurveyConfig with
-- admin-configurable survey slider scale fields. Physical min/max boundaries are
-- now hardcoded in application code (50–250 px for size, 0.5–3.0 for speed factor).
ALTER TABLE "SurveyConfig"
  DROP COLUMN "minSize",
  DROP COLUMN "maxSize",
  DROP COLUMN "sizeThreshold",
  DROP COLUMN "minSpeed",
  DROP COLUMN "maxSpeed",
  DROP COLUMN "speedThreshold",
  ADD COLUMN "minSizeScale"  DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN "maxSizeScale"  DOUBLE PRECISION NOT NULL DEFAULT 10,
  ADD COLUMN "minSpeedScale" DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN "maxSpeedScale" DOUBLE PRECISION NOT NULL DEFAULT 10;

-- Remove per-animation physical size/speed bounds (now hardcoded globally).
ALTER TABLE "AnimationPreset"
  DROP COLUMN "minSize",
  DROP COLUMN "maxSize",
  DROP COLUMN "minSpeed",
  DROP COLUMN "maxSpeed";
