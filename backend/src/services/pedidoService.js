import { randomUUID } from 'node:crypto';
import { actualizarTienda, leerTienda } from '../repositories/jsonStore.js';
import { HttpError } from '../middleware/HttpError.js';

const ENVIO_BASE_CENTIMOS = 1200;
const UMBRAL_ENVIO_GRATIS = 2;
const IGV_PORCENTAJE = 18;
const METODOS_PAGO = new Set(['yape', 'plin', 'tarjeta', 'efectivo']);

export async function registrarPedido(datos, usuario) {
  const { claveSolicitud, items, direccionEnvio, metodoPago, codigoCupon } = datos ?? {};
  if (typeof claveSolicitud !== 'string' || claveSolicitud.length < 8 || claveSolicitud.length > 100) throw new HttpError(400, 'La clave de solicitud debe tener entre 8 y 100 caracteres.');
  if (!Array.isArray(items) || items.length === 0 || items.length > 40) throw new HttpError(400, 'Agrega al menos un producto válido al carrito.');
  if (typeof direccionEnvio !== 'string' || direccionEnvio.trim().length < 8 || direccionEnvio.trim().length > 300) throw new HttpError(400, 'Ingresa una dirección de envío válida (entre 8 y 300 caracteres).');
  if (!METODOS_PAGO.has(metodoPago)) throw new HttpError(400, 'Selecciona un método válido: Yape, Plin, tarjeta o efectivo.');
  const agregados = new Set();
  for (const item of items) {
    if (!item || typeof item.varianteId !== 'string' || !item.varianteId || !Number.isSafeInteger(item.cantidad) || item.cantidad < 1 || item.cantidad > 99 || agregados.has(item.varianteId)) throw new HttpError(400, 'Hay variantes duplicadas o cantidades inválidas.');
    agregados.add(item.varianteId);
  }
  return actualizarTienda(estado => {
    const existente = estado.pedidos.find(p => p.claveSolicitud === claveSolicitud);
    if (existente) {
      const anterior = existente.lineas.map(l => ({ varianteId: l.varianteId, cantidad: l.cantidad })).sort((a, b) => a.varianteId.localeCompare(b.varianteId));
      const nuevo = items.map(l => ({ varianteId: l.varianteId, cantidad: l.cantidad })).sort((a, b) => a.varianteId.localeCompare(b.varianteId));
      if (JSON.stringify(anterior) !== JSON.stringify(nuevo) || existente.direccionEnvio !== direccionEnvio.trim() || existente.cliente?.id !== usuario.id || existente.metodoPago !== metodoPago || (existente.cupon?.codigo || '') !== String(codigoCupon || '').trim().toUpperCase()) throw new HttpError(409, 'La clave de solicitud pertenece a una selección distinta.');
      return { pedido: existente, repetido: true, sinCambios: true };
    }
    const lineas = items.map(item => {
      const producto = estado.productos.find(p => p.activo && p.variantes.some(v => v.id === item.varianteId));
      const variante = producto?.variantes.find(v => v.id === item.varianteId);
      if (!producto || !variante) throw new HttpError(404, 'Una variante del carrito ya no está disponible.');
      if (variante.stock < item.cantidad) throw new HttpError(409, `Stock insuficiente de ${producto.nombre} (${variante.talla}, ${variante.color}). Quedan ${variante.stock}.`);
      return {
        productoId: producto.id, varianteId: variante.id, nombreProducto: producto.nombre,
        talla: variante.talla, color: variante.color, cantidad: item.cantidad,
        precioUnitarioCentimos: producto.precioCentimos,
        subtotalCentimos: producto.precioCentimos * item.cantidad,
      };
    });
    const subtotalCentimos = lineas.reduce((total, l) => total + l.subtotalCentimos, 0);
    const cantidadTotal = lineas.reduce((total, l) => total + l.cantidad, 0);
    const envioCentimos = cantidadTotal >= UMBRAL_ENVIO_GRATIS ? 0 : ENVIO_BASE_CENTIMOS;
    let cuponAplicado = null;
    let descuentoCentimos = 0;
    const codigoNormalizado = String(codigoCupon || '').trim().toUpperCase();
    if (codigoNormalizado) {
      const cupon = (estado.cupones || []).find(c => c.codigo === codigoNormalizado && c.activo);
      if (!cupon) throw new HttpError(404, 'El cupón no existe o no está activo.');
      const ahora = Date.now();
      if (cupon.fechaInicio && ahora < new Date(cupon.fechaInicio).getTime()) throw new HttpError(400, 'Este cupón todavía no está vigente.');
      if (cupon.fechaFin && ahora > new Date(`${cupon.fechaFin}T23:59:59`).getTime()) throw new HttpError(400, 'Este cupón ya venció.');
      if (cupon.maxUsos !== null && cupon.maxUsos !== undefined && cupon.usos >= cupon.maxUsos) throw new HttpError(400, 'Este cupón alcanzó su límite de usos.');
      if (cupon.unUsoPorUsuario && (cupon.usuariosUsados || []).includes(usuario.id)) throw new HttpError(400, 'Este cupón ya fue utilizado por tu cuenta.');
      if (cupon.soloNuevoUsuario) {
        if ((estado.pedidos || []).some(p => p.cliente?.id === usuario.id) || (cupon.usuariosUsados || []).includes(usuario.id)) throw new HttpError(400, 'El cupón de bienvenida es exclusivo para la primera compra y solo puede utilizarse una vez.');
      }
      if (subtotalCentimos < (cupon.minimoCentimos || 0)) throw new HttpError(400, `La compra mínima para este cupón es S/ ${(cupon.minimoCentimos / 100).toFixed(2)}.`);
      descuentoCentimos = Math.min(subtotalCentimos, cupon.tipo === 'porcentaje' ? Math.round(subtotalCentimos * cupon.valor / 100) : cupon.valor);
      cuponAplicado = { codigo: cupon.codigo, descuentoCentimos };
    }
    const baseImponibleCentimos = Math.max(0, subtotalCentimos - descuentoCentimos) + envioCentimos;
    const totalCentimos = baseImponibleCentimos;
    const igvCentimos = Math.round(totalCentimos * IGV_PORCENTAJE / (100 + IGV_PORCENTAJE));
    const pedido = {
      id: `PED-${randomUUID().slice(0, 8).toUpperCase()}`, claveSolicitud,
      fecha: new Date().toISOString(), estado: 'registrado',
      cliente: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo },
      direccionEnvio: direccionEnvio.trim(),
      metodoPago,
      cupon: cuponAplicado,
      descuentoCentimos,
      estadoPago: 'no_procesado', // Los cuatro métodos son demostrativos, nunca se cobra dinero.
      lineas,
      subtotalCentimos,
      envioCentimos,
      igvCentimos,
      totalCentimos,
    };
    for (const item of items) {
      for (const producto of estado.productos) {
        const variante = producto.variantes.find(v => v.id === item.varianteId);
        if (variante) variante.stock -= item.cantidad;
      }
    }
    if (cuponAplicado) {
      const cupon = estado.cupones.find(c => c.codigo === cuponAplicado.codigo);
      cupon.usos = (cupon.usos || 0) + 1;
      if (cupon.unUsoPorUsuario || cupon.soloNuevoUsuario) { cupon.usuariosUsados ||= []; if (!cupon.usuariosUsados.includes(usuario.id)) cupon.usuariosUsados.push(usuario.id); }
    }
    estado.pedidos.push(pedido);
    return { pedido, repetido: false };
  });
}

export async function listarPedidosUsuario(usuarioId) {
  const { pedidos } = await leerTienda();
  return pedidos.filter(p => p.cliente?.id === usuarioId).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
}
