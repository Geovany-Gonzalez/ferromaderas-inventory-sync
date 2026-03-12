/**
 * Ferromaderas Inventory Sync
 * Lee archivos Excel (reporte Dichara) de una carpeta y los envía a la API en la nube.
 * Ejecutar con Programador de tareas de Windows a las 8:00, 12:00 y 17:00.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Logging (consola + archivo)
// ---------------------------------------------------------------------------

let logStream: fs.WriteStream | null = null;

function initLogFile(): void {
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const date = new Date().toISOString().slice(0, 10);
  const logPath = path.join(logsDir, `sync-${date}.log`);
  logStream = fs.createWriteStream(logPath, { flags: 'a' });
}

function log(msg: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${msg}\n`;
  if (level === 'error') console.error(msg);
  else if (level === 'warn') console.warn(msg);
  else console.log(msg);
  if (logStream) {
    logStream.write(line);
  }
}

function closeLog(): void {
  if (logStream) {
    logStream.end();
    logStream = null;
  }
}

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------

interface Config {
  apiUrl: string;
  apiKey: string;
  folderPath: string;
  sync: boolean;
}

function loadConfig(): Config {
  const configPath = path.join(process.cwd(), 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const data = JSON.parse(raw) as Record<string, unknown>;
      return {
        apiUrl: String(data.apiUrl ?? '').trim(),
        apiKey: String(data.apiKey ?? '').trim(),
        folderPath: String(data.folderPath ?? '').trim(),
        sync: data.sync === true,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Error leyendo config.json:', msg);
      process.exit(1);
    }
  }
  return { apiUrl: '', apiKey: '', folderPath: '', sync: false };
}

// API_KEY: variable de entorno (recomendado) o config.json. Usar run-sync.bat para no guardarla en archivo.

const config = loadConfig();
const API_URL = (process.env.API_URL ?? config.apiUrl).trim();
const API_KEY = (process.env.API_KEY ?? config.apiKey).trim();
const FOLDER_PATH = (process.env.FOLDER_PATH ?? config.folderPath).trim();
const SYNC = process.env.SYNC !== undefined ? process.env.SYNC === 'true' : config.sync;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface InventoryItem {
  code: string;
  name: string;
  stock: number;
}

interface BulkImportResult {
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Parseo Excel (compatible con Dichara)
// ---------------------------------------------------------------------------

function parseExcelRows(rows: (string | number)[][]): InventoryItem[] {
  if (!rows?.length) return [];

  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const row = rows[i] ?? [];
    const str = row.map((c) => String(c ?? '').toLowerCase()).join(' ');
    if (/c[oó]digo/.test(str) && /descripci[oó]n/.test(str)) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx < 0) return [];

  const header = (rows[headerRowIdx] ?? []).map((c) =>
    String(c ?? '').toLowerCase().trim(),
  );
  const codeIdx = header.findIndex((h) => /c[oó]digo|code/.test(h));
  const descIdx = header.findIndex((h) =>
    /descripci[oó]n|nombre|name|producto/.test(h),
  );
  const stockIdx = header.findIndex((h) =>
    /te[oó]rico|existencia|inventario|stock/.test(h),
  );
  const fallbackCode = codeIdx >= 0 ? codeIdx : 0;
  const fallbackDesc = descIdx >= 0 ? descIdx : 1;

  const items: InventoryItem[] = [];
  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === '' || c == null)) continue;
    const code = String(row[codeIdx] ?? row[fallbackCode] ?? '').trim();
    const name = String(row[descIdx] ?? row[fallbackDesc] ?? row[0] ?? '').trim();
    const rawStock = row[stockIdx] ?? row[stockIdx >= 0 ? stockIdx : -1];
    const stock =
      typeof rawStock === 'number'
        ? Math.max(0, rawStock)
        : parseInt(String(rawStock ?? '0'), 10) || 0;
    if (code || name) {
      items.push({ code: code || `item-${i + 1}`, name: name || code, stock });
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

async function sendToApi(items: InventoryItem[]): Promise<BulkImportResult> {
  const baseUrl = API_URL.replace(/\/$/, '');
  const url = `${baseUrl}/api/products/bulk-sync`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({ items, sync: SYNC }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${text}`);
  }

  try {
    return JSON.parse(text) as BulkImportResult;
  } catch {
    throw new Error(`API respondió texto inválido: ${text.slice(0, 100)}`);
  }
}

// ---------------------------------------------------------------------------
// Archivos
// ---------------------------------------------------------------------------

function moveToProcessed(
  filePath: string,
  processedDir: string,
  fileName: string,
): void {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  const baseName = path.basename(fileName, path.extname(fileName));
  const ext = path.extname(fileName);
  const destPath = path.join(processedDir, `${baseName}_${timestamp}${ext}`);
  fs.renameSync(filePath, destPath);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  initLogFile();
  log('--- Ferromaderas Inventory Sync ---');

  if (!API_URL || !API_KEY || !FOLDER_PATH) {
    if (!API_KEY) {
      log('API_KEY requerida. Usa run-sync.bat (variable de entorno) o apiKey en config.json', 'error');
    } else {
      log('Configura config.json: apiUrl, folderPath', 'error');
    }
    closeLog();
    process.exit(1);
  }

  const resolvedPath = path.resolve(FOLDER_PATH);
  if (!fs.existsSync(resolvedPath)) {
    log(`Carpeta no existe: ${resolvedPath}`, 'error');
    closeLog();
    process.exit(1);
  }

  const files = fs.readdirSync(resolvedPath);
  const excelFiles = files.filter(
    (f) => f.endsWith('.xlsx') || f.endsWith('.xls'),
  );

  if (excelFiles.length === 0) {
    log('No hay archivos Excel (.xlsx, .xls) en la carpeta.');
    closeLog();
    return;
  }

  log(`Carpeta: ${resolvedPath}`);
  log(`Archivos a procesar: ${excelFiles.join(', ')}`);

  const processedDir = path.join(resolvedPath, 'procesados');
  if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
  }

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalDeleted = 0;
  let hasErrors = false;

  for (const file of excelFiles) {
    const filePath = path.join(resolvedPath, file);
    try {
      const buffer = fs.readFileSync(filePath);
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<string[]>(ws, {
        header: 1,
      }) as (string | number)[][];

      const items = parseExcelRows(rows);
      if (items.length === 0) {
        log(`Sin productos válidos en ${file}`, 'warn');
        moveToProcessed(filePath, processedDir, file);
        continue;
      }

      const result = await sendToApi(items);
      totalCreated += result.created;
      totalUpdated += result.updated;
      totalDeleted += result.deleted;

      if (result.errors.length > 0) {
        log(`Advertencias en ${file}: ${result.errors.slice(0, 3).join('; ')}`, 'warn');
        hasErrors = true;
      }

      const resultMsg =
        `[${file}] Creados: ${result.created}, Actualizados: ${result.updated}` +
        (result.deleted > 0 ? `, Desactivados: ${result.deleted}` : '');
      log(resultMsg);

      moveToProcessed(filePath, processedDir, file);
      log(`  → Movido a procesados/`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`Error en ${file}: ${msg}`, 'error');
      hasErrors = true;
      // No mover archivos con error para evitar pérdida de datos
    }
  }

  if (totalCreated > 0 || totalUpdated > 0 || totalDeleted > 0) {
    const totalMsg =
      `Total: ${totalCreated} creados, ${totalUpdated} actualizados` +
      (totalDeleted > 0 ? `, ${totalDeleted} desactivados` : '');
    log(totalMsg);
  }

  if (hasErrors) {
    log('Ejecución finalizada con errores.', 'warn');
    closeLog();
    process.exit(1);
  }

  log('Ejecución completada correctamente.');
  closeLog();
}

main().catch((err) => {
  console.error('Error fatal:', err);
  if (logStream) {
    logStream.write(`[${new Date().toISOString()}] [ERROR] Error fatal: ${err}\n`);
    closeLog();
  }
  process.exit(1);
});
