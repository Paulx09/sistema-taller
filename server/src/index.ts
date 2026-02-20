import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import prisma from './config/database';
import routes from './routes';

const app = express();

// Crear carpeta uploads si no existe
const uploadsDir = path.join(process.cwd(), 'uploads', 'productos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Carpeta uploads/productos creada');
}

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde /uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Ruta de salud (health check)
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV
  });
});

// Montar rutas de la API
app.use('/api', routes);

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
