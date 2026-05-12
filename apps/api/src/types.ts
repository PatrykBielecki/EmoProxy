import type { FastifyReply, FastifyRequest } from 'fastify';

export interface JwtPayload {
  userId: string;
  username: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JwtPayload;
  }
}
