import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __cachedPrisma: PrismaClient | undefined;
}

const prisma: PrismaClient = (() => {
  if (process.env.NODE_ENV === 'production') {
    return new PrismaClient();
  }

  globalThis.__cachedPrisma ??= new PrismaClient({
    log:
      process.env.PRISMA_LOG_QUERIES === 'true'
        ? ['query', 'error', 'warn']
        : ['error', 'warn'],
  });

  return globalThis.__cachedPrisma;
})();

export default prisma;
