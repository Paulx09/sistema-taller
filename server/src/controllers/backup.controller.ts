import { Request, Response } from 'express';
import { runBackup, cleanOldBackups, BackupResult } from '../services/backup.service';

export const backupController = {
  /**
   * POST /api/backup/ejecutar
   * Dispara un pg_dump inmediato y devuelve el resultado.
   */
  async ejecutar(req: Request, res: Response): Promise<void> {
    try {
      console.log('[Backup] Iniciando backup manual...');
      const result: BackupResult = await runBackup();

      if (!result.success) {
        res.status(500).json({
          success: false,
          mensaje: 'Error al generar el backup',
          error: result.error,
        });
        return;
      }

      // Limpiar backups viejos después de un backup exitoso
      cleanOldBackups(30);

      res.json({
        success: true,
        mensaje: 'Backup generado correctamente',
        filename: result.filename,
        sizeKB: result.sizeKB,
        filePath: result.filePath,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ success: false, error: msg });
    }
  },

  /**
   * GET /api/backup/estado
   * Devuelve info básica: directorio, cantidad de backups y el último.
   */
  async estado(req: Request, res: Response): Promise<void> {
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');

      const backupDir =
        process.env['BACKUP_DIR'] ||
        path.join(process.cwd(), 'backups');

      const existe = fs.existsSync(backupDir);

      const archivos = existe
        ? fs.readdirSync(backupDir)
            .filter((f: string) => f.startsWith('backup_taller_') && f.endsWith('.sql'))
            .map((f: string) => {
              const stats = fs.statSync(path.join(backupDir, f));
              return { nombre: f, sizeKB: Math.round(stats.size / 1024), fecha: stats.mtime };
            })
            .sort((a: { fecha: Date }, b: { fecha: Date }) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        : [];

      res.json({
        success: true,
        backupDir,
        totalBackups: archivos.length,
        ultimoBackup: archivos[0] ?? null,
        archivos: archivos.slice(0, 10), // últimos 10
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ success: false, error: msg });
    }
  },
};
