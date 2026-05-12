FROM node:24-alpine
WORKDIR /app

COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm install

COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY packages/shared packages/shared

RUN npm run db:generate --workspace @repo/api

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["sh", "-c", "npm run db:migrate && npm run db:seed && npm run start"]
