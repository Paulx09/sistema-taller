/**
 * Declaración de tipos para la API expuesta por el preload de Electron.
 * Disponible en window.electronAPI cuando la app corre dentro de Electron.
 */
interface ElectronAPI {
  /** Abre una URL en el navegador predeterminado del sistema operativo. */
  openExternal: (url: string) => void;
  /** Abre el diálogo nativo del SO para elegir un archivo .sql. Devuelve la ruta o null. */
  openFileDialog: () => Promise<string | null>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
