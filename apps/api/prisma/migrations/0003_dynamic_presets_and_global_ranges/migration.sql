-- Alter survey configuration with global range/threshold settings
ALTER TABLE "SurveyConfig"
ADD COLUMN "minSize" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN "maxSize" DOUBLE PRECISION NOT NULL DEFAULT 250,
ADD COLUMN "sizeThreshold" DOUBLE PRECISION NOT NULL DEFAULT 150,
ADD COLUMN "minSpeed" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN "maxSpeed" DOUBLE PRECISION NOT NULL DEFAULT 3,
ADD COLUMN "speedThreshold" DOUBLE PRECISION NOT NULL DEFAULT 1.5;

-- Relax animation preset uniqueness to `type` (key) and add optional custom keyframes JSON
ALTER TABLE "AnimationPreset"
ADD COLUMN "keyframesJson" TEXT;

DROP INDEX IF EXISTS "AnimationPreset_name_key";
CREATE UNIQUE INDEX "AnimationPreset_type_key" ON "AnimationPreset"("type");

-- Add shape presets table
CREATE TABLE "ShapePreset" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "svg" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShapePreset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShapePreset_key_key" ON "ShapePreset"("key");
