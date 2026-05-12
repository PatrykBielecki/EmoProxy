import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../plugins/prisma.js';

const publicRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/config', async () => {
    const [surveyConfig, emotions, shapes, animations, additionalFields] = await Promise.all([
      prisma.surveyConfig.findUnique({ where: { id: 'default' } }),
      prisma.emotion.findMany({ orderBy: { order: 'asc' } }),
      prisma.shapePreset.findMany({ orderBy: { order: 'asc' } }),
      prisma.animationPreset.findMany({ orderBy: { name: 'asc' } }),
      prisma.additionalField.findMany({ where: { enabled: true }, orderBy: { order: 'asc' } })
    ]);

    if (!surveyConfig) {
      throw fastify.httpErrors.notFound('Survey config missing');
    }

    return { surveyConfig, emotions, shapes, animations, additionalFields };
  });
};

export default publicRoutes;
