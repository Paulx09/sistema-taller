import fs from 'fs';
import path from 'path';
import { PrismaClient, TipoItem } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const backupPath = path.resolve(__dirname, '../../docs/backup_taller_2026-10-19_16-20.sql');
  console.log(`Leyendo backup de: ${backupPath}`);
  const content = fs.readFileSync(backupPath, 'utf-8');
  const lines = content.split('\n');

  let inCategorias = false;
  let count = 0;

  for (const line of lines) {
    if (line.startsWith('COPY public.categorias ')) {
      inCategorias = true;
      continue;
    }
    if (inCategorias && line.trim() === '\\.') {
      break;
    }
    if (inCategorias && line.trim()) {
      const parts = line.split('\t');
      const id = parts[0];
      const nombre = parts[1]?.trim();
      const createdAt = new Date(parts[2]);
      const updatedAt = new Date(parts[3]);
      const deletedAt = parts[4] === '\\N' ? null : new Date(parts[4]);
      const tipo = (parts[5]?.trim() as TipoItem) || 'PRODUCTO';

      await prisma.categoria.upsert({
        where: {
          tipo_nombre: {
            tipo,
            nombre,
          },
        },
        update: {
          deletedAt,
          updatedAt,
        },
        create: {
          id,
          nombre,
          tipo,
          createdAt,
          updatedAt,
          deletedAt,
        },
      });
      count++;
    }
  }

  const totalActivas = await prisma.categoria.count({ where: { deletedAt: null } });
  const total = await prisma.categoria.count();
  console.log(`Procesadas ${count} categorías del backup.`);
  console.log(`Total categorías en BD local: ${total}`);
  console.log(`Categorías activas (deletedAt = null) en BD local: ${totalActivas}`);
}

main()
  .catch((e) => {
    console.error('Error al sembrar categorías:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
