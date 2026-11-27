# LINO — Tienda de ropa online

Proyecto académico **React + Vite (frontend)** y **Node.js + Express (backend)**. En desarrollo local conserva almacenamiento JSON; para el despliegue gratuito usa **Neon PostgreSQL** para que catálogo, stock, pedidos y usuarios sobrevivan a los reinicios de Render.

## Funcionalidades

- Catálogo de 28 productos con fotografías JPG locales (incluye zapatillas), variantes, precios finales en soles con IGV incluido y stock.
- Carrito de compras, selección de talla/color y generación de pedidos.
- Métodos demostrativos: Yape, Plin, tarjeta y efectivo. No se procesa dinero ni se capturan datos reales de tarjetas.
- Registro e inicio de sesión con contraseña almacenada mediante hash scrypt y cookie HttpOnly firmada.
- Validación de cantidades, stock, concurrencia e idempotencia de pedidos.
- Pruebas automatizadas, GitHub Actions CI y configuración de despliegue Vercel + Render.

## Requisitos

- Node.js 20.12 o superior y npm.
- Visual Studio Code (recomendado).
- Git para clonar el repositorio.

## Ejecutar localmente con JSON

```bash
npm ci
npm run init:data
npm run dev
```

- Frontend: http://localhost:5173
- API: http://127.0.0.1:3001/api/health

En local, si `DATABASE_URL` no está definida, LINO usa `data/tienda.json` y `data/bd.json`. Los archivos privados no se incluyen en Git ni en este ZIP.

Comprobaciones:

```bash
npm run check:data
npm test
npm run build
```

## Persistencia PostgreSQL con Neon

Cuando `DATABASE_URL` está definida, los repositorios usan PostgreSQL en lugar de archivos JSON. El esquema usa dos documentos JSONB singleton, actualizados dentro de transacciones con bloqueo de fila:

- `lino_tienda_state`: catálogo, variantes, stock, pedidos y revisión.
- `lino_usuarios_state`: usuarios y hashes de contraseña.

Este adaptador conserva las reglas y servicios existentes y evita perder datos cuando Render reinicia su sistema de archivos efímero.

1. Copia `.env.example` a `.env`.
2. Pega la cadena de conexión de Neon en `DATABASE_URL` (no la compartas ni la subas a GitHub).
3. Si quieres importar tus datos locales, copia `data/tienda.json` y `data/bd.json` desde tu instalación anterior a la carpeta `data/` de este proyecto antes de inicializar. Esos archivos están excluidos del ZIP por privacidad.
4. Ejecuta:

   ```bash
   npm run db:init
   ```

El inicializador crea el esquema e importa los archivos locales si existen. Si no hay archivos locales, utiliza `data/tienda.example.json` y crea una lista de usuarios vacía. **No sobrescribe filas que ya existan en Neon.**

Para volver al modo local, elimina `DATABASE_URL` del entorno; no borres la base Neon.

## Despliegue gratuito Vercel + Render + Neon

Consulta la guía completa en [`docs/DESPLIEGUE_GRATUITO.md`](docs/DESPLIEGUE_GRATUITO.md). Para aplicar esta entrega sobre tu clon de `main` en Windows, sigue [`docs/ACTUALIZAR_MAIN_WINDOWS.md`](docs/ACTUALIZAR_MAIN_WINDOWS.md).

- `render.yaml`: crea el backend Express gratuito en Render, inicializa PostgreSQL y comprueba `/api/health`.
- `vercel.json`: compila `frontend/dist`, enruta `/api/*` al backend de Render y conserva las rutas de React Router.
- La URL de Render definida en `vercel.json` es `https://lino-ecomerce-api.onrender.com`. Si Render asigna otra URL, actualiza el destino antes de desplegar Vercel.
- Mantén `VITE_API_URL` sin definir en Vercel: el frontend utiliza `/api` y el rewrite mantiene las cookies en el mismo origen.
- Render necesita `DATABASE_URL` y `LINO_SESSION_SECRET` como variables privadas. El Blueprint genera una clave de sesión automáticamente.

### Limitaciones de los planes gratuitos

Render Free suspende servicios inactivos y su sistema de archivos es efímero; la primera solicitud tras una suspensión puede tardar alrededor de un minuto. Neon Free tiene cuotas de almacenamiento y cómputo. Vercel Hobby está limitado a uso personal/no comercial. Son adecuados para una demostración académica dentro de sus condiciones y límites, no para una tienda comercial con disponibilidad garantizada.

## GitHub Actions CI

El workflow `.github/workflows/ci.yml` ejecuta:

1. `npm ci`
2. `npm run init:data`
3. `npm run check:data`
4. `npm test`
5. `npm run build`
6. Guarda `frontend/dist/` como artefacto durante siete días.

Se activa con push a `main`, Pull Requests hacia `main` y ejecución manual. Las pruebas fuerzan el adaptador JSON temporal para que nunca escriban en una base Neon real.

## CD — despliegue continuo

Conecta el mismo repositorio GitHub a Render y Vercel y selecciona `main` como rama de producción. Ambos proveedores pueden desplegar automáticamente al recibir nuevos commits en `main`. GitHub Actions CI valida el código; la integración Git de los proveedores realiza el despliegue.

## Estructura principal

```text
frontend/                 React, páginas, componentes y servicios
backend/src/
  db/postgres.js           Pool y esquema Neon PostgreSQL
  repositories/            Adaptadores JSON local / PostgreSQL
  routes/                   API de productos, pedidos y usuarios
  services/                 Reglas de negocio y autenticación
scripts/
  init-data.js              Inicialización JSON local
  init-postgres.js          Inicialización e importación a Neon
data/
  tienda.example.json       Catálogo de ejemplo versionado
  tienda.json               Datos locales (gitignore)
  bd.json                   Usuarios locales (gitignore)
docs/
  DESPLIEGUE_GRATUITO.md    Guía Vercel + Render + Neon
.github/workflows/ci.yml   Integración continua
render.yaml                Blueprint del backend Render
vercel.json                Build y proxy same-origin para Vercel
```

## Seguridad y límites

- Nunca subas `.env`, `data/tienda.json` ni `data/bd.json` al repositorio.
- No pegues `DATABASE_URL`, contraseñas ni secretos en chats o capturas.
- Las opciones Yape, Plin, tarjeta y efectivo son demostrativas; `estadoPago` queda como `no_procesado`.
- El PDF es un comprobante demostrativo, no un comprobante tributario.
- La autenticación usa cookie HttpOnly y clave `LINO_SESSION_SECRET`, que debe mantenerse estable entre despliegues.


## Acceso público, administración, pedidos y cupones

La tienda permite navegar por el inicio, catálogo y detalle de productos sin iniciar sesión. Para confirmar un pedido, el cliente debe registrarse o iniciar sesión. El backend conserva la validación de sesión antes de registrar compras.

### Configurar la cuenta administradora

La cuenta administradora inicial se configura mediante variables de entorno, nunca mediante credenciales fijas en el código:

- `LINO_ADMIN_EMAIL`: correo que tendrá el rol `admin`.
- `LINO_ADMIN_PASSWORD`: contraseña única de al menos 12 caracteres.
- `LINO_ADMIN_NAME`: nombre visible del administrador (opcional).

En Render, agrega estas variables en el servicio `lino-ecomerce-api`. En el entorno local, colócalas en `.env` (archivo ignorado por Git). Al iniciar el contenedor, `scripts/ensure-admin.js` crea la cuenta si no existe o asigna el rol administrador al correo configurado, conservando la contraseña de una cuenta existente. No se imprimen contraseñas en los logs.

Después de iniciar sesión con esa cuenta, el enlace `Administración` abre `/admin`. Las operaciones administrativas se protegen también en el backend y no dependen solo de ocultar botones en React.

### Funciones administrativas

El panel permite consultar indicadores, crear/editar/desactivar productos, revisar pedidos y actualizar su estado, consultar usuarios sin exponer hashes de contraseña y crear/editar/desactivar cupones. Los cupones pueden ser porcentuales o de importe fijo, con compra mínima, fechas de vigencia y límite de usos. El servidor vuelve a validar el cupón y calcula el descuento al registrar el pedido.

### Historial y ayuda

Los clientes autenticados pueden consultar `Mis pedidos`. El Centro de ayuda contiene categorías informativas y el asistente flotante utiliza respuestas guiadas predefinidas; no es un agente de IA conectado a servicios externos.

### Migración segura de la estructura de tienda

El campo `cupones` se agrega de forma compatible al documento JSON de tienda cuando se lee por primera vez. Los productos, pedidos y cuentas existentes se conservan. `npm run db:init` sigue usando `ON CONFLICT DO NOTHING`, por lo que no reemplaza la información ya almacenada en Neon.

## Fotografías y stock del catálogo de demostración

El catálogo incluye 28 imágenes JPG estáticas de apariencia fotográfica, una por producto, incluidas cuatro zapatillas. Las imágenes se generan para la demostración académica y deben reemplazarse por fotografías propias si la tienda se utiliza comercialmente. Cada variante de ejemplo comienza con 35, 40, 45 o 50 unidades. La actualización de datos existentes se ejecuta una sola vez al inicializar la base de datos y conserva pedidos y stocks que ya sean superiores. Consulta `docs/IMAGENES_Y_STOCK_DEMO.md`.


## Promociones, direcciones y precios

- La tienda incluye 10 cupones de prueba; `BIENVENIDA10` se limita a la primera compra por cuenta.
- El inicio muestra un carrusel de ofertas administrable desde el panel (pestaña Ofertas) y mensajes superiores rotativos cada 3 segundos.
- La dirección de entrega se puede escribir o completar con la ubicación actual del navegador (requiere permiso y HTTPS o localhost).
- Los precios de catálogo son finales e incluyen IGV del 18%; el carrito y la boleta informan la porción de IGV sin volver a sumarla.
- El Centro de ayuda presenta temas y preguntas frecuentes además del chatbot.
