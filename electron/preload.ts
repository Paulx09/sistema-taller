/**
 * Preload script — se ejecuta en un contexto privilegiado antes de que cargue
 * el renderer. Usamos contextBridge para exponer SOLO las APIs que el frontend
 * necesita, sin dar acceso completo a Node.
 */
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Abre una URL en el navegador predeterminado del sistema.
   * Se usa para WhatsApp, sitios web, etc.
   */
  openExternal: (url: string): void => {
    ipcRenderer.invoke('open-external', url);
  },
});
