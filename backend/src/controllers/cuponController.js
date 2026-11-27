import { validarCuponPublico } from '../services/adminService.js';
import { idDeSesion } from '../services/sesionService.js';
import { obtenerUsuarioPorId } from '../services/usuarioService.js';
import { leerTienda } from '../repositories/jsonStore.js';
export async function validarCuponPost(request, response, next) {
  try { const id = idDeSesion(request); const usuario = id ? await obtenerUsuarioPorId(id) : null; const resultado = await validarCuponPublico(request.body?.codigo, request.body?.subtotalCentimos, usuario); response.json({ cupon: resultado }); } catch (error) { next(error); }
}
export async function bienvenidaGet(request, response, next) {
  try { const id = idDeSesion(request); const usuario = id ? await obtenerUsuarioPorId(id) : null; const { cupones = [], pedidos = [] } = await leerTienda(); const cupon = cupones.find(c => c.codigo === 'BIENVENIDA10' && c.activo); const usado = Boolean(usuario && ((cupon?.usuariosUsados || []).includes(usuario.id) || pedidos.some(p => p.cliente?.id === usuario.id))); response.json({ mostrar: Boolean(cupon && !usado), codigo: cupon?.codigo || null, usuarioAutenticado: Boolean(usuario), usado }); } catch (error) { next(error); }
}
