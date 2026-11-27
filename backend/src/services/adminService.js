import { randomUUID } from 'node:crypto';
import { leerTienda, actualizarTienda } from '../repositories/jsonStore.js';
import { leerUsuarios } from '../repositories/usuariosStore.js';
import { HttpError } from '../middleware/HttpError.js';

const ESTADOS_PEDIDO = new Set(['registrado', 'preparando', 'enviado', 'entregado', 'cancelado']);
const limpiarCodigo = value => String(value || '').trim().toUpperCase().replace(/\s+/g, '');

export async function obtenerResumenAdmin() {
  const [estado, usuarios] = await Promise.all([leerTienda(), leerUsuarios()]);
  const pedidos = estado.pedidos || [];
  const ventas = pedidos.filter(p => p.estado !== 'cancelado').reduce((s, p) => s + (p.totalCentimos || 0), 0);
  return {
    productos: estado.productos.filter(p => p.activo).length,
    productosAgotados: estado.productos.filter(p => p.activo && !p.variantes.some(v => v.stock > 0)).length,
    pedidos: pedidos.length,
    pendientes: pedidos.filter(p => ['registrado', 'preparando'].includes(p.estado)).length,
    usuarios: usuarios.length,
    cuponesActivos: (estado.cupones || []).filter(c => c.activo).length,
    ventasCentimos: ventas,
    ultimosPedidos: [...pedidos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 6),
  };
}

export async function listarProductosAdmin() { return (await leerTienda()).productos; }

function validarProducto(datos, existente = {}) {
  const nombre = String(datos.nombre ?? existente.nombre ?? '').trim();
  const categoria = String(datos.categoria ?? existente.categoria ?? '').trim().toLowerCase();
  const descripcion = String(datos.descripcion ?? existente.descripcion ?? '').trim();
  const precioCentimos = Number(datos.precioCentimos ?? existente.precioCentimos);
  const imagen = String(datos.imagen ?? existente.imagen ?? '').trim();
  const etiqueta = String(datos.etiqueta ?? existente.etiqueta ?? '').trim();
  const variantes = datos.variantes ?? existente.variantes;
  if (nombre.length < 2 || nombre.length > 120) throw new HttpError(400, 'El nombre del producto debe tener entre 2 y 120 caracteres.');
  if (!['mujer', 'hombre', 'accesorios', 'zapatillas', 'tecnologia', 'hogar', 'otros'].includes(categoria)) throw new HttpError(400, 'Selecciona una categoría válida.');
  if (!Number.isSafeInteger(precioCentimos) || precioCentimos < 0) throw new HttpError(400, 'El precio debe expresarse en céntimos enteros.');
  if (!Array.isArray(variantes) || !variantes.length || variantes.length > 100) throw new HttpError(400, 'Agrega al menos una variante con talla, color y stock.');
  const ids = new Set();
  const variantesLimpias = variantes.map(v => {
    const id = String(v.id || `var-${randomUUID()}`);
    const talla = String(v.talla || 'Única').trim();
    const color = String(v.color || 'Único').trim();
    const stock = Number(v.stock);
    if (ids.has(id) || !talla || !color || !Number.isSafeInteger(stock) || stock < 0) throw new HttpError(400, 'Revisa las variantes: cada una debe tener un identificador, talla, color y stock válido.');
    ids.add(id);
    return { id, talla, color, stock };
  });
  return { nombre, categoria, descripcion, precioCentimos, imagen: imagen || '/imagenes/polo-algodon.jpg', etiqueta, activo: datos.activo ?? existente.activo ?? true, variantes: variantesLimpias };
}

export async function crearProductoAdmin(datos) {
  return actualizarTienda(estado => {
    const producto = { id: `prod-${randomUUID()}`, ...validarProducto(datos) };
    estado.productos.unshift(producto);
    return producto;
  });
}

export async function actualizarProductoAdmin(id, datos) {
  return actualizarTienda(estado => {
    const index = estado.productos.findIndex(p => p.id === id);
    if (index < 0) throw new HttpError(404, 'No se encontró el producto.');
    estado.productos[index] = { id, ...validarProducto(datos, estado.productos[index]) };
    return estado.productos[index];
  });
}

export async function desactivarProductoAdmin(id) {
  return actualizarTienda(estado => {
    const producto = estado.productos.find(p => p.id === id);
    if (!producto) throw new HttpError(404, 'No se encontró el producto.');
    producto.activo = false;
    return { ok: true };
  });
}

export async function listarPedidosAdmin() {
  const { pedidos } = await leerTienda();
  return [...pedidos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}

export async function actualizarEstadoPedidoAdmin(id, estadoNuevo) {
  if (!ESTADOS_PEDIDO.has(estadoNuevo)) throw new HttpError(400, 'Estado de pedido no válido.');
  return actualizarTienda(estado => {
    const pedido = estado.pedidos.find(p => p.id === id);
    if (!pedido) throw new HttpError(404, 'No se encontró el pedido.');
    pedido.estado = estadoNuevo;
    pedido.actualizadoEn = new Date().toISOString();
    return pedido;
  });
}

export async function listarUsuariosAdmin() {
  const usuarios = await leerUsuarios();
  return usuarios.map(u => ({ id: u.id, nombre: u.nombre || u.correo?.split('@')[0], correo: u.correo, rol: u.rol === 'admin' ? 'admin' : 'cliente', creadoEn: u.creadoEn || null }));
}

export async function listarCuponesAdmin() { return (await leerTienda()).cupones || []; }

export async function listarOfertasAdmin() { return (await leerTienda()).ofertas || []; }
export async function listarOfertasPublicas() { return (await leerTienda()).ofertas || []; }
function validarOferta(datos, anterior = {}) {
  const titulo = String(datos.titulo ?? anterior.titulo ?? '').trim();
  const subtitulo = String(datos.subtitulo ?? anterior.subtitulo ?? '').trim();
  const imagen = String(datos.imagen ?? anterior.imagen ?? '').trim();
  const enlace = String(datos.enlace ?? anterior.enlace ?? '/catalogo').trim();
  const orden = Number(datos.orden ?? anterior.orden ?? 1);
  if (titulo.length < 3 || titulo.length > 80 || !imagen.startsWith('/imagenes/') || !enlace.startsWith('/') || !Number.isSafeInteger(orden) || orden < 1) throw new HttpError(400, 'Revisa título, imagen local, enlace y orden de la oferta.');
  return { titulo, subtitulo: subtitulo.slice(0, 140), imagen, enlace, orden, activa: datos.activa ?? anterior.activa ?? true };
}
export async function crearOfertaAdmin(datos) { return actualizarTienda(estado => { estado.ofertas ||= []; const oferta = { id: `of-${randomUUID()}`, ...validarOferta(datos) }; estado.ofertas.push(oferta); return oferta; }); }
export async function actualizarOfertaAdmin(id, datos) { return actualizarTienda(estado => { const oferta = (estado.ofertas || []).find(o => o.id === id); if (!oferta) throw new HttpError(404, 'No se encontró la oferta.'); Object.assign(oferta, validarOferta(datos, oferta)); return oferta; }); }
export async function desactivarOfertaAdmin(id) { return actualizarTienda(estado => { const oferta = (estado.ofertas || []).find(o => o.id === id); if (!oferta) throw new HttpError(404, 'No se encontró la oferta.'); oferta.activa = false; return { ok: true }; }); }

function validarDatosCupon(datos, anterior = {}) {
  const codigo = limpiarCodigo(datos.codigo ?? anterior.codigo);
  const tipo = datos.tipo ?? anterior.tipo ?? 'porcentaje';
  const valor = Number(datos.valor ?? anterior.valor);
  const minimoCentimos = Number(datos.minimoCentimos ?? anterior.minimoCentimos ?? 0);
  const maxUsos = datos.maxUsos === '' || datos.maxUsos === null ? null : Number(datos.maxUsos ?? anterior.maxUsos ?? null);
  if (!/^[A-Z0-9_-]{3,24}$/.test(codigo)) throw new HttpError(400, 'El código debe tener entre 3 y 24 caracteres (letras, números, guion o guion bajo).');
  if (!['porcentaje', 'fijo'].includes(tipo)) throw new HttpError(400, 'Tipo de descuento no válido.');
  if (!Number.isFinite(valor) || valor <= 0 || (tipo === 'porcentaje' && valor > 90) || (tipo === 'fijo' && !Number.isSafeInteger(valor))) throw new HttpError(400, 'El valor del descuento no es válido.');
  if (!Number.isSafeInteger(minimoCentimos) || minimoCentimos < 0) throw new HttpError(400, 'El mínimo de compra no es válido.');
  if (maxUsos !== null && (!Number.isSafeInteger(maxUsos) || maxUsos < 1)) throw new HttpError(400, 'El límite de usos debe ser un entero positivo.');
  const fechaInicio = datos.fechaInicio ?? anterior.fechaInicio ?? null;
  const fechaFin = datos.fechaFin ?? anterior.fechaFin ?? null;
  if (fechaInicio && Number.isNaN(Date.parse(fechaInicio))) throw new HttpError(400, 'La fecha de inicio del cupón no es válida.');
  if (fechaFin && Number.isNaN(Date.parse(`${fechaFin}T23:59:59`))) throw new HttpError(400, 'La fecha de vencimiento del cupón no es válida.');
  if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(`${fechaFin}T23:59:59`)) throw new HttpError(400, 'La fecha de vencimiento debe ser posterior al inicio.');
  return { codigo, tipo, valor, minimoCentimos, maxUsos, usos: anterior.usos || 0, fechaInicio, fechaFin, activo: datos.activo ?? anterior.activo ?? true, descripcion: String(datos.descripcion ?? anterior.descripcion ?? '').trim().slice(0, 140), soloNuevoUsuario: datos.soloNuevoUsuario ?? anterior.soloNuevoUsuario ?? false, unUsoPorUsuario: datos.unUsoPorUsuario ?? anterior.unUsoPorUsuario ?? false, usuariosUsados: anterior.usuariosUsados || [] };
}

export async function crearCuponAdmin(datos) {
  return actualizarTienda(estado => {
    if (!Array.isArray(estado.cupones)) estado.cupones = [];
    const codigo = limpiarCodigo(datos.codigo);
    if (estado.cupones.some(c => c.codigo === codigo)) throw new HttpError(409, 'Ya existe un cupón con ese código.');
    const cupon = { id: randomUUID(), ...validarDatosCupon(datos) };
    estado.cupones.push(cupon);
    return cupon;
  });
}

export async function actualizarCuponAdmin(id, datos) {
  return actualizarTienda(estado => {
    const cupon = (estado.cupones || []).find(c => c.id === id);
    if (!cupon) throw new HttpError(404, 'No se encontró el cupón.');
    const nuevo = validarDatosCupon(datos, cupon);
    if (estado.cupones.some(c => c.id !== id && c.codigo === nuevo.codigo)) throw new HttpError(409, 'Ya existe un cupón con ese código.');
    Object.assign(cupon, nuevo);
    return cupon;
  });
}

export async function eliminarCuponAdmin(id) {
  return actualizarTienda(estado => {
    const cupon = (estado.cupones || []).find(c => c.id === id);
    if (!cupon) throw new HttpError(404, 'No se encontró el cupón.');
    cupon.activo = false;
    return { ok: true };
  });
}

export async function validarCuponPublico(codigoEntrada, subtotalCentimos, usuario = null) {
  const codigo = limpiarCodigo(codigoEntrada);
  if (!codigo) throw new HttpError(400, 'Escribe un código de cupón.');
  if (!Number.isSafeInteger(subtotalCentimos) || subtotalCentimos < 0) throw new HttpError(400, 'Subtotal no válido.');
  const { cupones = [] } = await leerTienda();
  const cupon = cupones.find(c => c.codigo === codigo && c.activo);
  const ahora = Date.now();
  if (!cupon) throw new HttpError(404, 'El cupón no existe o no está activo.');
  if (cupon.unUsoPorUsuario && usuario && (cupon.usuariosUsados || []).includes(usuario.id)) throw new HttpError(400, 'Este cupón ya fue utilizado por tu cuenta.');
  if (cupon.soloNuevoUsuario) {
    if (!usuario) throw new HttpError(401, 'Inicia sesión para utilizar el cupón de bienvenida.');
    const { pedidos = [] } = await leerTienda();
    if (pedidos.some(p => p.cliente?.id === usuario.id)) throw new HttpError(400, 'El cupón de bienvenida es exclusivo para la primera compra.');
    if ((cupon.usuariosUsados || []).includes(usuario.id)) throw new HttpError(400, 'Este cupón de bienvenida ya fue utilizado por tu cuenta.');
  }
  if (cupon.fechaInicio && ahora < new Date(cupon.fechaInicio).getTime()) throw new HttpError(400, 'Este cupón todavía no está vigente.');
  if (cupon.fechaFin && ahora > new Date(`${cupon.fechaFin}T23:59:59`).getTime()) throw new HttpError(400, 'Este cupón ya venció.');
  if (cupon.maxUsos !== null && cupon.maxUsos !== undefined && cupon.usos >= cupon.maxUsos) throw new HttpError(400, 'Este cupón alcanzó su límite de usos.');
  if (subtotalCentimos < (cupon.minimoCentimos || 0)) throw new HttpError(400, `La compra mínima para este cupón es S/ ${(cupon.minimoCentimos / 100).toFixed(2)}.`);
  const descuentoCentimos = Math.min(subtotalCentimos, cupon.tipo === 'porcentaje' ? Math.round(subtotalCentimos * cupon.valor / 100) : cupon.valor);
  return { codigo: cupon.codigo, descripcion: cupon.descripcion, descuentoCentimos, tipo: cupon.tipo, valor: cupon.valor, soloNuevoUsuario: Boolean(cupon.soloNuevoUsuario) };
}
