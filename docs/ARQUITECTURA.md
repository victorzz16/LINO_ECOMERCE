# Arquitectura técnica de LINO (React + Express + PostgreSQL/JSON)

## Vista general

LINO conserva una arquitectura cliente-servidor. En desarrollo local utiliza archivos JSON; en despliegue utiliza PostgreSQL (Neon) para que los datos sobrevivan a los reinicios del servidor Render.

```text
NAVEGADOR
   │
   ▼
VERCEL (React + Vite)
   ├── Páginas, componentes, React Router
   ├── CarritoContext y estado temporal del carrito
   └── fetch('/api/...')
          │ rewrite same-origin
          ▼
RENDER (Node.js + Express)
   ├── routes/       productos, pedidos, usuarios, cupones y administración
   ├── controllers/  solicitudes y respuestas HTTP
   ├── services/     precios, stock, autenticación, cupones y reglas de administración
   └── repositories/
          ├── jsonStore.js      JSON local o documento PostgreSQL
          └── usuariosStore.js  JSON local o documento PostgreSQL
                  │
                  ▼
             NEON POSTGRESQL
             ├── lino_tienda_state
             │     └── catálogo, variantes, stock, pedidos y cupones
             └── lino_usuarios_state
                   └── usuarios y hashes de contraseña
```

## Persistencia local y de producción

### Desarrollo local

Cuando `DATABASE_URL` no existe, los repositorios usan:

- `data/tienda.json`: catálogo, variantes, stock, pedidos, cupones y revisión.
- `data/bd.json`: usuarios con hash scrypt de contraseña.

Los archivos se ignoran en Git. `npm run init:data` prepara el catálogo de ejemplo.

### Producción con Neon

Cuando `DATABASE_URL` está definida, los repositorios usan PostgreSQL. Para mantener la lógica actual del sistema y minimizar cambios en los servicios, el estado de tienda y la lista de usuarios se guardan como documentos JSONB singleton:

- `lino_tienda_state(id=1, documento JSONB)`: productos, variantes, stock, pedidos, cupones y revisión.
- `lino_usuarios_state(id=1, usuarios JSONB)`: usuarios y hashes.

Las operaciones de escritura usan transacciones y `SELECT ... FOR UPDATE`, de modo que las compras se serializan en la fila de tienda y se conserva el control de stock/idempotencia entre solicitudes. Esta es una persistencia documental sobre PostgreSQL; si el proyecto evoluciona a una tienda de producción, se recomienda normalizar productos, variantes, pedidos y líneas en tablas relacionadas.

`npm run db:init` crea las tablas e importa los archivos locales si existen; si no existen, usa `data/tienda.example.json` y una lista de usuarios vacía. La inserción inicial utiliza `ON CONFLICT DO NOTHING`, por lo que no sobrescribe datos ya existentes.

## Frontend

- React 18 y Vite.
- Rutas públicas de tienda, historial de pedidos protegido y panel `/admin` protegido por rol.
- Catálogo con filtros laterales y detalle de producto con galería.
- Centro de ayuda y chatbot informativo guiado.
- React Router DOM para navegación.
- `frontend/src/services/api.js`, `authApi.js` y `adminApi.js` llaman a `/api`.
- Vercel reescribe `/api/*` hacia Render sin cambiar el dominio visible en el navegador. Esto permite mantener las cookies HttpOnly como same-origin.
- `vite.config.js` mantiene el proxy local hacia `127.0.0.1:3001`.

## Backend

- Node.js 20.12+ y Express 4.
- `backend/src/server.js` escucha en `0.0.0.0` y en `process.env.PORT` para Render. El contenedor inicializa PostgreSQL, ejecuta `scripts/ensure-admin.js` y luego inicia el servidor.
- `/api/health` comprueba la conexión a PostgreSQL cuando `DATABASE_URL` está configurada.
- `LINO_SESSION_SECRET` debe mantenerse estable en producción.
- CORS puede habilitarse para orígenes externos mediante `CORS_ORIGINS`; con el rewrite same-origin de Vercel normalmente no es necesario.

## Proceso de compra

1. React recupera productos mediante GET `/api/productos`.
2. El usuario elige variante y cantidad.
3. El carrito conserva temporalmente la selección.
4. React envía IDs de variantes, cantidades y clave de solicitud.
5. Express comprueba sesión, producto activo, stock y precio vigente.
6. El repositorio actualiza el estado dentro de una transacción PostgreSQL (producción) o una cola de escritura JSON (local).
7. El servidor devuelve el pedido y el resumen de importes.

## Pagos demostrativos

Yape, Plin, tarjeta y efectivo son métodos simulados. No se procesan cobros, no se reciben datos bancarios ni se emiten comprobantes tributarios. El pedido conserva `estadoPago: "no_procesado"`.

## Despliegue y automatización

- Vercel: frontend React, build `npm run build`, output `frontend/dist` y rewrite `/api/*`.
- Render: API Express con `Dockerfile.backend`; el contenedor ejecuta `init-postgres.js`, `ensure-admin.js` y el servidor. Health check `/api/health`.
- Neon: PostgreSQL persistente.
- GitHub Actions: instala dependencias, inicializa datos JSON temporales para pruebas, valida, ejecuta `npm test` y compila React.
- CD: Render y Vercel se conectan a GitHub y despliegan commits de `main` automáticamente.

## Límites conocidos

Los planes gratuitos pueden suspender servicios por inactividad y tienen límites de uso. Render Free usa filesystem efímero, por lo que la persistencia de producción depende de Neon. El despliegue gratuito es apropiado para una demostración académica, no para un comercio con disponibilidad garantizada.
