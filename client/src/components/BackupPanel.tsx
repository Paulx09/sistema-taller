/**
 * Panel de copia de seguridad para administradores.
 * Permite generar backups manuales, ver el historial y restaurar
 * desde un backup de la lista o desde un archivo externo (solo Electron).
 */
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  DatabaseBackup,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  FolderOpen,
  HardDriveDownload,
} from 'lucide-react';
import api from '@/services/api';

interface ArchivoBackup {
  nombre: string;
  sizeKB: number;
  fecha: string;
}

interface BackupEstado {
  totalBackups: number;
  ultimoBackup: ArchivoBackup | null;
  backupDir: string;
  archivos: ArchivoBackup[];
}

type RestorePayload =
  | { filename: string; externalPath?: never }
  | { externalPath: string; filename?: never };

interface PendingRestore {
  label: string;
  payload: RestorePayload;
}

export function BackupPanel() {
  const [ejecutando, setEjecutando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [estado, setEstado] = useState<BackupEstado | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [pendingRestore, setPendingRestore] = useState<PendingRestore | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const enElectron = !!(globalThis as any).electronAPI?.openFileDialog;

  useEffect(() => { void cargarEstado(); }, []);

  async function cargarEstado() {
    try {
      const res = await api.get<{ success: boolean } & BackupEstado>('/backup/estado');
      if (res.data.success) setEstado(res.data);
    } catch {
      // silencioso — no mostrar error si falla la carga de estado
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
        void cargarEstado();
      } else {
        setMensaje({ tipo: 'error', texto: res.data.error ?? 'Error desconocido' });
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setMensaje({ tipo: 'error', texto: msg ?? 'No se pudo conectar al servidor' });
    } finally {
      setEjecutando(false);
    }
  }

  function pedirConfirmacion(pending: PendingRestore) {
    setMensaje(null);
    setPendingRestore(pending);
  }

  function handleRestoreFromList(archivo: ArchivoBackup) {
    pedirConfirmacion({
      label: archivo.nombre,
      payload: { filename: archivo.nombre },
    });
  }

  async function handlePickFile() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eAPI = (globalThis as any).electronAPI as ElectronAPI | undefined;
    if (!eAPI?.openFileDialog) return;
    const filePath = await eAPI.openFileDialog();
    if (!filePath) return;
    const parts = filePath.replaceAll('\\', '/').split('/');
    const label = parts.at(-1) ?? filePath;
    pedirConfirmacion({ label, payload: { externalPath: filePath } });
  }

  async function confirmarRestore() {
    if (!pendingRestore) return;
    setPendingRestore(null);
    setRestaurando(true);
    setMensaje(null);
    try {
      const res = await api.post<{ success: boolean; error?: string }>(
        '/backup/restaurar',
        pendingRestore.payload
      );
      if (res.data.success) {
        setMensaje({ tipo: 'ok', texto: 'Base de datos restaurada correctamente.' });
        void cargarEstado();
      } else {
        setMensaje({ tipo: 'error', texto: res.data.error ?? 'Error al restaurar' });
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setMensaje({ tipo: 'error', texto: msg ?? 'No se pudo restaurar' });
    } finally {
      setRestaurando(false);
    }
  }

  const ocupado = ejecutando || restaurando;
  const backupsDisponibles = estado?.archivos ?? [];

  return (
    <>
      <div className="rounded-xl border bg-card p-4 space-y-3">

        {/* Encabezado */}
        <div className="flex items-center gap-2">
          <DatabaseBackup className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Copia de seguridad</h3>
        </div>

        {/* Estado resumido */}
        {estado && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>
              Backups guardados:{' '}
              <span className="font-medium text-foreground">{estado.totalBackups}</span>
            </p>
            {estado.ultimoBackup && (
              <p>
                Último:{' '}
                <span className="font-medium text-foreground">
                  {new Date(estado.ultimoBackup.fecha).toLocaleString('es-PE')}
                </span>{' '}
                ({estado.ultimoBackup.sizeKB} KB)
              </p>
            )}
          </div>
        )}

        {/* Feedback */}
        {mensaje && (
          <div
            className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
              mensaje.tipo === 'ok'
                ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
            }`}
          >
            {mensaje.tipo === 'ok' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <span>{mensaje.texto}</span>
          </div>
        )}

        {/* Botón: Hacer backup */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleBackup}
          disabled={ocupado}
          className="w-full"
        >
          {ejecutando ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <HardDriveDownload className="h-4 w-4 mr-2" />
          )}
          {ejecutando ? 'Generando backup...' : 'Hacer backup ahora'}
        </Button>

        {/* Lista de backups para restaurar */}
        {backupsDisponibles.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Restaurar un backup
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5">
                {backupsDisponibles.map((archivo) => (
                  <div
                    key={archivo.nombre}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="text-[10px] font-medium text-foreground">
                        {new Date(archivo.fecha).toLocaleString('es-PE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{archivo.sizeKB} KB</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950 shrink-0"
                      onClick={() => handleRestoreFromList(archivo)}
                      disabled={ocupado}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restaurar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Restaurar desde archivo externo — solo disponible en Electron */}
        {enElectron && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handlePickFile}
            disabled={ocupado}
            className="w-full justify-start text-muted-foreground hover:text-foreground text-xs h-auto min-h-7 px-2 py-1.5 whitespace-normal"
          >
            <FolderOpen className="h-3.5 w-3.5 mr-1.5 shrink-0 self-start mt-0.5" />
            <span className="leading-tight text-left break-words">Restaurar desde archivo externo...</span>
          </Button>
        )}

        <p className="text-[10px] text-muted-foreground">
          El backup automático se genera a las 14:00 y 20:00 cada día.
        </p>
      </div>

      {/* Diálogo de confirmación de restauración */}
      <AlertDialog open={!!pendingRestore} onOpenChange={(open) => { if (!open) setPendingRestore(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restaurar base de datos?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Esto <strong>reemplazará completamente</strong> todos los datos actuales
                  (ventas, clientes, órdenes, inventario) con el contenido del backup seleccionado.
                </p>
                <p className="text-destructive font-semibold">
                  Esta acción no se puede deshacer.
                </p>
                {pendingRestore && (
                  <p className="font-mono text-xs bg-muted px-2 py-1.5 rounded break-all text-foreground">
                    {pendingRestore.label}
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarRestore}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sí, restaurar ahora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
