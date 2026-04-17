# Price App

Sistema de consulta de precios por código de barras para puntos de venta. Al escanear un artículo, la pantalla muestra su nombre y precio en tiempo real consultando una base de datos Firebird.

---

## Estructura del proyecto

```
Price_App/
├── docker-compose.yml
├── .env                    # Variables de entorno (no se sube al repositorio)
├── .env.example            # Plantilla de configuración
├── Price_Display/          # Frontend — web estática servida por nginx
│   ├── index.html
│   ├── config.json         # Configuración de la app (tema, idioma, timeouts)
│   ├── Dockerfile
│   ├── docker-entrypoint.sh
│   └── assets/
│       ├── css/styles.css
│       ├── js/app.js
│       └── i18n/
│           ├── es.json
│           └── en.json
└── Price_Server/           # Backend — API REST en Node.js/Express
    ├── server.js
    ├── Dockerfile
    ├── package.json
    ├── config/db.js
    ├── repositories/priceRepository.js
    └── routes/pricesRoute.js
```

---

## Servicios

### Price_Display

Interfaz web diseñada para pantallas de consulta de precios. Acepta entrada desde un lector de códigos de barras (USB HID) o de forma manual al hacer clic en el título.

**Pantallas:**

| Estado | Descripción |
|--------|-------------|
| Idle | Esperando escaneo |
| Loading | Consultando la API |
| Result | Muestra nombre y precio del artículo |
| Not found | Código de barras no encontrado |
| Error | Fallo de red o error del servidor |

La URL de la API se inyecta en `config.json` al arrancar el contenedor mediante la variable `API_BASE_URL`, sin necesidad de reconstruir la imagen.

**Configuración** (`Price_Display/config.json`):

| Campo | Por defecto | Descripción |
|-------|-------------|-------------|
| `app.language` | `es` | Idioma de la interfaz (`es` / `en`) |
| `app.currency_symbol` | `€` | Símbolo de moneda |
| `app.currency_position` | `after` | Posición del símbolo (`before` / `after`) |
| `api.timeout_ms` | `5000` | Timeout de la petición en ms |
| `display.display_time_ms` | `10000` | Tiempo que se muestra el resultado antes de volver al idle |
| `theme.*` | Dark blue | Colores personalizables de la interfaz |

---

### Price_Server

API REST que recibe un código de barras y devuelve el artículo correspondiente consultando la base de datos Firebird.

**Endpoint:**

```
GET /api/prices/:barcode
```

**Respuesta exitosa (200):**
```json
{
  "barcode": "8700216389976",
  "name": "Nombre del artículo",
  "price": 4.99
}
```

**Respuesta no encontrado (404):**
```json
{
  "error": "Producto no encontrado",
  "barcode": "8700216389976"
}
```

**Respuesta error (500):**
```json
{
  "error": "Error interno del servidor",
  "detail": "..."
}
```

---

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) con soporte para Linux containers
- Servidor Firebird 2.5 accesible desde el host (habitualmente instalado junto al TPV)

---

## Instalación y arranque

### 1. Copiar y editar el `.env`

```bash
cp .env.example .env
```

Edita `.env` con los valores de tu entorno:

```env
DB_HOST=host.docker.internal   # servidor Firebird en el propio PC
DB_PORT=3050
DB_DATABASE=C:\ruta\a\tu\archivo.GDB
DB_USER=SYSDBA
DB_PASSWORD=masterkey

API_BASE_URL=http://localhost:3000

SERVER_PORT=3000
DISPLAY_PORT=80
```

> **`API_BASE_URL`** debe ser la URL que usa el **navegador** para llegar a la API.
> Si la web se consulta desde otro dispositivo de la red, reemplaza `localhost` por la IP del PC.

### 2. Construir y levantar los contenedores

```bash
docker compose up --build -d
```

### 3. Acceder a la web

Abre `http://localhost` (o el puerto definido en `DISPLAY_PORT`) en el navegador.

---

## Variables de entorno

| Variable | Servicio | Descripción | Ejemplo |
|----------|----------|-------------|---------|
| `DB_HOST` | price_server | Dirección del servidor Firebird | `host.docker.internal` |
| `DB_PORT` | price_server | Puerto de Firebird | `3050` |
| `DB_DATABASE` | price_server | Ruta al `.gdb` tal como la ve el servidor | `C:\ruta\archivo.GDB` |
| `DB_USER` | price_server | Usuario de Firebird | `SYSDBA` |
| `DB_PASSWORD` | price_server | Contraseña de Firebird | `masterkey` |
| `SERVER_PORT` | price_server | Puerto expuesto en el host | `3000` |
| `API_BASE_URL` | price_display | URL de la API para el navegador | `http://localhost:3000` |
| `DISPLAY_PORT` | price_display | Puerto expuesto en el host | `80` |
| `COMPOSE_PROFILES` | compose | Activa servicios opcionales | `firebird` |
| `DB_FILE_PATH` | compose (perfil firebird) | Ruta al `.gdb` en el host para el volumen | `C:/ruta/archivo.GDB` |

---

## Perfil Docker: Firebird

Si el equipo **no** tiene Firebird instalado, puedes levantarlo como un contenedor adicional activando el perfil `firebird`:

**En `.env`:**
```env
COMPOSE_PROFILES=firebird
DB_FILE_PATH=C:/ruta/a/tu/archivo.GDB   # barras / en Windows
DB_HOST=firebird                         # nombre del servicio Docker
DB_DATABASE=/firebird/data/prices.gdb   # ruta dentro del contenedor
```

```bash
docker compose up --build -d
```

> Cuando el perfil está activo, el archivo `.gdb` se monta directamente en el contenedor Firebird. Asegúrate de que ningún otro proceso tenga el archivo bloqueado en exclusiva.

---

## Arquitectura

```
┌──────────────────────────────────────┐
│            Navegador / Pantalla       │
│         http://localhost:80           │
└───────────────┬──────────────────────┘
                │
┌───────────────▼──────────────────────┐
│         price_display                 │
│     nginx — Puerto 80                 │
│     Inyecta API_BASE_URL en config   │
└───────────────┬──────────────────────┘
                │  GET /api/prices/:barcode
┌───────────────▼──────────────────────┐
│         price_server                  │
│     Node.js/Express — Puerto 3000     │
└───────────────┬──────────────────────┘
                │  TCP :3050
┌───────────────▼──────────────────────┐
│  Firebird 2.5 (host o contenedor)    │
│         SPACIO001.GDB                 │
└──────────────────────────────────────┘
```

---

## Solución de problemas

### `No permission for read-write access to database`

El servidor Firebird no puede abrir el archivo `.gdb`. Causas habituales:

- La ruta en `DB_DATABASE` no es correcta o usa barras `/` en lugar de `\`
- El archivo está bloqueado por otro proceso (el TPV debe estar cerrado si usas el perfil `firebird`)
- Las credenciales `DB_USER` / `DB_PASSWORD` no corresponden al archivo

### `exec /docker-entrypoint.sh: no such file or directory`

El archivo `docker-entrypoint.sh` tiene saltos de línea Windows (`CRLF`). El `Dockerfile` de `Price_Display` los elimina automáticamente con `sed`. Si el error persiste, edita el archivo con un editor que permita guardar con saltos de línea Unix (LF).

### La web no puede contactar con la API

Comprueba que `API_BASE_URL` en `.env` apunta a una dirección accesible desde el **navegador**, no desde dentro de Docker. En acceso local usa `http://localhost:3000`; desde otro dispositivo en la red, usa la IP del PC.

### Dynamic SQL Error -804

Ocurre si la query Firebird usa un parámetro `?` directamente en el `SELECT` sin tipo explícito. La query del proyecto ya incluye `CAST(? AS VARCHAR(50))` para evitarlo.
