import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import prisma from './config/database';
import routes from './routes';
import { runBackup, cleanOldBackups } from './services/backup.service';
import { bootstrapDatabaseIfEnabled } from './bootstrap/database-bootstrap';

const app = express();

// ── Directorio de uploads: si Electron lo indica (userData) se usa ese,
// si no se cae al directorio local del servidor (modo dev / servidor manual)
const uploadsBase =
  process.env['UPLOADS_DIR'] ??
  path.join(process.cwd(), 'uploads');

const uploadsDir = path.join(uploadsBase, 'productos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Carpeta uploads/productos creada en:', uploadsDir);
}

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde el directorio de uploads (dinámico)
app.use('/uploads', express.static(uploadsBase));

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

// ── En producción (Electron empaquetado), servir el frontend React compilado
if (env.NODE_ENV === 'production') {
  // El cliente compilado está en resources/client/dist dentro del paquete
  const clientDist =
    process.env['CLIENT_DIST'] ??
    path.join(process.cwd(), '..', 'client', 'dist');

  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    // SPA fallback: cualquier ruta que no sea /api ni /uploads
    app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
    console.log('Frontend React servido desde:', clientDist);
  }
}

// Manejo de errores
app.use(notFoundHandler);
app.use(errorHandler);

// Iniciar servidor
const PORT = env.PORT;

async function startServer(): Promise<void> {
  await bootstrapDatabaseIfEnabled();

  app.listen(PORT, () => {
    console.log('Servidor iniciado correctamente');
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Entorno: ${env.NODE_ENV}`);
    console.log(`Base de datos: Conectada`);

    // ── Backup automático programado ──────────────────────────────────────────
    // Solo en producción (empaquetado con Electron).
    // Se ejecuta dos veces al día: a las 14:00 y a las 20:00 (hora local).
    if (env.NODE_ENV === 'production') {
      function scheduleBackup() {
        const now = new Date();
        const targets = [14, 20]; // horas del día

        // Calcular milisegundos hasta la próxima hora objetivo
        const delays = targets.map((h) => {
          const next = new Date(now);
          next.setHours(h, 0, 0, 0);
          if (next <= now) next.setDate(next.getDate() + 1); // mañana si ya pasó
          return next.getTime() - now.getTime();
        });

        const nextMs = Math.min(...delays);
        console.log(
          `[Backup] Próximo backup automático en ${Math.round(nextMs / 60_000)} minutos`
        );

        setTimeout(async () => {
          console.log('[Backup] Ejecutando backup automático...');
          const result = await runBackup();
          if (result.success) {
            console.log(`[Backup] OK → ${result.filename} (${result.sizeKB} KB)`);
            cleanOldBackups(30);
          } else {
            console.error('[Backup] Error:', result.error);
          }
          // Programar el siguiente
          scheduleBackup();
        }, nextMs);
      }

      scheduleBackup();
    }
  });
}

async function main(): Promise<void> {
  try {
    await startServer();
  } catch (error: unknown) {
    console.error('[Bootstrap] Error al iniciar servidor:', error);
    process.exit(1);
  }
}

void main();

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
