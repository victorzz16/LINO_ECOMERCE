import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Las pruebas siempre usan los adaptadores JSON aislados; nunca deben escribir en Neon.
delete process.env.DATABASE_URL;
const temporal = await mkdtemp(path.join(tmpdir(), 'lino-tests-'));
const destino = path.join(temporal, 'tienda.json');
const usuariosDestino = path.join(temporal, 'usuarios.json');
process.env.LINO_DATA_FILE = destino;
process.env.LINO_DB_FILE = usuariosDestino;
const { crearApp } = await import('../backend/src/app.js');
let servidor;
let direccion;
let cookieSesion = '';
let adminCookie = '';

before(async () => {
  const ejemplo = JSON.parse(await readFile(path.join(root, 'data', 'tienda.example.json'), 'utf8'));
  // P09 debe probar una competencia real por las últimas dos unidades.
  // El catálogo ampliado elevó el stock de var-008 a 50; fijamos el fixture
  // de prueba en 2 unidades para que solo una de las dos compras pueda ganar.
  const varianteConcurrencia = ejemplo.productos.flatMap(producto => producto.variantes).find(variante => variante.id === 'var-008');
  if (!varianteConcurrencia) throw new Error('No existe var-008 para la prueba de concurrencia P09.');
  varianteConcurrencia.stock = 2;
  await writeFile(destino, JSON.stringify(ejemplo, null, 2));
  servidor = crearApp().listen(0, '127.0.0.1');
  await new Promise(resolve => servidor.once('listening', resolve));
  direccion = `http://127.0.0.1:${servidor.address().port}`;
  await api('/api/usuarios/registro', 'POST', { nombre: 'Cliente de prueba', correo: 'cliente@lino.test', contrasena: 'contrasena-segura' }, false);
  const sesion = await api('/api/usuarios/login', 'POST', { correo: 'cliente@lino.test', contrasena: 'contrasena-segura' }, false);
  cookieSesion = sesion.cookie.split(';')[0];
  process.env.LINO_ADMIN_EMAIL = 'admin@lino.test';
  process.env.LINO_ADMIN_PASSWORD = 'admin-password-segura-2026';
  const { asegurarAdministradorConfigurado } = await import('../backend/src/services/usuarioService.js');
  await asegurarAdministradorConfigurado();
  const adminLogin = await api('/api/usuarios/login', 'POST', { correo: 'admin@lino.test', contrasena: process.env.LINO_ADMIN_PASSWORD }, false);
  adminCookie = adminLogin.cookie.split(';')[0];
});
after(async () => {
  await new Promise(resolve => servidor.close(resolve));
  await rm(temporal, { recursive: true, force: true });
});

async function api(ruta, metodo = 'GET', contenido, autenticado = true, cookieOverride = '') {
  const r = await fetch(direccion + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(autenticado && (cookieOverride || cookieSesion) ? { Cookie: cookieOverride || cookieSesion } : {}) },
    ...(contenido ? { body: JSON.stringify(contenido) } : {}),
  });
  return { estado: r.status, datos: await r.json(), cookie: r.headers.get('set-cookie') || '' };
}

test('Health check informa almacenamiento JSON en pruebas locales', async () => {
  const { estado, datos } = await api('/api/health');
  assert.equal(estado, 200);
  assert.equal(datos.ok, true);
  assert.equal(datos.proyecto, 'LINO');
  assert.equal(datos.almacenamiento, 'json-local');
});

test('P01 filtra el catálogo por categoría', async () => {
  const { estado, datos } = await api('/api/productos?categoria=mujer');
  assert.equal(estado, 200);
  assert.ok(datos.productos.length > 1);
  assert.ok(datos.productos.every(p => p.categoria === 'mujer'));
});
test('Catálogo ampliado: 28 productos y variantes únicas', async () => {
  const { estado, datos } = await api('/api/productos');
  assert.equal(estado, 200);
  assert.equal(datos.productos.length, 28);
  assert.deepEqual(new Set(datos.productos.map(p => p.id)).size, 28);
  assert.ok(datos.productos.some(p => p.id === 'prod-024'));
});
test('Catálogo incluye zapatillas y precios finales con IGV', async () => {
  const { estado, datos } = await api('/api/productos?categoria=zapatillas');
  assert.equal(estado, 200);
  assert.equal(datos.productos.length, 4);
  assert.ok(datos.productos.every(p => p.categoria === 'zapatillas' && p.imagen.endsWith('.jpg')));
  assert.ok(datos.productos.every(p => p.precioCentimos > 0));
});
test('El inicio expone ofertas activas para el carrusel', async () => {
  const { estado, datos } = await api('/api/ofertas');
  assert.equal(estado, 200);
  assert.ok(datos.ofertas.length >= 3);
});
test('P02 un producto inexistente responde 404', async () => {
  const { estado } = await api('/api/productos/no-existe');
  assert.equal(estado, 404);
});
test('P04 la cantidad cero se rechaza por la validación de cantidad', async () => {
  const { estado, datos } = await api('/api/pedidos', 'POST', {
    metodoPago: 'yape',
    claveSolicitud: 'intento-0001',
    direccionEnvio: 'Av. Prueba 123',
    items: [{ varianteId: 'var-002', cantidad: 0 }],
  });
  assert.equal(estado, 400);
  assert.match(datos.error, /cantidades inválidas/i);
});
test('P04b el pedido requiere una sesión iniciada', async () => {
  const { estado, datos } = await api('/api/pedidos', 'POST', { claveSolicitud: 'intento-sesion-001', direccionEnvio: 'Av. Prueba 123', items: [{ varianteId: 'var-001', cantidad: 1 }] }, false);
  assert.equal(estado, 401);
  assert.match(datos.error, /Inicia sesión/);
});
test('BIENVENIDA10 se valida para la primera compra de una cuenta nueva', async () => {
  const { estado, datos } = await api('/api/cupones/validar', 'POST', { codigo: 'BIENVENIDA10', subtotalCentimos: 10000 });
  assert.equal(estado, 200);
  assert.equal(datos.cupon.codigo, 'BIENVENIDA10');
  assert.equal(datos.cupon.descuentoCentimos, 1000);
});
test('P05, P07 y P08 registra, conserva y no duplica un pedido', async () => {
  const envio = { metodoPago: 'yape', claveSolicitud: 'intento-prueba-002', direccionEnvio: 'Av. Prueba 123, Lima', items: [{ varianteId: 'var-002', cantidad: 2 }] };
  const primera = await api('/api/pedidos', 'POST', envio);
  assert.equal(primera.estado, 201);
  assert.equal(primera.datos.pedido.totalCentimos, 14136);
  assert.equal(primera.datos.pedido.envioCentimos, 0);
  assert.equal(primera.datos.pedido.cliente.correo, 'cliente@lino.test');
  assert.equal(primera.datos.pedido.igvCentimos, 2156);
  assert.equal(primera.datos.pedido.metodoPago, 'yape');
  assert.equal(primera.datos.pedido.estadoPago, 'no_procesado');
  const segunda = await api('/api/pedidos', 'POST', envio);
  assert.equal(segunda.estado, 200);
  assert.equal(segunda.datos.pedido.id, primera.datos.pedido.id);
  const conflicto = await api('/api/pedidos', 'POST', { ...envio, metodoPago: 'plin' });
  assert.equal(conflicto.estado, 409); // No se puede reutilizar la clave cambiando método de pago
  const guardado = JSON.parse(await readFile(destino, 'utf8'));
  assert.equal(guardado.pedidos.length, 1);
  assert.equal(guardado.productos[0].variantes.find(v => v.id === 'var-002').stock, 38);
});
test('P06 rechaza stock excesivo sin registrar pedido', async () => {
  const previo = JSON.parse(await readFile(destino, 'utf8'));
  const { estado } = await api('/api/pedidos', 'POST', { metodoPago: 'plin', claveSolicitud: 'intento-prueba-003', direccionEnvio: 'Av. Prueba 123, Lima', items: [{ varianteId: 'var-002', cantidad: 99 }] });
  assert.equal(estado, 409);
  const nuevo = JSON.parse(await readFile(destino, 'utf8'));
  assert.equal(nuevo.pedidos.length, previo.pedidos.length);
  assert.equal(nuevo.revision, previo.revision);
});
test('P09 concurrencia: solamente una compra obtiene la última unidad', async () => {
  const solicitudes = [
    { metodoPago: 'efectivo', claveSolicitud: 'prueba-concurrente-1', direccionEnvio: 'Av. Prueba 123, Lima', items: [{ varianteId: 'var-008', cantidad: 2 }] },
    { metodoPago: 'efectivo', claveSolicitud: 'prueba-concurrente-2', direccionEnvio: 'Av. Prueba 123, Lima', items: [{ varianteId: 'var-008', cantidad: 2 }] },
  ];
  const resultados = await Promise.all(solicitudes.map(s => api('/api/pedidos', 'POST', s)));
  assert.deepEqual(resultados.map(r => r.estado).sort(), [201, 409]);
});
test('P10 cobra envío base e informa el IGV ya incluido cuando hay una unidad', async () => {
  const { estado, datos } = await api('/api/pedidos', 'POST', {
    metodoPago: 'tarjeta', claveSolicitud: 'pedido-una-unidad',
    direccionEnvio: 'Av. Prueba 123, Lima',
    items: [{ varianteId: 'var-001', cantidad: 1 }],
  });
  assert.equal(estado, 201);
  assert.equal(datos.pedido.subtotalCentimos, 7068);
  assert.equal(datos.pedido.envioCentimos, 1200);
  assert.equal(datos.pedido.igvCentimos, 1261);
  assert.equal(datos.pedido.totalCentimos, 8268);
});

test('Métodos de pago: se rechaza un valor no permitido', async () => {
  const { estado, datos } = await api('/api/pedidos', 'POST', {
    claveSolicitud: 'metodo-invalido-001', direccionEnvio: 'Av. Prueba 123',
    metodoPago: 'bitcoin', items: [{ varianteId: 'var-003', cantidad: 1 }],
  });
  assert.equal(estado, 400);
  assert.match(datos.error, /método válido/);
});
test('Métodos de pago: hay que elegir una opción', async () => {
  const { estado } = await api('/api/pedidos', 'POST', {
    claveSolicitud: 'sin-metodo-001', direccionEnvio: 'Av. Prueba 123',
    items: [{ varianteId: 'var-003', cantidad: 1 }],
  });
  assert.equal(estado, 400);
});
test('Métodos de pago: Plin guarda elección, nunca cobra', async () => {
  const { estado, datos } = await api('/api/pedidos', 'POST', {
    claveSolicitud: 'compra-plin-001', metodoPago: 'plin',
    direccionEnvio: 'Av. Prueba 123', items: [{ varianteId: 'var-003', cantidad: 1 }],
  });
  assert.equal(estado, 201);
  assert.equal(datos.pedido.metodoPago, 'plin');
  assert.equal(datos.pedido.estadoPago, 'no_procesado');
});


test('La tienda pública se puede consultar sin iniciar sesión', async () => {
  const { estado, datos } = await api('/api/productos', 'GET', undefined, false);
  assert.equal(estado, 200);
  assert.ok(datos.productos.length > 0);
});

test('El historial de pedidos requiere sesión y devuelve solo compras del cliente', async () => {
  const { estado, datos } = await api('/api/pedidos/mis-pedidos');
  assert.equal(estado, 200);
  assert.ok(Array.isArray(datos.pedidos));
  assert.ok(datos.pedidos.every(p => p.cliente.correo === 'cliente@lino.test'));
});

test('Las rutas administrativas bloquean clientes y visitantes', async () => {
  const visitante = await api('/api/admin/resumen', 'GET', undefined, false);
  assert.equal(visitante.estado, 401);
  const cliente = await api('/api/admin/resumen');
  assert.equal(cliente.estado, 403);
});

test('La cuenta configurada recibe rol admin y puede consultar el panel', async () => {
  const { estado, datos } = await api('/api/admin/resumen', 'GET', undefined, true, adminCookie);
  assert.equal(estado, 200);
  assert.ok(Number.isInteger(datos.productos));
  assert.ok(Number.isInteger(datos.usuarios));
});

test('El administrador crea un cupón y el backend calcula su descuento', async () => {
  const creado = await api('/api/admin/cupones', 'POST', { codigo: 'LINO10', tipo: 'porcentaje', valor: 10, minimoCentimos: 0, maxUsos: 5 }, true, adminCookie);
  assert.equal(creado.estado, 200);
  const validado = await api('/api/cupones/validar', 'POST', { codigo: 'lino10', subtotalCentimos: 10000 }, false);
  assert.equal(validado.estado, 200);
  assert.equal(validado.datos.cupon.descuentoCentimos, 1000);
});
