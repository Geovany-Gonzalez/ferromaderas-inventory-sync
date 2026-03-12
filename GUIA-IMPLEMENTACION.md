# Guía de implementación - Ferromaderas Inventory Sync

## ¿Qué pasa con los archivos?

**El archivo NO se elimina.** Se **mueve** a una subcarpeta `procesados/` con un timestamp en el nombre.

```
C:\Inventario\
├── reporte.xlsx          ← Aquí pones el archivo
└── procesados\           ← Después del proceso, queda aquí
    ├── reporte_2026-03-10T08-00-00.xlsx
    ├── reporte_2026-03-10T12-00-00.xlsx
    └── reporte_2026-03-10T17-00-00.xlsx
```

**Flujo:**

1. A las 7:00 pones `reporte.xlsx` en `C:\Inventario\`
2. A las 8:00 corre el .exe → procesa el archivo → lo mueve a `procesados/reporte_2026-03-10T08-00-00.xlsx`
3. La carpeta `C:\Inventario\` queda **vacía** (lista para el siguiente)
4. Si a las 10:00 pones otro `reporte.xlsx`, a las 12:00 se procesa y se mueve
5. Y así sucesivamente

**Puedes poner un archivo nuevo cuando quieras.** La carpeta principal queda libre después de cada proceso.

---

## Procedimiento completo

### Paso 1: Generar el .exe (una sola vez)

En tu PC de desarrollo:

```bash
cd ferromaderas-inventory-sync
npm install
npm run exe
```

El .exe queda en `dist/ferromaderas-inventory-sync.exe`.

### Paso 2: Crear la carpeta en Ferromaderas

En la PC donde correrá el proceso (o en un servidor local accesible):

```
C:\Inventario\
```

Esta es la carpeta donde Ferromaderas colocará el Excel.

### Paso 3: Configurar el .exe

Crea una carpeta para el programa, por ejemplo:

```
C:\Ferromaderas\InventorySync\
```

Copia ahí:

- `ferromaderas-inventory-sync.exe` (desde dist/)
- `config.json` (crear desde config.example.json)
- `run-sync.bat` (crear desde run-sync.bat.example)

Edita `config.json` (sin la clave):

```json
{
  "apiUrl": "https://tu-api-en-la-nube.com",
  "folderPath": "C:\\Inventario",
  "sync": false
}
```

Edita `run-sync.bat` y pon la API_KEY:

```bat
set API_KEY=la-clave-que-INVENTORY_SYNC_API_KEY-en-la-api
ferromaderas-inventory-sync.exe
```

**Seguridad:** La API_KEY va en run-sync.bat (variable de entorno), no en config.json. run-sync.bat está en .gitignore.

### Paso 4: Configurar la API en la nube

En el servidor donde está la API, agrega al .env:

```env
INVENTORY_SYNC_API_KEY=tu-clave-secreta-aqui
```

Genera una clave segura (ej: `openssl rand -hex 32` o usa un generador online).

### Paso 5: Programar la tarea en Windows

1. Abre **Programador de tareas** (buscar en el menú inicio)
2. **Crear tarea**
3. Nombre: `Ferromaderas Inventory Sync`
4. **Desencadenador:** Diariamente, 8:00, 12:00, 17:00
5. **Acción:** Iniciar un programa
6. Programa: `C:\Ferromaderas\InventorySync\run-sync.bat` (el .bat, no el .exe)
7. **Iniciar en:** `C:\Ferromaderas\InventorySync` (misma carpeta que el .exe y config.json)

El .bat define la API_KEY y ejecuta el .exe. Así la clave no queda en ningún archivo de configuración.

### Paso 6: Flujo de trabajo diario

1. Ferromaderas genera el reporte en Dichara (módulo "Reporte para levantar inventario")
2. Guarda el Excel (.xlsx) en `C:\Inventario\`
3. A las 8:00, 12:00 o 17:00 el .exe:
   - Lee el archivo
   - Lo envía a la API
   - Lo mueve a `procesados/` con timestamp
   - Escribe en `logs/sync-YYYY-MM-DD.log`

### Paso 7: Verificar que funcionó

1. Revisar `C:\Ferromaderas\InventorySync\logs\sync-2026-03-10.log`
2. Buscar la última ejecución
3. Si dice `Ejecución completada correctamente.` → OK
4. O verificar: si el archivo está en `procesados/` → se subió; si sigue en la carpeta principal → falló

---

## Resumen de carpetas

| Carpeta | Contenido |
|---------|-----------|
| `C:\Ferromaderas\InventorySync\` | .exe, config.json, run-sync.bat, logs/ |
| `C:\Inventario\` | Aquí se pone el Excel (queda vacía después de procesar) |
| `C:\Inventario\procesados\` | Archivos ya procesados (historial) |

---

## Preguntas frecuentes

**¿Puedo tener varios archivos a la vez?**  
Sí. El .exe procesa todos los .xlsx/.xls que encuentre y los mueve uno por uno.

**¿Qué pasa si pongo el archivo después de las 17:00?**  
Se procesará en la siguiente ejecución (8:00 del día siguiente).

**¿Puedo ejecutar el .exe manualmente?**  
Sí. Haz doble clic o ejecútalo desde la consola. Procesará lo que haya en la carpeta.

**¿Qué pasa si hay error?**  
El archivo NO se mueve. Queda en la carpeta principal. Revisa el log para ver el error.
