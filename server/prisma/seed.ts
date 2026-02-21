import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de la base de datos...');

  // Encriptar contraseña
  const passwordHash = await bcrypt.hash('admin123', 10);

  // Usuario Admin por defecto
  const admin = await prisma.usuario.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash,
      nombreCompleto: 'Administrador del Sistema',
      rol: 'ADMIN'
    },
    create: {
      username: 'admin',
      passwordHash,
      nombreCompleto: 'Administrador del Sistema',
      rol: 'ADMIN'
    }
  });

  console.log('Usuario admin creado - ID:', admin.id);
  console.log('Username:', admin.username);
  console.log('Password: admin123');
  console.log('Nombre:', admin.nombreCompleto);
}

// Ejecutar seed
main()
  .then(() => {
    console.log('Seed ejecutado correctamente.');
  })
  .catch((error: unknown) => {
    console.error('Error en el seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
