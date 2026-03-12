# Ferromaderas Inventory Sync

Aplicación que lee archivos Excel (reporte de Dichara) de una carpeta y los envía a la API en la nube. Para ejecutarse con **Programador de tareas de Windows** a las 8:00, 12:00 y 17:00.

**→ Ver [GUIA-IMPLEMENTACION.md](GUIA-IMPLEMENTACION.md) para el procedimiento completo y dudas sobre archivos.**

## Requisitos en PCs de Ferromaderas

- **Ninguno** si usas el .exe compilado
- Solo el archivo `.exe` + `config.json` en la misma carpeta

## Configuración

1. Copia `config.example.json` a `config.json` y edita `apiUrl`, `folderPath`
2. Copia `run-sync.bat.example` a `run-sync.bat` y edita la API_KEY (no se sube a git)

**config.json** (sin la clave):
```json
{
  "apiUrl": "https://tu-api.com",
  "folderPath": "C:\\Inventario",
  "sync": false
}
```

**run-sync.bat** (contiene la API_KEY en variable de entorno):
```bat
set API_KEY=la-misma-clave-que-INVENTORY_SYNC_API_KEY
ferromaderas-inventory-sync.exe
```

| Campo | Descripción |
|-------|-------------|
| `apiUrl` | URL base de la API (sin /api al final) |
| `folderPath` | Carpeta donde se coloca el Excel |
| `sync` | Si `true`, desactiva productos que no están en el archivo |
| `API_KEY` (en run-sync.bat) | Debe coincidir con `INVENTORY_SYNC_API_KEY` en la API |

## Uso

### Opción 1: Node.js (desarrollo)

```bash
npm install
npm run build
npm start
```

### Opción 2: .exe (producción)

```bash
npm install
npm run exe
```

El .exe quedará en `dist/ferromaderas-inventory-sync.exe`. Copia a la carpeta de Ferromaderas junto con `config.json` y `run-sync.bat`.

### Opción 3: Programador de tareas de Windows

1. Abre "Programador de tareas"
2. Crear tarea
3. Desencadenador: Diariamente, 8:00, 12:00, 17:00
4. Acción: Iniciar programa → `C:\ruta\run-sync.bat` (no el .exe directamente)
5. Iniciar en: carpeta donde está run-sync.bat, config.json y el .exe

## Flujo

1. Ferromaderas genera el reporte en Dichara y guarda el Excel en la carpeta
2. A la hora programada, el .exe:
   - Lee los archivos .xlsx/.xls
   - Parsea (Código, Descripción, Teórico)
   - POST a `{apiUrl}/api/products/bulk-sync` con header `X-API-Key`
   - Mueve los archivos a `procesados/` con timestamp

## Archivos procesados

Los archivos se mueven a `procesados/` con formato: `nombre_2026-03-10T12-00-00.xlsx`

Si hay error, el archivo **no** se mueve para evitar pérdida de datos.

## Logs

Cada ejecución escribe en `logs/sync-YYYY-MM-DD.log` (un archivo por día).

**Cómo verificar si se subió:**

1. Abrir `logs/sync-2026-03-10.log` (fecha del día)
2. Buscar la última ejecución por timestamp
3. Si aparece `Ejecución completada correctamente.` → todo OK
4. Si aparece `Creados: X, Actualizados: Y` → se subió correctamente
5. Si aparece `Error en...` o `Ejecución finalizada con errores` → hubo fallo

También puedes revisar si el archivo quedó en `procesados/` (se subió) o sigue en la carpeta principal (falló).
