# Manual paso a paso - Ferromaderas Inventory Sync

Ya tienes las carpetas y el .exe. Sigue estos pasos en orden.

---

## Paso 1: Crear config.json

En la carpeta donde está el .exe (ej: `C:\Ferromaderas\InventorySync\`), crea un archivo llamado `config.json` con este contenido:

```json
{
  "apiUrl": "https://tu-api-en-la-nube.com",
  "folderPath": "C:\\Inventario",
  "sync": false
}
```

**Cambia:**
- `apiUrl` → La URL de tu API (ej: `https://api.ferromaderas.com` o `http://localhost:3001` para pruebas)
- `folderPath` → Ya está bien si usas `C:\Inventario`
- `sync` → Déjalo en `false`

---

## Paso 2: Crear run-sync.bat

En la **misma carpeta** que el .exe, crea un archivo llamado `run-sync.bat`. Ábrelo con Bloc de notas y pega esto:

```bat
@echo off
set API_KEY=pon-aqui-la-misma-clave-que-en-la-api
ferromaderas-inventory-sync.exe
```

**Cambia:** `pon-aqui-la-misma-clave-que-en-la-api` por la clave que configuraste en la API (variable `INVENTORY_SYNC_API_KEY` en el .env del servidor).

Guarda el archivo.

---

## Paso 3: Verificar que la API tenga la clave

En el servidor donde corre la API, en el archivo `.env` debe estar:

```
INVENTORY_SYNC_API_KEY=la-misma-clave-que-poniste-en-run-sync-bat
```

La clave en `run-sync.bat` y en la API deben ser **exactamente iguales**.

---

## Paso 4: Programar la tarea en Windows

1. Presiona **Win + R**, escribe `taskschd.msc` y Enter.
2. Clic en **"Crear tarea..."** (no "Crear tarea básica").
3. Pestaña **General:**
   - Nombre: `Ferromaderas Inventory Sync`
4. Pestaña **Desencadenadores** → **Nuevo:**
   - Iniciar: Según una programación
   - Diariamente
   - Hora: **8:00:00** → Aceptar
5. Repite el paso 4 para crear 2 desencadenadores más: **12:00:00** y **17:00:00**.
6. Pestaña **Acciones** → **Nueva:**
   - Acción: Iniciar un programa
   - Programa: `C:\Ferromaderas\InventorySync\run-sync.bat` (la ruta donde está tu run-sync.bat)
   - Iniciar en: `C:\Ferromaderas\InventorySync` (la misma carpeta)
7. Clic en **Aceptar**.

---

## Paso 5: Probar manualmente

Antes de esperar a las 8:00, prueba que funcione:

1. Pon un archivo Excel en `C:\Inventario\`
2. Haz doble clic en `run-sync.bat`
3. Debería abrirse una ventana negra, procesar el archivo y cerrarse
4. Revisa: el archivo debe estar ahora en `C:\Inventario\procesados\`
5. Revisa los logs en `C:\Ferromaderas\InventorySync\logs\sync-2026-03-11.log`

Si todo eso pasa, está funcionando.

---

## Resumen: qué debe haber en la carpeta

```
C:\Ferromaderas\InventorySync\
├── ferromaderas-inventory-sync.exe
├── config.json
├── run-sync.bat
└── logs\          (se crea solo al ejecutar)
```

---

## Si algo falla

- **"API_KEY requerida"** → Revisa que run-sync.bat tenga `set API_KEY=tu-clave`
- **"401 Unauthorized"** → La clave en run-sync.bat no coincide con la de la API
- **"Carpeta no existe"** → Revisa que `folderPath` en config.json sea `C:\Inventario`
- **El archivo no se mueve** → Revisa el log en `logs\` para ver el error
