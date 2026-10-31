import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- INICIANDO MIGRACIÓN SEGURA DE TIPOITEM ---');

  // 1. Crear ENUM TipoItem
  console.log('1. Creando ENUM TipoItem...');
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "TipoItem" AS ENUM ('PRODUCTO', 'SERVICIO');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // 2. Agregar columna tipo a categorias
  console.log('2. Agregando columna tipo a categorias...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "categorias" ADD COLUMN IF NOT EXISTS "tipo" "TipoItem" NOT NULL DEFAULT 'PRODUCTO';
  `);

  // 3. Modificar constraints de categorias
  console.log('3. Actualizando índices de unicidad en categorias...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "categorias" DROP CONSTRAINT IF EXISTS "categorias_nombre_key";
  `);
  await prisma.$executeRawUnsafe(`
    DROP INDEX IF EXISTS "categorias_nombre_key";
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "categorias_tipo_nombre_key" ON "categorias"("tipo", "nombre");
  `);

  // 4. Agregar columna tipo a productos
  console.log('4. Agregando columna tipo a productos...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "tipo" "TipoItem" NOT NULL DEFAULT 'PRODUCTO';
  `);

  // 5. Ajustar defaults en productos
  console.log('5. Ajustando valores por defecto en productos...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "productos" ALTER COLUMN "precio_compra" SET DEFAULT 0;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "productos" ALTER COLUMN "stock_minimo" SET DEFAULT 0;
  `);

  // 6. Migrar datos de Categorías conocidas a SERVICIO
  console.log('6. Asignando tipo SERVICIO a categorías correspondientes...');
  await prisma.$executeRawUnsafe(`
    UPDATE "categorias" SET "tipo" = 'SERVICIO'
    WHERE LOWER("nombre") IN (
      'diagnóstico', 'diagnostico', 'mantenimientos', 'mantenimiento',
      'mant. impresora', 'mant. laptop', 'mant. pc', 'formateo',
      'licencias', 'reparaciones', 'reparacion', 'reparación',
      'purgado de cabezal', 'purgado de tinta'
    );
  `);

  // 7. Migrar datos de Productos a SERVICIO y PRODUCTO según es_servicio
  console.log('7. Asignando tipo a productos según es_servicio...');
  await prisma.$executeRawUnsafe(`
    UPDATE "productos" SET "tipo" = 'SERVICIO' WHERE "es_servicio" = true;
  `);
  await prisma.$executeRawUnsafe(`
    UPDATE "productos" SET "tipo" = 'PRODUCTO' WHERE "es_servicio" = false;
  `);

  // 8. Asegurar que las categorías de productos con tipo SERVICIO también tengan tipo SERVICIO
  console.log('8. Sincronizando categorías con sus productos...');
  await prisma.$executeRawUnsafe(`
    UPDATE "categorias" SET "tipo" = 'SERVICIO' 
    WHERE id IN (SELECT DISTINCT categoria_id FROM "productos" WHERE "tipo" = 'SERVICIO');
  `);

  console.log('✅ Migración ejecutada con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error en la migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
