const API = import.meta.env.VITE_API_URL || '/api';
async function request(path, options = {}) {
  let response;
  try { response = await fetch(`${API}${path}`, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...options }); }
  catch { throw new Error('No se pudo conectar con el servidor.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
  return data;
}
const json = body => ({ method: 'POST', body: JSON.stringify(body) });
export const getAdminResumen = () => request('/admin/resumen');
export const getAdminProductos = () => request('/admin/productos');
export const crearAdminProducto = body => request('/admin/productos', json(body));
export const editarAdminProducto = (id, body) => request(`/admin/productos/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) });
export const borrarAdminProducto = id => request(`/admin/productos/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const getAdminPedidos = () => request('/admin/pedidos');
export const cambiarEstadoPedido = (id, estado) => request(`/admin/pedidos/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ estado }) });
export const getAdminUsuarios = () => request('/admin/usuarios');
export const getAdminCupones = () => request('/admin/cupones');
export const crearAdminCupon = body => request('/admin/cupones', json(body));
export const editarAdminCupon = (id, body) => request(`/admin/cupones/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) });
export const desactivarAdminCupon = id => request(`/admin/cupones/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const getAdminOfertas = () => request('/admin/ofertas');
export const crearAdminOferta = body => request('/admin/ofertas', json(body));
export const editarAdminOferta = (id, body) => request(`/admin/ofertas/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(body) });
export const desactivarAdminOferta = id => request(`/admin/ofertas/${encodeURIComponent(id)}`, { method: 'DELETE' });
