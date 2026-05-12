FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install

COPY tsconfig.base.json ./
COPY apps/web apps/web
COPY packages/shared packages/shared

RUN npm run build --workspace @repo/shared && npm run build --workspace @repo/web

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web apps/web
COPY --from=builder /app/packages/shared packages/shared
COPY --from=builder /app/tsconfig.base.json ./

WORKDIR /app/apps/web
EXPOSE 3000
CMD ["npm", "run", "start"]
