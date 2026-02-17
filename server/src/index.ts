import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import prisma from './config/database';

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de salud (health check)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV
  });
});

// TODO: Montar rutas aquí

// Manejo de errores
app.use(notFoundHandler);
app.use(errorHandler);

// Iniciar servidor
const PORT = env.PORT;

app.listen(PORT, () => {
  console.log('Servidor iniciado correctamente');
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Entorno: ${env.NODE_ENV}`);
  console.log(`Base de datos: Conectada`);
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('\n Cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n Cerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});
