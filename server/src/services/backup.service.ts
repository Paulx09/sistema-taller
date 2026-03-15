/**
 * Genera un volcado de la base de datos PostgreSQL usando pg_dump
 * y lo guarda en el directorio de backups configurado.
 *
 * El archivo resultante tiene el formato:
 *   backup_taller_YYYY-MM-DD_HH-MM.sql
 *
 */
import path from 'node:path';
import fs from 'node:fs';
import { exec, execFile } from 'node:child_process';

// Helpers

/** Convierte un timestamp a string con formato seguro para nombres de archivo */
function timestampForFilename(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `_${pad(date.getHours())}-${pad(date.getMinutes())}`
  );
}

/** Parsea la DATABASE_URL para extraer los componentes necesarios por pg_dump */
function parseDbUrl(databaseUrl: string): {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
} {
  // Formato: postgresql://USER:PASS@HOST:PORT/DATABASE?schema=public
  const url = new URL(databaseUrl);
  return {
    host:     url.hostname,
    port:     url.port || '5432',
    database: url.pathname.replace('/', ''),
    user:     decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  };
}

// Función principal

export interface BackupResult {
  success: boolean;
  filePath?: string;
  filename?: string;
  sizeKB?: number;
  error?: string;
}

export async function runBackup(): Promise<BackupResult> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    return { success: false, error: 'DATABASE_URL no está definida' };
  }

  // Directorio de backups — si viene de Electron viene en userData, si no
  // se usa un directorio local al servidor
  const backupDir =
    process.env['BACKUP_DIR'] ||
    path.join(process.cwd(), 'backups');

  // Crear directorio si no existe
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp  = timestampForFilename(new Date());
  const filename   = `backup_taller_${timestamp}.sql`;
  const outputFile = path.join(backupDir, filename);

  // Parsear conexión
  let dbConn: ReturnType<typeof parseDbUrl>;
  try {
    dbConn = parseDbUrl(databaseUrl);
  } catch {
    return { success: false, error: 'DATABASE_URL con formato inválido' };
  }

  // Construir comando pg_dump
  // --clean --if-exists: incluye DROP TABLE IF EXISTS antes de cada CREATE TABLE.
  // Se usa PGPASSWORD para evitar un prompt interactivo.
  const pgDumpCmd = [
    `pg_dump`,
    `--host=${dbConn.host}`,
    `--port=${dbConn.port}`,
    `--username=${dbConn.user}`,
    `--dbname=${dbConn.database}`,
    `--no-password`,
    `--format=plain`,
    `--clean`,
    `--if-exists`,
    `--file="${outputFile}"`,
  ].join(' ');

  return new Promise((resolve) => {
    exec(
      pgDumpCmd,
      {
        env: {
          ...process.env,
          PGPASSWORD: dbConn.password,
        },
        timeout: 60_000, // 60 segundos máximo
      },
      (error, _stdout, stderr) => {
        if (error) {
          // Limpiar archivo parcial si fue creado
          if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
          resolve({
            success: false,
            error: stderr?.trim() || error.message,
          });
          return;
        }

        const stats = fs.statSync(outputFile);

        // Copia adicional en disco secundario (ej. D:\Backups\SistemaTaller)
        // Se activa si la variable de entorno EXTRA_BACKUP_DIR está definida.
        const extraDir = process.env['EXTRA_BACKUP_DIR'];
        if (extraDir) {
          try {
            if (!fs.existsSync(extraDir)) fs.mkdirSync(extraDir, { recursive: true });
            fs.copyFileSync(outputFile, path.join(extraDir, filename));
          } catch {
            // No falla el backup principal si la copia extra falla
          }
        }

        resolve({
          success: true,
          filePath: outputFile,
          filename,
          sizeKB: Math.round(stats.size / 1024),
        });
      }
    );
  });
}

// Limpieza de backups antiguos (retención)

/**
 * Elimina los backups más viejos de `keepCount` archivos en el directorio.
 * Por defecto mantiene los últimos 30 backups (~15 días si se hacen 2/día).
 */
export function cleanOldBackups(keepCount = 30): void {
  const backupDir =
    process.env['BACKUP_DIR'] ||
    path.join(process.cwd(), 'backups');

  if (!fs.existsSync(backupDir)) return;

  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith('backup_taller_') && f.endsWith('.sql'))
    .map((f) => ({
      name: f,
      mtime: fs.statSync(path.join(backupDir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime); // más reciente primero

  // Eliminar los que sobran
  files.slice(keepCount).forEach(({ name }) => {
    try {
      fs.unlinkSync(path.join(backupDir, name));
      console.log(`[Backup] Eliminado backup antiguo: ${name}`);
    } catch {
      // ignorar error de eliminación
    }
  });
}

// Restauración

export interface RestoreResult {
  success: boolean;
  error?: string;
}

/**
 * Restaura la base de datos desde un volcado .sql usando psql.
 * Requiere que psql esté accesible en el PATH (viene con PostgreSQL).
 */
export async function runRestore(filePath: string): Promise<RestoreResult> {
  if (!filePath.endsWith('.sql')) {
    return { success: false, error: 'El archivo debe tener extensión .sql' };
  }
  if (!fs.existsSync(filePath)) {
    return { success: false, error: 'Archivo no encontrado: ' + filePath };
  }

  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    return { success: false, error: 'DATABASE_URL no está definida' };
  }

  let dbConn: ReturnType<typeof parseDbUrl>;
  try {
    dbConn = parseDbUrl(databaseUrl);
  } catch {
    return { success: false, error: 'DATABASE_URL con formato inválido' };
  }

  const args = [
    `--host=${dbConn.host}`,
    `--port=${dbConn.port}`,
    `--username=${dbConn.user}`,
    `--dbname=${dbConn.database}`,
    '--no-password',
    // No abortar ante errores de DROP (ej. si una tabla no existe aún)
    '--set=ON_ERROR_STOP=off',
    `--file=${filePath}`,
  ];

  return new Promise((resolve) => {
    execFile(
      'psql',
      args,
      {
        env: { ...process.env, PGPASSWORD: dbConn.password },
        timeout: 120_000,
      },
      (error, _stdout, stderr) => {
        if (error) {
          resolve({ success: false, error: stderr?.trim() || error.message });
          return;
        }
        resolve({ success: true });
      }
    );
  });
}
