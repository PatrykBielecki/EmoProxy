-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StorageMode" AS ENUM ('internal_postgres', 'external_postgres', 'google_sheets');

-- CreateEnum
CREATE TYPE "AdditionalFieldType" AS ENUM ('text', 'number', 'boolean');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "introTitle" TEXT NOT NULL,
    "introDescription" TEXT NOT NULL,
    "emotionCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurveyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emotion" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Emotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimationPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "minSize" DOUBLE PRECISION NOT NULL,
    "maxSize" DOUBLE PRECISION NOT NULL,
    "minSpeed" DOUBLE PRECISION NOT NULL,
    "maxSpeed" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimationPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalField" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "AdditionalFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "outlierFilteringEnabled" BOOLEAN NOT NULL DEFAULT true,
    "zScoreThreshold" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorageConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "mode" "StorageMode" NOT NULL DEFAULT 'internal_postgres',
    "externalDatabaseUrl" TEXT,
    "googleSheetId" TEXT,
    "googleServiceAccountJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorageConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveySession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storageMode" "StorageMode" NOT NULL DEFAULT 'internal_postgres',
    "age" INTEGER,
    "country" TEXT,
    "gender" TEXT,
    "accepted" BOOLEAN NOT NULL DEFAULT true,
    "rejectionReason" TEXT,
    "metadata" JSONB,

    CONSTRAINT "SurveySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyAdditionalResponse" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyAdditionalResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmotionResponse" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "emotionKey" TEXT NOT NULL,
    "shape" TEXT NOT NULL,
    "animationType" TEXT NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL,
    "valence" DOUBLE PRECISION NOT NULL,
    "arousal" DOUBLE PRECISION NOT NULL,
    "dominance" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmotionResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsRun" (
    "id" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Emotion_key_key" ON "Emotion"("key");

-- CreateIndex
CREATE UNIQUE INDEX "AnimationPreset_name_key" ON "AnimationPreset"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AdditionalField_key_key" ON "AdditionalField"("key");

-- CreateIndex
CREATE INDEX "EmotionResponse_emotionKey_idx" ON "EmotionResponse"("emotionKey");

-- CreateIndex
CREATE INDEX "EmotionResponse_sessionId_idx" ON "EmotionResponse"("sessionId");

-- AddForeignKey
ALTER TABLE "SurveyAdditionalResponse" ADD CONSTRAINT "SurveyAdditionalResponse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SurveySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmotionResponse" ADD CONSTRAINT "EmotionResponse_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SurveySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

