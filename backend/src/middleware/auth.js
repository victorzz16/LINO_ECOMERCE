import { idDeSesion } from '../services/sesionService.js';
import { obtenerUsuarioPorId } from '../services/usuarioService.js';
import { HttpError } from './HttpError.js';

export async function requireAuth(request, _response, next) {
  try {
    const id = idDeSesion(request);
    const usuario = id ? await obtenerUsuarioPorId(id) : null;
    if (!usuario) throw new HttpError(401, 'Inicia sesión para continuar.');
    request.usuario = usuario;
    next();
  } catch (error) { next(error); }
}

export function requireAdmin(request, _response, next) {
  if (request.usuario?.rol !== 'admin') return next(new HttpError(403, 'No tienes permisos para acceder al panel de administración.'));
  next();
}
