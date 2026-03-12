/**
 * Panel simple para que el administrador pueda disparar un backup manual
 * y ver el estado del último backup.
 *
 * Usar en la página de configuración o en el Dashboard.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, DatabaseBackup, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '@/services/api';

interface BackupEstado {
  totalBackups: number;
  ultimoBackup: {
    nombre: string;
    sizeKB: number;
    fecha: string;
  } | null;
  backupDir: string;
}

export function BackupPanel() {
  const [ejecutando, setEjecutando] = useState(false);
  const [estado, setEstado] = useState<BackupEstado | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  async function cargarEstado() {
    try {
      const res = await api.get<{ success: boolean } & BackupEstado>('/backup/estado');
      if (res.data.success) setEstado(res.data);
    } catch {
      // silencioso
    }
  }

  async function handleBackup() {
    setEjecutando(true);
    setMensaje(null);
    try {
      const res = await api.post<{ success: boolean; filename: string; sizeKB: number; error?: string }>(
        '/backup/ejecutar'
      );
      if (res.data.success) {
        setMensaje({ tipo: 'ok', texto: `Backup creado: ${res.data.filename} (${res.data.sizeKB} KB)` });
        cargarEstado();
      } else {
        setMensaje({ tipo: 'error', texto: res.data.error ?? 'Error desconocido' });
      }
    } catch (e: any) {
      setMensaje({ tipo: 'error', texto: e?.response?.data?.error ?? 'No se pudo conectar al servidor' });
    } finally {
      setEjecutando(false);
    }
  }

  // Cargar estado al montar por primera vez
  useState(() => { cargarEstado(); });

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <DatabaseBackup className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-sm">Copia de seguridad</h3>
      </div>

      {estado && (
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Backups guardados: <span className="font-medium text-foreground">{estado.totalBackups}</span></p>
          {estado.ultimoBackup && (
            <p>
              Último:{' '}
              <span className="font-medium text-foreground">
                {new Date(estado.ultimoBackup.fecha).toLocaleString('es-PE')}
              </span>{' '}
              ({estado.ultimoBackup.sizeKB} KB)
            </p>
          )}
          <p className="truncate" title={estado.backupDir}>Directorio: {estado.backupDir}</p>
        </div>
      )}

      {mensaje && (
        <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
          mensaje.tipo === 'ok'
            ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
            : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
        }`}>
          {mensaje.tipo === 'ok'
            ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
          <span>{mensaje.texto}</span>
        </div>
      )}

      <Button
        size="sm"
        variant="outline"
        onClick={handleBackup}
        disabled={ejecutando}
        className="w-full"
      >
        {ejecutando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {ejecutando ? 'Generando backup...' : 'Hacer backup ahora'}
      </Button>

      <p className="text-[10px] text-muted-foreground">
        El backup automático se genera a las 14:00 y 20:00 cada día.
      </p>
    </div>
  );
}
