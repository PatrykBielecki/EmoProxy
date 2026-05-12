import type { FastifyPluginAsync } from 'fastify';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import ExcelJS from 'exceljs';
import {
  analyticsSettingsSchema,
  createUserSchema,
  storageConfigSchema,
  surveyConfigSchema
} from '@repo/shared';
import { prisma } from '../plugins/prisma.js';
import { hashPassword } from '../lib/password.js';
import {
  classifyOutlier,
  computeEmotionStats,
  computeDemographicStats,
  computeDemographicStatsForSessions,
  computeVadEmotionMapping,
  computeFullCorrelationMatrix,
  computeEmotionParameterMatrix,
  analyticsNumericKeys,
  mean,
  round,
  summarizeCategory,
  topCategoryValues,
  type AnalyticsEntry,
  type CategorySummaryItem
} from '../lib/analytics.js';
import { classifyColorFamily, hexToHsv } from '../lib/color.js';

const adminResetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(8)
});

type ExportRow = {
  sessionId: string;
  createdAt: string;
  age: number | string;
  country: string;
  gender: string;
  emotionKey: string;
  shape: string;
  animationType: string;
  color: string;
  colorHue: number | null;
  colorSaturation: number | null;
  colorValue: number | null;
  size: number;
  speed: number;
  valence: number;
  arousal: number;
  dominance: number;
  additional: string;
};

const EXPORT_COLUMNS = [
  'sessionId',
  'createdAt',
  'age',
  'country',
  'gender',
  'emotionKey',
  'shape',
  'animationType',
  'color',
  'colorHue',
  'colorSaturation',
  'colorValue',
  'size',
  'speed',
  'valence',
  'arousal',
  'dominance',
  'additional'
] as const satisfies ReadonlyArray<keyof ExportRow>;

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/users/password',
    {
      preHandler: fastify.authenticate,
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } }
    },
    async (request, reply) => {
      const payload = adminResetPasswordSchema.parse(request.body);
      const user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) return reply.notFound('User not found');

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(payload.newPassword) }
      });

      return { success: true };
    }
  );

  fastify.post('/users', { preHandler: fastify.authenticate }, async (request, reply) => {
    const payload = createUserSchema.parse(request.body);
    const exists = await prisma.user.findUnique({ where: { username: payload.username } });
    if (exists) return reply.conflict('User already exists');

    const created = await prisma.user.create({
      data: {
        username: payload.username,
        passwordHash: await hashPassword(payload.password)
      },
      select: { id: true, username: true, createdAt: true }
    });

    return reply.code(201).send(created);
  });

  fastify.get('/users', { preHandler: fastify.authenticate }, async () => {
    return prisma.user.findMany({
      select: { id: true, username: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'asc' }
    });
  });

  fastify.get('/config', { preHandler: fastify.authenticate }, async () => {
    const [surveyConfig, emotions, shapes, animations, additionalFields, analytics, storage] =
      await Promise.all([
        prisma.surveyConfig.findUnique({ where: { id: 'default' } }),
        prisma.emotion.findMany({ orderBy: { order: 'asc' } }),
        prisma.shapePreset.findMany({ orderBy: { order: 'asc' } }),
        prisma.animationPreset.findMany({ orderBy: { name: 'asc' } }),
        prisma.additionalField.findMany({ orderBy: { order: 'asc' } }),
        prisma.analyticsSetting.findUnique({ where: { id: 'default' } }),
        prisma.storageConfig.findUnique({ where: { id: 'default' } })
      ]);

    return { surveyConfig, emotions, shapes, animations, additionalFields, analytics, storage };
  });

  fastify.put('/config/survey', { preHandler: fastify.authenticate }, async (request) => {
    const payload = surveyConfigSchema.parse(request.body);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const emotionCount =
        payload.emotionCount ?? Math.max(1, payload.emotions.filter((e) => e.enabled).length);
      const configData = {
        introTitle: payload.introTitle,
        introDescription: payload.introDescription,
        emotionCount,
        minSizeScale: payload.minSizeScale,
        maxSizeScale: payload.maxSizeScale,
        minSpeedScale: payload.minSpeedScale,
        maxSpeedScale: payload.maxSpeedScale
      };

      await tx.surveyConfig.upsert({
        where: { id: 'default' },
        update: configData,
        create: { id: 'default', ...configData }
      });

      await tx.emotion.deleteMany();
      await tx.emotion.createMany({ data: payload.emotions.map((e) => ({ ...e })) });

      await tx.shapePreset.deleteMany();
      await tx.shapePreset.createMany({
        data: payload.shapes.map((s) => ({ ...s, svg: s.svg || null }))
      });

      await tx.animationPreset.deleteMany();
      await tx.animationPreset.createMany({
        data: payload.animations.map((a) => ({ ...a, keyframesJson: a.keyframesJson || null }))
      });

      await tx.additionalField.deleteMany();
      await tx.additionalField.createMany({ data: payload.additionalFields.map((f) => ({ ...f })) });
    });

    return { success: true };
  });

  fastify.put('/config/analytics', { preHandler: fastify.authenticate }, async (request) => {
    const payload = analyticsSettingsSchema.parse(request.body);
    await prisma.analyticsSetting.upsert({
      where: { id: 'default' },
      update: payload,
      create: { id: 'default', ...payload }
    });
    return { success: true };
  });

  fastify.put('/config/storage', { preHandler: fastify.authenticate }, async (request) => {
    storageConfigSchema.parse(request.body);
    await prisma.storageConfig.upsert({
      where: { id: 'default' },
      update: {
        mode: 'internal_postgres',
        externalDatabaseUrl: null,
        googleSheetId: null,
        googleServiceAccountJson: null
      },
      create: {
        id: 'default',
        mode: 'internal_postgres',
        externalDatabaseUrl: null,
        googleSheetId: null,
        googleServiceAccountJson: null
      }
    });
    return { success: true };
  });

  fastify.get('/survey-sessions', { preHandler: fastify.authenticate }, async () => {
    return prisma.surveySession.findMany({
      orderBy: { createdAt: 'desc' },
      include: { emotionResponses: true, additionalResponses: true }
    });
  });

  fastify.get('/export', { preHandler: fastify.authenticate }, async (request, reply) => {
    const query = (request.query ?? {}) as { format?: string; include?: string };
    const format = query.format ?? 'json';
    const includeStats = query.include === 'statistics';
    if (!(['json', 'csv', 'xlsx'] as const).includes(format as never)) {
      return reply.badRequest('Supported formats: json, csv, xlsx');
    }

    const sessions = await prisma.surveySession.findMany({
      orderBy: { createdAt: 'desc' },
      include: { emotionResponses: true, additionalResponses: true }
    });

    const rows: ExportRow[] = sessions.flatMap((session) => {
      const additional = Object.fromEntries(
        session.additionalResponses.map((item) => [item.fieldKey, item.value])
      );
      return session.emotionResponses.map((response) => {
        const hsv = hexToHsv(response.color);
        return {
          sessionId: session.id,
          createdAt: session.createdAt.toISOString(),
          age: session.age ?? '',
          country: session.country ?? '',
          gender: session.gender ?? '',
          emotionKey: response.emotionKey,
          shape: response.shape,
          animationType: response.animationType,
          color: response.color,
          colorHue: response.colorHue ?? hsv?.h ?? null,
          colorSaturation: response.colorSaturation ?? hsv?.s ?? null,
          colorValue: response.colorValue ?? hsv?.v ?? null,
          size: response.size,
          speed: response.speed,
          valence: response.valence,
          arousal: response.arousal,
          dominance: response.dominance,
          additional: JSON.stringify(additional)
        };
      });
    });

    if (format === 'json') {
      return reply.header('Content-Type', 'application/json').send(rows);
    }

    if (format === 'csv') {
      const escapeCsv = (value: unknown): string => {
        const text = String(value ?? '');
        if (text.includes('"') || text.includes(',') || text.includes('\n')) {
          return `"${text.replaceAll('"', '""')}"`;
        }
        return text;
      };

      const csv = [
        EXPORT_COLUMNS.join(','),
        ...rows.map((row) => EXPORT_COLUMNS.map((col) => escapeCsv(row[col])).join(','))
      ].join('\n');

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', 'attachment; filename="survey-answers.csv"')
        .send(csv);
    }

    const workbook = new ExcelJS.Workbook();
    const dataSheet = workbook.addWorksheet('Survey answers');
    dataSheet.columns = [
      { header: 'sessionId', key: 'sessionId', width: 28 },
      { header: 'createdAt', key: 'createdAt', width: 26 },
      { header: 'age', key: 'age', width: 10 },
      { header: 'country', key: 'country', width: 16 },
      { header: 'gender', key: 'gender', width: 18 },
      { header: 'emotionKey', key: 'emotionKey', width: 16 },
      { header: 'shape', key: 'shape', width: 14 },
      { header: 'animationType', key: 'animationType', width: 16 },
      { header: 'color', key: 'color', width: 12 },
      { header: 'colorHue', key: 'colorHue', width: 12 },
      { header: 'colorSaturation', key: 'colorSaturation', width: 16 },
      { header: 'colorValue', key: 'colorValue', width: 12 },
      { header: 'size', key: 'size', width: 10 },
      { header: 'speed', key: 'speed', width: 10 },
      { header: 'valence', key: 'valence', width: 10 },
      { header: 'arousal', key: 'arousal', width: 10 },
      { header: 'dominance', key: 'dominance', width: 12 },
      { header: 'additional', key: 'additional', width: 40 }
    ];
    rows.forEach((row) => dataSheet.addRow(row));

    if (includeStats) {
      const [analyticsResponses, analyticsSettings, analyticsSessions] = await Promise.all([
        prisma.emotionResponse.findMany({ include: { session: true } }),
        prisma.analyticsSetting.findUnique({ where: { id: 'default' } }),
        prisma.surveySession.findMany({ select: { id: true, gender: true, country: true, age: true } })
      ]);

      const threshold = analyticsSettings?.zScoreThreshold ?? 2;
      const outlierFiltering = analyticsSettings?.outlierFilteringEnabled ?? true;

      type AnalyticsEntryWithDemo = AnalyticsEntry & { gender: string; country: string };
      const candidates: AnalyticsEntryWithDemo[] = analyticsResponses.map((entry) => {
        const hsv = hexToHsv(entry.color);
        return {
          emotionKey: entry.emotionKey,
          shape: entry.shape,
          animationType: entry.animationType,
          color: entry.color,
          colorFamily: classifyColorFamily(entry.color),
          colorHue: entry.colorHue ?? hsv?.h ?? null,
          colorSaturation: entry.colorSaturation ?? hsv?.s ?? null,
          colorValue: entry.colorValue ?? hsv?.v ?? null,
          size: entry.size,
          speed: entry.speed,
          valence: entry.valence,
          arousal: entry.arousal,
          dominance: entry.dominance,
          gender: entry.session?.gender ?? 'unknown',
          country: entry.session?.country ?? 'unknown'
        };
      });

      const accepted = candidates.filter((entry) => {
        if (!outlierFiltering) return true;
        return !classifyOutlier(entry, candidates, threshold);
      });

      const emotionStats = computeEmotionStats(accepted.map((e) => ({ ...e })));

      // Sheet: Emotion VAD stats
      const emotionSheet = workbook.addWorksheet('Emotion VAD stats');
      emotionSheet.columns = [
        { header: 'emotion', key: 'emotionKey', width: 16 },
        { header: 'n', key: 'count', width: 8 },
        { header: 'valence_mean', key: 'valenceMean', width: 14 },
        { header: 'valence_sd', key: 'valenceStdDev', width: 12 },
        { header: 'valence_median', key: 'valenceMedian', width: 14 },
        { header: 'arousal_mean', key: 'arousalMean', width: 14 },
        { header: 'arousal_sd', key: 'arousalStdDev', width: 12 },
        { header: 'arousal_median', key: 'arousalMedian', width: 14 },
        { header: 'dominance_mean', key: 'dominanceMean', width: 15 },
        { header: 'dominance_sd', key: 'dominanceStdDev', width: 14 },
        { header: 'dominance_median', key: 'dominanceMedian', width: 16 },
        { header: 'size_mean', key: 'sizeMean', width: 12 },
        { header: 'size_sd', key: 'sizeStdDev', width: 10 },
        { header: 'speed_mean', key: 'speedMean', width: 12 },
        { header: 'speed_sd', key: 'speedStdDev', width: 10 }
      ];
      emotionStats.forEach((s) => emotionSheet.addRow(s));

      // Sheet: Correlations
      const corrSheet = workbook.addWorksheet('Correlations');
      corrSheet.columns = [
        { header: 'parameter_A', key: 'left', width: 16 },
        { header: 'parameter_B', key: 'right', width: 16 },
        { header: 'pearson_r', key: 'value', width: 12 }
      ];
      computeFullCorrelationMatrix(accepted, analyticsNumericKeys, ['shape', 'animationType']).forEach((c) => corrSheet.addRow(c));

      // Sheet: Parameter stats per category (shape, animation, color, colorFamily)
      const addCategorySheet = (name: string, items: CategorySummaryItem[]) => {
        const sheet = workbook.addWorksheet(name);
        sheet.columns = [
          { header: 'key', key: 'key', width: 20 },
          { header: 'n', key: 'count', width: 8 },
          { header: 'share', key: 'share', width: 8 },
          { header: 'valence_mean', key: 'valenceMean', width: 14 },
          { header: 'valence_sd', key: 'valenceStdDev', width: 12 },
          { header: 'arousal_mean', key: 'arousalMean', width: 14 },
          { header: 'arousal_sd', key: 'arousalStdDev', width: 12 },
          { header: 'dominance_mean', key: 'dominanceMean', width: 15 },
          { header: 'dominance_sd', key: 'dominanceStdDev', width: 14 },
          { header: 'size_mean', key: 'sizeMean', width: 12 },
          { header: 'size_sd', key: 'sizeStdDev', width: 10 },
          { header: 'speed_mean', key: 'speedMean', width: 12 },
          { header: 'speed_sd', key: 'speedStdDev', width: 10 }
        ];
        items.forEach((item) => sheet.addRow(item));
      };

      addCategorySheet('Shape stats', summarizeCategory(accepted, 'shape'));
      addCategorySheet('Animation stats', summarizeCategory(accepted, 'animationType'));
      addCategorySheet('Color family stats', summarizeCategory(accepted, 'colorFamily'));
      addCategorySheet('Color stats', summarizeCategory(accepted, 'color').slice(0, 30));

      // Sheet: Gender demographics
      const genderSheet = workbook.addWorksheet('Gender stats');
      genderSheet.columns = [
        { header: 'gender', key: 'key', width: 16 },
        { header: 'n', key: 'count', width: 8 },
        { header: 'share', key: 'share', width: 8 },
        { header: 'valence_mean', key: 'valenceMean', width: 14 },
        { header: 'valence_sd', key: 'valenceStdDev', width: 12 },
        { header: 'arousal_mean', key: 'arousalMean', width: 14 },
        { header: 'arousal_sd', key: 'arousalStdDev', width: 12 },
        { header: 'dominance_mean', key: 'dominanceMean', width: 15 },
        { header: 'dominance_sd', key: 'dominanceStdDev', width: 14 }
      ];
      computeDemographicStatsForSessions(accepted, analyticsSessions, 'gender').forEach((s) => genderSheet.addRow(s));

      // Sheet: Country demographics
      const countrySheet = workbook.addWorksheet('Country stats');
      countrySheet.columns = [
        { header: 'country', key: 'key', width: 20 },
        { header: 'n', key: 'count', width: 8 },
        { header: 'share', key: 'share', width: 8 },
        { header: 'valence_mean', key: 'valenceMean', width: 14 },
        { header: 'valence_sd', key: 'valenceStdDev', width: 12 },
        { header: 'arousal_mean', key: 'arousalMean', width: 14 },
        { header: 'arousal_sd', key: 'arousalStdDev', width: 12 },
        { header: 'dominance_mean', key: 'dominanceMean', width: 15 },
        { header: 'dominance_sd', key: 'dominanceStdDev', width: 14 }
      ];
      computeDemographicStatsForSessions(accepted, analyticsSessions, 'country').forEach((s) => countrySheet.addRow(s));

      // Sheet: VAD emotion mapping
      const vadSheet = workbook.addWorksheet('VAD emotion mapping');
      vadSheet.columns = [
        { header: 'emotion', key: 'emotionKey', width: 16 },
        { header: 'centroid_valence', key: 'centroidValence', width: 16 },
        { header: 'centroid_arousal', key: 'centroidArousal', width: 16 },
        { header: 'centroid_dominance', key: 'centroidDominance', width: 18 },
        { header: 'nearest_emotion', key: 'nearestNeighborLabel', width: 18 },
        { header: 'vad_distance', key: 'vadDistance', width: 12 }
      ];
      computeVadEmotionMapping(emotionStats).forEach((m) => vadSheet.addRow(m));
    }

    const xlsxBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const filename = includeStats ? 'survey-data-and-statistics.xlsx' : 'survey-answers.xlsx';

    return reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(xlsxBuffer);
  });

  fastify.get('/analytics', { preHandler: fastify.authenticate }, async () => {
    const [responses, settings, sessions] = await Promise.all([
      prisma.emotionResponse.findMany({ include: { session: true } }),
      prisma.analyticsSetting.findUnique({ where: { id: 'default' } }),
      prisma.surveySession.findMany({ select: { id: true, gender: true, country: true, age: true } })
    ]);

    const threshold = settings?.zScoreThreshold ?? 2;
    const outlierFiltering = settings?.outlierFilteringEnabled ?? true;

    type AnalyticsEntryWithDemo = AnalyticsEntry & { gender: string; country: string };
    const candidates: AnalyticsEntryWithDemo[] = responses.map((entry) => {
      const hsv = hexToHsv(entry.color);
      return {
        emotionKey: entry.emotionKey,
        shape: entry.shape,
        animationType: entry.animationType,
        color: entry.color,
        colorFamily: classifyColorFamily(entry.color),
        colorHue: entry.colorHue ?? hsv?.h ?? null,
        colorSaturation: entry.colorSaturation ?? hsv?.s ?? null,
        colorValue: entry.colorValue ?? hsv?.v ?? null,
        size: entry.size,
        speed: entry.speed,
        valence: entry.valence,
        arousal: entry.arousal,
        dominance: entry.dominance,
        gender: entry.session?.gender ?? 'unknown',
        country: entry.session?.country ?? 'unknown'
      };
    });

    const accepted = candidates.filter((entry) => {
      if (!outlierFiltering) return true;
      return !classifyOutlier(entry, candidates, threshold);
    });
    const rejected = candidates.length - accepted.length;

    const stats = computeEmotionStats(accepted.map((e) => ({ ...e })));
    const emotionKeys = [...new Set(accepted.map((e) => e.emotionKey))].sort();

    const emotionProfiles = stats
      .map((emotionStats) => {
        const emotionResponses = accepted.filter(
          (entry) => entry.emotionKey === emotionStats.emotionKey
        );
        return {
          emotionKey: emotionStats.emotionKey,
          count: emotionStats.count,
          valenceMean: emotionStats.valenceMean,
          valenceStdDev: emotionStats.valenceStdDev,
          arousalMean: emotionStats.arousalMean,
          arousalStdDev: emotionStats.arousalStdDev,
          dominanceMean: emotionStats.dominanceMean,
          dominanceStdDev: emotionStats.dominanceStdDev,
          sizeMean: emotionStats.sizeMean,
          sizeStdDev: emotionStats.sizeStdDev,
          speedMean: emotionStats.speedMean,
          speedStdDev: emotionStats.speedStdDev,
          topColors: topCategoryValues(emotionResponses, 'color'),
          topColorFamilies: topCategoryValues(emotionResponses, 'colorFamily'),
          topShapes: topCategoryValues(emotionResponses, 'shape'),
          topAnimations: topCategoryValues(emotionResponses, 'animationType')
        };
      })
      .sort((a, b) => b.count - a.count);

    const parameterStats = {
      colors: summarizeCategory(accepted, 'color').slice(0, 20),
      colorFamilies: summarizeCategory(accepted, 'colorFamily'),
      shapes: summarizeCategory(accepted, 'shape').slice(0, 20),
      animations: summarizeCategory(accepted, 'animationType')
    };

    const correlations = computeFullCorrelationMatrix(accepted, analyticsNumericKeys, ['shape', 'animationType']);

    const demographicStats = {
      gender: computeDemographicStatsForSessions(accepted, sessions, 'gender'),
      country: computeDemographicStatsForSessions(accepted, sessions, 'country')
    };

    const ageValues = sessions.map((s) => s.age).filter((a): a is number => a !== null);
    const respondentStats = {
      totalSessions: sessions.length,
      totalResponses: responses.length,
      acceptedResponses: accepted.length,
      ageMean: round(mean(ageValues)),
      ageStdDev: round(((): number => {
        if (ageValues.length < 2) return 0;
        const avg = mean(ageValues);
        const variance = ageValues.reduce((sum, v) => sum + (v - avg) ** 2, 0) / ageValues.length;
        return Math.sqrt(variance);
      })()),
      ageMin: ageValues.length ? Math.min(...ageValues) : 0,
      ageMax: ageValues.length ? Math.max(...ageValues) : 0
    };

    const vadEmotionMapping = computeVadEmotionMapping(stats);
    const emotionParameterMatrix = computeEmotionParameterMatrix(accepted, emotionKeys);

    const runResult = {
      accepted: accepted.length,
      rejected,
      threshold,
      outlierFiltering,
      stats,
      emotionProfiles,
      parameterStats,
      correlations,
      demographicStats,
      respondentStats,
      vadEmotionMapping,
      emotionParameterMatrix
    };

    const run = await prisma.analyticsRun.create({
      data: { result: runResult as unknown as Prisma.InputJsonValue }
    });

    return { ...runResult, runId: run.id };
  });
};

export default adminRoutes;
