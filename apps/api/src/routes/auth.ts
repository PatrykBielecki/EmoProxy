import type { FastifyPluginAsync } from 'fastify';
import { changePasswordSchema, loginSchema } from '@repo/shared';
import { prisma } from '../plugins/prisma.js';
import { env } from '../env.js';
import { hashPassword, verifyPassword } from '../lib/password.js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute'
        }
      }
    },
    async (request, reply) => {
      const payload = loginSchema.parse(request.body);
      const user = await prisma.user.findUnique({ where: { username: payload.username } });
      if (!user) return reply.unauthorized('Invalid credentials');

      const valid = await verifyPassword(payload.password, user.passwordHash);
      if (!valid) return reply.unauthorized('Invalid credentials');

      const token = await reply.jwtSign(
        { userId: user.id, username: user.username },
        { expiresIn: '8h' }
      );

      reply.setCookie('session', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
        path: '/'
      });

      return { id: user.id, username: user.username };
    }
  );

  fastify.post(
    '/logout',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (_request, reply) => {
      reply.clearCookie('session', { path: '/' });
      return { success: true };
    }
  );

  fastify.get(
    '/me',
    {
      preHandler: fastify.authenticate,
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } }
    },
    async (request) => {
      return request.user;
    }
  );

  fastify.post(
    '/change-password',
    {
      preHandler: fastify.authenticate,
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute'
        }
      }
    },
    async (request, reply) => {
      const payload = changePasswordSchema.parse(request.body);
      const { userId } = request.user;
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return reply.notFound('User not found');

      const valid = await verifyPassword(payload.currentPassword, user.passwordHash);
      if (!valid) return reply.badRequest('Current password is invalid');

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(payload.newPassword) }
      });

      return { success: true };
    }
  );
};

export default authRoutes;
