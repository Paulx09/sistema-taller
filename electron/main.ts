import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import { spawn, ChildProcess } from 'node:child_process';

/**
 * Lee un archivo .env y devuelve sus variables como objeto.
 * Se usa para pasar DATABASE_URL y demás al proceso servidor.
 */
function loadEnvFile(envPath: string): Record<string, string> {
  if (!fs.existsSync(envPath)) return {};
  const result: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) result[key] = value;
  }
  return result;
}

/**
 * Espera hasta que el servidor responda en /health haciendo polling.
 * Llama a onReady() cuando está listo, o onFail() si se agotan los reintentos.
 */
function waitForServer(
  onReady: () => void,
  onFail: (reason: string) => void,
  retries = 240,
  interval = 500
): void {
  // Si el proceso servidor ya terminó, fallar de inmediato sin esperar
  if (serverExited) {
    onFail('El proceso del servidor terminó inesperadamente. Revisa server.log en la carpeta de datos de la aplicación.');
    return;
  }
  http.get('http://localhost:3000/health', (res) => {
    if (res.statusCode === 200) {
      onReady();
    } else {
      res.resume();
      if (retries > 0) setTimeout(() => waitForServer(onReady, onFail, retries - 1, interval), interval);
      else onFail('El servidor no respondió después de 120 segundos.');
    }
  }).on('error', () => {
    if (retries > 0) setTimeout(() => waitForServer(onReady, onFail, retries - 1, interval), interval);
    else onFail('El servidor no respondió después de 120 segundos.');
  });
}

// Proceso hijo del servidor Node
let serverProcess: ChildProcess | null = null;
let serverExited = false;

/** Abre (o reutiliza) el stream de log en userData/server.log */
function createLogStream() {
  const logDir = app.getPath('userData');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  return fs.createWriteStream(path.join(logDir, 'server.log'), { flags: 'a' });
}

function startServer(): void {
  const isPackaged = app.isPackaged;

  // ── Rutas correctas según entorno ─────────────────────────────────────────
  // En producción, los archivos del server están FUERA del asar (asarUnpack).
  // process.resourcesPath → carpeta resources/ del ejecutable instalado.
  const serverEntry = isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'server', 'dist', 'index.js')
    : path.join(__dirname, '..', 'server', 'dist', 'index.js');

  // client/dist viene de extraResources → resources/client/dist
  const clientDist = isPackaged
    ? path.join(process.resourcesPath, 'client', 'dist')
    : path.join(__dirname, '..', 'client', 'dist');

  // ── Variables de entorno del servidor ────────────────────────────────────
  // En producción, leemos el .env desde extraResources (bundleado como server.env).
  const envFilePath = isPackaged
    ? path.join(process.resourcesPath, 'server.env')
    : path.join(__dirname, '..', '..', 'server', '.env');
  const fileEnvVars = loadEnvFile(envFilePath);

  // ── Ejecutable Node ───────────────────────────────────────────────────────
  // En desarrollo: 'node' del sistema.
  // En producción: el propio binario de Electron funciona como Node.js
  //   cuando se establece ELECTRON_RUN_AS_NODE=1.
  // IMPORTANTE: NO pasar --no-sandbox aquí; interfiere con ELECTRON_RUN_AS_NODE.
  const nodeExec   = isPackaged ? process.execPath : 'node';
  const nodeArgs   = [serverEntry];  // Solo el script, sin flags de Electron
  const extraFlags = isPackaged ? { ELECTRON_RUN_AS_NODE: '1' } : {};

  const logStream = createLogStream();
  const ts = () => `[${new Date().toISOString()}]`;
  logStream.write(`\n${ts()} ── Iniciando servidor ──────────────────\n`);
  logStream.write(`${ts()} exec: ${nodeExec}\n`);
  logStream.write(`${ts()} entry: ${serverEntry}\n`);
  logStream.write(`${ts()} resourcesPath: ${process.resourcesPath}\n`);
  logStream.write(`${ts()} envFile: ${envFilePath} (existe: ${fs.existsSync(envFilePath)})\n`);
  logStream.write(`${ts()} serverEntry existe: ${fs.existsSync(serverEntry)}\n`);

  serverExited = false;
  serverProcess = spawn(nodeExec, nodeArgs, {
    stdio: 'pipe',
    env: {
      ...process.env,
      ...fileEnvVars,    // DATABASE_URL y demás del .env
      ...extraFlags,
      NODE_ENV: 'production',
      UPLOADS_DIR: path.join(app.getPath('userData'), 'uploads'),
      BACKUP_DIR:  path.join(app.getPath('userData'), 'backups'),
      // Si el archivo .env define EXTRA_BACKUP_DIR, se pasa al servidor
      ...(fileEnvVars['EXTRA_BACKUP_DIR'] ? { EXTRA_BACKUP_DIR: fileEnvVars['EXTRA_BACKUP_DIR'] } : {}),
      CLIENT_DIST: clientDist,
    },
  });

  serverProcess.stdout?.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    logStream.write(`${ts()} [out] ${msg}\n`);
    console.log('[Server]', msg);
  });

  serverProcess.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    logStream.write(`${ts()} [err] ${msg}\n`);
    console.error('[Server Error]', msg);
  });

  serverProcess.on('exit', (code) => {
    serverExited = true;
    logStream.write(`${ts()} [exit] código ${code}\n`);
    console.log(`[Server] Proceso terminado con código ${code}`);
  });
}

// Ventana principal
let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'Sistema Taller',
    // icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,   // Seguridad: NO exponer Node en el renderer
      contextIsolation: true,   // Seguridad: contexto aislado
      sandbox: false,           // Necesario para preload
    },
  });

  // Mostrar pantalla de carga mientras el servidor arranca
  const logPath = path.join(app.getPath('userData'), 'server.log');
  mainWindow.loadURL(
    'data:text/html;charset=utf-8,' + encodeURIComponent(
      '<!DOCTYPE html><html><head><meta charset="UTF-8">'
      + '<style>*{margin:0;box-sizing:border-box}'
      + 'body{background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;'
      + 'display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px}'
      + '.spinner{width:48px;height:48px;border:4px solid #334155;border-top-color:#6366f1;'
      + 'border-radius:50%;animation:spin 1s linear infinite}'
      + '@keyframes spin{to{transform:rotate(360deg)}}'
      + 'h2{font-size:1.3rem;font-weight:600}'
      + 'p{font-size:.85rem;color:#94a3b8;text-align:center;max-width:400px}'
      + '.hint{font-size:.75rem;color:#475569;text-align:center;max-width:420px;margin-top:4px}</style></head>'
      + '<body><div class="spinner"></div>'
      + '<h2>Iniciando Sistema Taller...</h2>'
      + '<p>Esperando al servidor. Esto puede tomar unos segundos.</p>'
      + '<p class="hint">La primera vez que se ejecuta la aplicación puede tardar hasta 1 minuto mientras se prepara la base de datos.</p>'
      + '</body></html>'
    )
  );

  // Esperar hasta que el servidor responda (polling a /health)
  waitForServer(
    () => mainWindow?.loadURL('http://localhost:3000'),
    (reason) => {
      console.error('[Electron] Fallo al iniciar servidor:', reason);
      mainWindow?.loadURL(
        'data:text/html;charset=utf-8,' + encodeURIComponent(
          '<!DOCTYPE html><html><head><meta charset="UTF-8">'
          + '<style>*{margin:0;box-sizing:border-box}'
          + 'body{background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;'
          + 'display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;padding:32px}'
          + 'h2{font-size:1.3rem;color:#f87171}'
          + 'p{font-size:.85rem;color:#94a3b8;text-align:center;max-width:480px}'
          + 'code{background:#1e293b;padding:4px 8px;border-radius:4px;font-size:.8rem;word-break:break-all}</style></head>'
          + '<body><h2>&#9888; No se pudo iniciar el servidor</h2>'
          + '<p>' + reason + '</p>'
          + '<p>Revisa el archivo de log para más detalles:</p>'
          + '<code>' + logPath + '</code>'
          + '</body></html>'
        )
      );
    }
  );

  // Abrir DevTools solo en desarrollo (nunca en la app empaquetada)
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  // Interceptar todos los enlaces externos (WhatsApp, web, etc.). 
  // En lugar de abrirlos dentro de la ventana Electron, los delega al navegador predeterminado del sistema operativo
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Capturar clics en <a target="_blank"> o window.open
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const internalBase = 'http://localhost:3000';
    if (!url.startsWith(internalBase)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC: abrir URL en navegador externo (llamado desde el renderer)
ipcMain.handle('open-external', (_event, url: string) => {
  shell.openExternal(url);
});

// Ciclo de vida de la app
app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    serverProcess?.kill();
    app.quit();
  }
});

app.on('before-quit', () => {
  serverProcess?.kill();
});
