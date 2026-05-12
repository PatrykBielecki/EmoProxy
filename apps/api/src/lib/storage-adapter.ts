import { PrismaClient } from '@prisma/client';
import { SurveySubmission } from '@repo/shared';
import { hexToHsv } from './color.js';

type StorageMode = 'internal_postgres' | 'external_postgres' | 'google_sheets';

export interface StoredSurveySession {
  sessionId: string;
  storageMode: StorageMode;
}

export interface ResearchStorageAdapter {
  readonly mode: StorageMode;
  storeSubmission(submission: SurveySubmission): Promise<StoredSurveySession>;
}

class InternalPostgresAdapter implements ResearchStorageAdapter {
  readonly mode: StorageMode = 'internal_postgres';

  constructor(private readonly prisma: PrismaClient) {}

  async storeSubmission(submission: SurveySubmission): Promise<StoredSurveySession> {
    const created = await this.prisma.surveySession.create({
      data: {
        storageMode: this.mode,
        age: submission.demographics?.age,
        country: submission.demographics?.country,
        gender: submission.demographics?.gender,
        metadata: submission.demographics?.additional ?? undefined,
        emotionResponses: {
          create: submission.responses.map((response) => {
            const hsv = hexToHsv(response.color);
            return {
              emotionKey: response.emotionKey,
              shape: response.shape,
              animationType: response.animationType,
              color: response.color,
              colorHue: hsv?.h ?? null,
              colorSaturation: hsv?.s ?? null,
              colorValue: hsv?.v ?? null,
              size: response.size,
              speed: response.speed,
              valence: response.vad.valence,
              arousal: response.vad.arousal,
              dominance: response.vad.dominance
            };
          })
        },
        additionalResponses: {
          create: Object.entries(submission.demographics?.additional ?? {}).map(([key, value]) => ({
            fieldKey: key,
            value: String(value)
          }))
        }
      }
    });

    return { sessionId: created.id, storageMode: this.mode };
  }
}

class ExternalPostgresAdapter implements ResearchStorageAdapter {
  readonly mode: StorageMode = 'external_postgres';

  async storeSubmission(): Promise<StoredSurveySession> {
    throw new Error('External PostgreSQL adapter is not enabled yet. Configure integration first.');
  }
}

class GoogleSheetsAdapter implements ResearchStorageAdapter {
  readonly mode: StorageMode = 'google_sheets';

  async storeSubmission(): Promise<StoredSurveySession> {
    throw new Error('Google Sheets adapter is prepared but not fully implemented yet.');
  }
}

export function createStorageAdapter(mode: StorageMode, prisma: PrismaClient): ResearchStorageAdapter {
  if (mode === 'internal_postgres') {
    return new InternalPostgresAdapter(prisma);
  }
  if (mode === 'external_postgres') {
    return new ExternalPostgresAdapter();
  }
  return new GoogleSheetsAdapter();
}
