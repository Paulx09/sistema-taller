import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

function resolveSchemaPath(): string {
  const envPath = process.env['PRISMA_SCHEMA_PATH'];
  const candidates = [
    envPath,
    path.resolve(process.cwd(), 'prisma', 'schema.prisma'),
    path.resolve(__dirname, '..', '..', 'prisma', 'schema.prisma'),
  ].filter((value): value is string => Boolean(value));

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error('No se encontró prisma/schema.prisma para bootstrap de base de datos');
  }

  return found;
}

function resolvePrismaCliPath(): string {
  try {
    return require.resolve('prisma/build/index.js');
  } catch {
    throw new Error('No se encontró Prisma CLI en runtime. Verifica que el paquete prisma esté instalado.');
  }
}

async function runPrismaMigrateDeploy(schemaPath: string): Promise<void> {
  const prismaCliPath = resolvePrismaCliPath();
  const serverRoot = path.resolve(schemaPath, '..', '..');

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [prismaCliPath, 'migrate', 'deploy', '--schema', schemaPath],
      {
        cwd: serverRoot,
        env: process.env,
        stdio: 'pipe',
      }
    );

    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      process.stdout.write(`[Prisma] ${data.toString()}`);
    });

    child.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(`[Prisma] ${text}`);
    });

    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`prisma migrate deploy falló (code ${code}). ${stderr}`));
    });
  });
}

function resolveCompiledSeedPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'dist-seed', 'prisma', 'seed.js'),
    path.resolve(__dirname, '..', '..', 'dist-seed', 'prisma', 'seed.js'),
  ];

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error('No se encontró el seed compilado en dist-seed/prisma/seed.js');
  }

  return found;
}

async function runCompiledSeed(seedPath: string): Promise<void> {
  const serverRoot = path.resolve(seedPath, '..', '..', '..');

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [seedPath], {
      cwd: serverRoot,
      env: process.env,
      stdio: 'pipe',
    });

    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      process.stdout.write(`[Seed] ${data.toString()}`);
    });

    child.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(`[Seed] ${text}`);
    });

    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`seed compilado falló (code ${code}). ${stderr}`));
    });
  });
}

export async function bootstrapDatabaseIfEnabled(): Promise<void> {
  const enabledByEnv = process.env['AUTO_DB_BOOTSTRAP'];
  const enabled = enabledByEnv ? enabledByEnv === 'true' : process.env['NODE_ENV'] === 'production';

  if (!enabled) {
    return;
  }

  console.log('[Bootstrap] Iniciando bootstrap de base de datos...');

  const schemaPath = resolveSchemaPath();
  await runPrismaMigrateDeploy(schemaPath);

  // El seed se ejecuta desde el archivo compilado generado a partir de prisma/seed.ts.
  // Esto permite que cualquier cambio en seed.ts viaje al empaquetar, sin Node extra en cliente.
  const compiledSeedPath = resolveCompiledSeedPath();
  await runCompiledSeed(compiledSeedPath);

  console.log('[Bootstrap] Base de datos lista.');
}
