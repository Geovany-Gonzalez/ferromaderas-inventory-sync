# Manual de Implementación - Sincronización de Inventario Ferromaderas

**Versión:** 1.0  
**Fecha:** Marzo 2026

---

## 1. Introducción

Este manual describe cómo implementar el sistema de sincronización automática de inventario para Ferromaderas. El proceso lee archivos Excel (generados en Dichara) de una carpeta y los envía a la API en la nube a las 8:00, 12:00 y 17:00.

**Requisitos:** Windows 10 o superior. No se requiere instalar ningún programa adicional.

---

## 2. Creación de carpetas

### 2.1 Carpeta para el inventario

Crear la carpeta donde Ferromaderas colocará los archivos Excel:

```
C:\Inventario
```

**Pasos:**
1. Abrir el Explorador de archivos
2. Ir a la unidad C:\
3. Clic derecho → Nuevo → Carpeta
4. Nombrar: `Inventario`

### 2.2 Carpeta para el programa

Crear la carpeta donde se guardará el ejecutable y la configuración:

```
C:\Ferromaderas\InventorySync
```

**Pasos:**
1. En C:\, crear la carpeta `Ferromaderas`
2. Dentro de Ferromaderas, crear la carpeta `InventorySync`

La carpeta `procesados` se crea automáticamente dentro de `C:\Inventario` la primera vez que se ejecute el proceso.

---

## 3. Colocación de archivos

### 3.1 Archivos necesarios

Copiar los siguientes archivos a `C:\Ferromaderas\InventorySync\`:

| Archivo | Descripción |
|---------|-------------|
| ferromaderas-inventory-sync.exe | Ejecutable principal |
| config.json | Configuración (URL de la API, carpeta) |
| run-sync.bat | Script que ejecuta el .exe con la clave de seguridad |

### 3.2 Crear config.json

Crear un archivo de texto llamado `config.json` en `C:\Ferromaderas\InventorySync\` con el siguiente contenido:

```json
{
  "apiUrl": "https://tu-api-ferromaderas.com",
  "folderPath": "C:\\Inventario",
  "sync": false
}
```

**Reemplazar:**
- `apiUrl`: La URL de la API (ejemplo: `https://api.ferromaderas.com`). No incluir `/api` al final.
- `folderPath`: Dejar `C:\\Inventario` si se usó esa ruta.
- `sync`: Mantener en `false` (solo cambiar a `true` si se desea desactivar productos que no están en el Excel).

Guardar el archivo con codificación UTF-8.

### 3.3 Crear run-sync.bat

Crear un archivo de texto llamado `run-sync.bat` en `C:\Ferromaderas\InventorySync\` con el siguiente contenido:

```bat
@echo off
set API_KEY=poner-aqui-la-clave-que-proporciono-el-administrador
ferromaderas-inventory-sync.exe
```

**Reemplazar:** `poner-aqui-la-clave-que-proporciono-el-administrador` por la clave API que debe proporcionar el administrador del sistema. Esta clave debe coincidir exactamente con la configurada en el servidor.

**Importante:** No compartir este archivo ni la clave. El archivo contiene información sensible.

### 3.4 Estructura final

Al finalizar, la carpeta debe verse así:

```
C:\Ferromaderas\InventorySync\
├── ferromaderas-inventory-sync.exe
├── config.json
└── run-sync.bat
```

La carpeta `logs\` se creará automáticamente al ejecutar el programa por primera vez.

---

## 4. Creación de la tarea programada

### 4.1 Abrir el Programador de tareas

1. Presionar **Win + R** (tecla Windows + R)
2. Escribir: `taskschd.msc`
3. Presionar Enter

### 4.2 Crear la tarea

1. En el panel derecho, clic en **"Crear tarea..."** (no usar "Crear tarea básica")
2. En la pestaña **General:**
   - Nombre: `Ferromaderas Inventory Sync`
   - Descripción (opcional): `Sincroniza inventario Excel con la API`
   - Marcar: **"Ejecutar con los privilegios más altos"** (recomendado)
   - Marcar: **"Ejecutar aunque el usuario no haya iniciado sesión"** (opcional, si se desea que corra sin que nadie esté logueado)

### 4.3 Configurar desencadenadores

1. Ir a la pestaña **Desencadenadores**
2. Clic en **Nuevo**
3. Configurar:
   - Iniciar la tarea: **Según una programación**
   - Configuración: **Diariamente**
   - Hora: **8:00:00**
   - Repetir cada: (dejar vacío)
4. Clic en **Aceptar**

5. Repetir los pasos 2-4 para crear dos desencadenadores más con las horas **12:00:00** y **17:00:00**.

Al final deben existir 3 desencadenadores: 8:00, 12:00 y 17:00.

### 4.4 Configurar la acción

1. Ir a la pestaña **Acciones**
2. Clic en **Nueva**
3. Configurar:
   - Acción: **Iniciar un programa**
   - Programa o script: `C:\Ferromaderas\InventorySync\run-sync.bat`
   - Agregar argumentos: (dejar vacío)
   - Iniciar en: `C:\Ferromaderas\InventorySync`
4. Clic en **Aceptar**

### 4.5 Guardar la tarea

1. Clic en **Aceptar** para guardar la tarea
2. Si Windows solicita contraseña, ingresar la del usuario administrador

---

## 5. Ejecución y verificación

### 5.1 Flujo de trabajo diario

1. Ferromaderas genera el reporte en Dichara (módulo "Reporte para levantar inventario")
2. Guarda el archivo Excel (.xlsx) en `C:\Inventario\`
3. A las 8:00, 12:00 o 17:00, el sistema procesa automáticamente el archivo
4. El archivo se mueve a `C:\Inventario\procesados\` con un timestamp en el nombre

### 5.2 Prueba manual

Antes de esperar al horario programado, se recomienda probar manualmente:

1. Colocar un archivo Excel de prueba en `C:\Inventario\`
2. Hacer doble clic en `run-sync.bat` (en `C:\Ferromaderas\InventorySync\`)
3. Se abrirá una ventana negra que procesará el archivo
4. Verificar que el archivo ahora esté en `C:\Inventario\procesados\`
5. Revisar el log en `C:\Ferromaderas\InventorySync\logs\sync-AAAA-MM-DD.log`

### 5.3 Interpretación del log

Abrir el archivo de log (ejemplo: `sync-2026-03-12.log`). Los mensajes indican:

| Mensaje | Significado |
|---------|-------------|
| `Creados: X` | Productos nuevos agregados al sistema |
| `Actualizados: Y` | Productos existentes con cambios (nombre o existencia) |
| `Desactivados: Z` | Productos que estaban en el sistema pero no en el Excel (solo si sync=true) |
| `Ejecución completada correctamente.` | Todo funcionó bien |
| `Error en...` | Hubo un fallo; el archivo no se movió |

### 5.4 Solución de problemas

| Problema | Solución |
|----------|----------|
| "API_KEY requerida" | Verificar que run-sync.bat tenga la línea `set API_KEY=...` con la clave correcta |
| "401 Unauthorized" | La clave en run-sync.bat no coincide con la del servidor. Contactar al administrador |
| "Carpeta no existe" | Verificar que `folderPath` en config.json sea `C:\Inventario` |
| El archivo no se mueve | Revisar el log para ver el error. El archivo permanece en la carpeta principal si hay fallo |

---

## 6. Resumen de carpetas

| Ruta | Contenido |
|------|------------|
| `C:\Inventario\` | Aquí se colocan los Excel. Queda vacía después de procesar |
| `C:\Inventario\procesados\` | Archivos ya procesados (historial) |
| `C:\Ferromaderas\InventorySync\` | .exe, config.json, run-sync.bat, logs/ |

---

## 7. Contacto

Para soporte técnico o configuración de la clave API, contactar al administrador del sistema.
