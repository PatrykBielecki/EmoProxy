import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { env } from './env.js';
import { prisma } from './plugins/prisma.js';
import './types.js';
import publicRoutes from './routes/public.js';
import authRoutes from './routes/auth.js';
import surveyRoutes from './routes/survey.js';
import adminRoutes from './routes/admin.js';

const allowedCorsOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedCorsOriginSet = new Set(allowedCorsOrigins);
const allowedCorsMethods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

const app = Fastify({ logger: true });

await app.register(sensible);
await app.register(cors, {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (env.NODE_ENV !== 'production') {
      callback(null, true);
      return;
    }
    callback(null, allowedCorsOriginSet.has(origin));
  },
  methods: allowedCorsMethods,
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
});
await app.register(cookie);
await app.register(rateLimit, {
  global: true,
  max: env.RATE_LIMIT_MAX,
  timeWindow: env.RATE_LIMIT_TIME_WINDOW
});
await app.register(jwt, {
  secret: env.JWT_SECRET,
  cookie: {
    cookieName: 'session',
    signed: false
  }
});

app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch {
    reply.unauthorized('Unauthorized');
  }
});

app.get('/health', async () => ({ ok: true }));

await app.register(publicRoutes, { prefix: '/api/public' });
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(surveyRoutes, { prefix: '/api/survey' });
await app.register(adminRoutes, { prefix: '/api/admin' });

const start = async () => {
  try {
    await prisma.$connect();
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

await start();
