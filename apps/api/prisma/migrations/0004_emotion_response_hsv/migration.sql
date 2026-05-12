-- Add HSV color components to EmotionResponse for HSV-based color analysis
ALTER TABLE "EmotionResponse"
ADD COLUMN "colorHue"        DOUBLE PRECISION,
ADD COLUMN "colorSaturation" DOUBLE PRECISION,
ADD COLUMN "colorValue"      DOUBLE PRECISION;
