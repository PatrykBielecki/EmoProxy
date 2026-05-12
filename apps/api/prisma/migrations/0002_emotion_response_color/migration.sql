-- Add persisted shape color for emotion responses
ALTER TABLE "EmotionResponse"
ADD COLUMN "color" TEXT NOT NULL DEFAULT '#b17457';
