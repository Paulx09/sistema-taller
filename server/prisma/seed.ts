import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de la base de datos...');

  // Usuario Admin por defecto
  const admin = await prisma.usuario.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: 'admin123', // TODO: En producción usar bcrypt
      nombreCompleto: 'Administrador del Sistema',
      rol: 'ADMIN'
    }
  });

  console.log('Usuario admin creado - ID:', admin.id);
  console.log('Username:', admin.username);
  console.log('Password: admin123');
  console.log('Nombre:', admin.nombreCompleto);
}

// Usar top-level await (mejor práctica)
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: Error) => {
    console.error('Error en el seed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
