import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de la base de datos...');

  // Usuario Admin por defecto
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@taller.com' },
    update: {},
    create: {
      nombre: 'Administrador',
      email: 'admin@taller.com',
      password: 'admin123', // TODO: En producción usar bcrypt
      rol: 'ADMIN'
    }
  });

  console.log('Usuario admin creado - ID:', admin.id);
  console.log('Email:', admin.email);
  console.log('Password: admin123');
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
