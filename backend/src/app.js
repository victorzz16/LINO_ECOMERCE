import express from 'express';
import productos from './routes/productos.js';
import pedidos from './routes/pedidos.js';
import usuarios from './routes/usuarios.js';
import admin from './routes/admin.js';
import cupones from './routes/cupones.js';
import { errorHandler } from './middleware/errorHandler.js';
import { listarOfertasPublicas } from './services/adminService.js';
import { usaPostgres, verificarConexionPostgres } from './db/postgres.js';

export function crearApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '100kb' }));

  // CORS opcional para clientes externos. En producción, Vercel usa un rewrite
  // same-origin y no necesita CORS para las solicitudes normales del navegador.
  const origenesPermitidos = new Set(
    String(process.env.CORS_ORIGINS || '').split(',').map(origen => origen.trim()).filter(Boolean),
  );
  app.use((request, response, next) => {
    const origen = request.get('origin');
    if (origen && origenesPermitidos.has(origen)) {
      response.setHeader('Access-Control-Allow-Origin', origen);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      response.setHeader('Vary', 'Origin');
    }
    if (request.method === 'OPTIONS') {
      if (origen && !origenesPermitidos.has(origen)) return response.sendStatus(403);
      return response.sendStatus(204);
    }
    next();
  });

  app.get('/api/health', async (_request, response, next) => {
    try {
      if (usaPostgres()) await verificarConexionPostgres();
      response.set('Cache-Control', 'no-store');
      response.json({
        ok: true,
        proyecto: 'LINO',
        tipo: 'demo academica',
        almacenamiento: usaPostgres() ? 'postgresql' : 'json-local',
      });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/ofertas', async (_req, res, next) => { try { const ofertas = await listarOfertasPublicas(); res.set('Cache-Control', 'no-store'); res.json({ ofertas: ofertas.filter(o => o.activa).sort((a,b) => a.orden-b.orden) }); } catch (e) { next(e); } });
  app.use('/api/productos', productos);
  app.use('/api/pedidos', pedidos);
  app.use('/api/usuarios', usuarios);
  app.use('/api/admin', admin);
  app.use('/api/cupones', cupones);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta de la API inexistente.' }));
  app.use(errorHandler);
  return app;
}
