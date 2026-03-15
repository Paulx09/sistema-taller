import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function runSeed(): Promise<void> {
  console.log('Iniciando seed de la base de datos...');

  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.usuario.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash,
      nombreCompleto: 'Administrador del Sistema',
      rol: 'ADMIN',
    },
    create: {
      username: 'admin',
      passwordHash,
      nombreCompleto: 'Administrador del Sistema',
      rol: 'ADMIN',
    },
  });

  console.log('Usuario admin creado/actualizado - ID:', admin.id);
  console.log('Username:', admin.username);
  console.log('Password: admin123');
  console.log('Nombre:', admin.nombreCompleto);
}

async function main(): Promise<void> {
  try {
    await runSeed();
    console.log('Seed ejecutado correctamente.');
  } catch (error: unknown) {
    console.error('Error en el seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
