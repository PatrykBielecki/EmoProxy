import { PrismaClient } from '@prisma/client';
import { env } from '../src/env.js';
import { hashPassword } from '../src/lib/password.js';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUnique({ where: { username: env.ADMIN_DEFAULT_USERNAME } });
  if (!admin) {
    await prisma.user.create({
      data: {
        username: env.ADMIN_DEFAULT_USERNAME,
        passwordHash: await hashPassword(env.ADMIN_DEFAULT_PASSWORD)
      }
    });
  }

  await prisma.surveyConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      introTitle: 'Emotion visualization survey',
      introDescription: 'Configure animation parameters for each emotion and provide VAD ratings.',
      emotionCount: 6,
      minSizeScale: 1,
      maxSizeScale: 10,
      minSpeedScale: 1,
      maxSpeedScale: 10
    }
  });

  const emotionDefaults = ['joy', 'anger', 'sadness', 'fear', 'surprise', 'interest'];
  for (const [index, key] of emotionDefaults.entries()) {
    await prisma.emotion.upsert({
      where: { key },
      update: { order: index, enabled: true, label: key },
      create: { key, label: key, order: index, enabled: true }
    });
  }

  const animations = ['bounce', 'rotate', 'fade', 'shake', 'scale', 'flip', 'stretch'];
  for (const type of animations) {
    await prisma.animationPreset.upsert({
      where: { type },
      update: { type, name: type, enabled: true, keyframesJson: null },
      create: { name: type, type, enabled: true, keyframesJson: null }
    });
  }

  const shapeDefaults = ['circle', 'square', 'triangle', 'star', 'ellipse', 'rhombus'];
  for (const [index, key] of shapeDefaults.entries()) {
    await prisma.shapePreset.upsert({
      where: { key },
      update: { name: key, enabled: true, order: index, svg: null },
      create: { key, name: key, enabled: true, order: index, svg: null }
    });
  }

  await prisma.analyticsSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', outlierFilteringEnabled: true, zScoreThreshold: 2 }
  });

  await prisma.storageConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', mode: 'internal_postgres' }
  });

  const additionalDefaults = [
    { key: 'age', label: 'Age', type: 'number' as const, required: false, enabled: true, order: 0 },
    { key: 'country', label: 'Country', type: 'text' as const, required: false, enabled: true, order: 1 },
    { key: 'gender', label: 'Gender', type: 'text' as const, required: false, enabled: true, order: 2 }
  ];

  for (const item of additionalDefaults) {
    await prisma.additionalField.upsert({
      where: { key: item.key },
      update: item,
      create: item
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
