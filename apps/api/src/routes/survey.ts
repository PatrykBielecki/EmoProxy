import type { FastifyPluginAsync } from 'fastify';
import { surveySubmissionSchema } from '@repo/shared';
import { prisma } from '../plugins/prisma.js';
import { createStorageAdapter } from '../lib/storage-adapter.js';

const surveyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/session', async (request, reply) => {
    const payload = surveySubmissionSchema.parse(request.body);
    const adapter = createStorageAdapter('internal_postgres', prisma);

    try {
      const result = await adapter.storeSubmission(payload);
      return reply.code(201).send(result);
    } catch (error) {
      request.log.error(error);
      return reply.badRequest((error as Error).message);
    }
  });
};

export default surveyRoutes;
