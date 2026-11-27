import * as admin from '../services/adminService.js';
const wrap = fn => async (req, res, next) => { try { res.json(await fn(req)); } catch (e) { next(e); } };
export const resumenGet = wrap(() => admin.obtenerResumenAdmin());
export const productosGet = wrap(async () => ({ productos: await admin.listarProductosAdmin() }));
export const productoPost = wrap(async req => ({ producto: await admin.crearProductoAdmin(req.body || {}) }));
export const productoPut = wrap(async req => ({ producto: await admin.actualizarProductoAdmin(req.params.id, req.body || {}) }));
export const productoDelete = wrap(async req => admin.desactivarProductoAdmin(req.params.id));
export const pedidosGet = wrap(async () => ({ pedidos: await admin.listarPedidosAdmin() }));
export const pedidoPatch = wrap(async req => ({ pedido: await admin.actualizarEstadoPedidoAdmin(req.params.id, req.body?.estado) }));
export const usuariosGet = wrap(async () => ({ usuarios: await admin.listarUsuariosAdmin() }));
export const cuponesGet = wrap(async () => ({ cupones: await admin.listarCuponesAdmin() }));
export const cuponPost = wrap(async req => ({ cupon: await admin.crearCuponAdmin(req.body || {}) }));
export const cuponPut = wrap(async req => ({ cupon: await admin.actualizarCuponAdmin(req.params.id, req.body || {}) }));
export const cuponDelete = wrap(async req => admin.eliminarCuponAdmin(req.params.id));

export const ofertasGet = wrap(async () => ({ ofertas: await admin.listarOfertasAdmin() }));
export const ofertaPost = wrap(async req => ({ oferta: await admin.crearOfertaAdmin(req.body || {}) }));
export const ofertaPut = wrap(async req => ({ oferta: await admin.actualizarOfertaAdmin(req.params.id, req.body || {}) }));
export const ofertaDelete = wrap(async req => admin.desactivarOfertaAdmin(req.params.id));
