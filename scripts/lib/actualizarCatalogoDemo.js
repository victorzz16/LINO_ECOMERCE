
/**
 * Migración idempotente del catálogo, precios con IGV
 * y contenido promocional de LINO.
 *
 * IMPORTANTE:
 * El aumento del stock de demostración se ejecuta
 * únicamente durante la primera migración.
 * Los reinicios posteriores nunca reponen unidades vendidas.
 */

export const MIGRACION_CATALOGO_DEMO =
  'catalogo-fotografico-stock-demo-v2-precios-igv';

const normalizarNombre = valor =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export function actualizarCatalogoDemo(documento, plantilla) {
  const migraciones = Array.isArray(documento.migraciones)
    ? documento.migraciones
    : [];

  const yaMigrado = migraciones.includes(MIGRACION_CATALOGO_DEMO);

  let imagenesActualizadas = 0;
  let variantesActualizadas = 0;
  let preciosActualizados = 0;
  let productosAgregados = 0;
  let promocionesAgregadas = 0;

  const porId = new Map(
    (plantilla.productos || []).map(p => [p.id, p])
  );

  const porNombre = new Map(
    (plantilla.productos || []).map(p => [
      normalizarNombre(p.nombre),
      p
    ])
  );

  const idsActuales = new Set(
    (documento.productos || []).map(p => p.id)
  );

  const idsVariantes = new Set(
    (documento.productos || []).flatMap(p =>
      (p.variantes || []).map(v => v.id)
    )
  );

  // Incorporar productos nuevos sin duplicarlos.
  for (const nuevo of plantilla.productos || []) {
    if (!idsActuales.has(nuevo.id)) {
      for (const variante of nuevo.variantes || []) {
        if (idsVariantes.has(variante.id)) {
          throw new Error(
            `Variante duplicada al ampliar catálogo: ${variante.id}`
          );
        }

        idsVariantes.add(variante.id);
      }

      documento.productos.push(structuredClone(nuevo));
      productosAgregados++;
    }
  }

  for (const producto of documento.productos || []) {
    const referencia =
      porId.get(producto.id) ||
      porNombre.get(normalizarNombre(producto.nombre));

    // Actualizar fotografías.
    if (
      referencia?.imagen &&
      producto.imagen !== referencia.imagen
    ) {
      producto.imagen = referencia.imagen;
      imagenesActualizadas++;
    }

    // Incorporar IGV una sola vez.
    if (
      !yaMigrado &&
      idsActuales.has(producto.id) &&
      documento.configuracion?.preciosIncluyenIgv !== true &&
      Number.isSafeInteger(producto.precioCentimos)
    ) {
      producto.precioCentimos = Math.round(
        producto.precioCentimos * 1.18
      );

      preciosActualizados++;
    }

    // IMPORTANTE:
    // El stock de demostración solamente se amplía
    // durante la primera migración.
    // Nunca se reponen unidades vendidas en reinicios.
    if (!yaMigrado) {
      (producto.variantes || []).forEach((variante, i) => {
        const objetivo = 35 + (i % 4) * 5;

        const stockActual = Number.isSafeInteger(variante.stock)
          ? variante.stock
          : 0;

        if (stockActual < objetivo) {
          variante.stock = objetivo;
          variantesActualizadas++;
        }
      });
    }
  }

  // Configuración de precios.
  documento.configuracion ||= {};
  documento.configuracion.preciosIncluyenIgv = true;
  documento.configuracion.igvPorcentaje = 18;

  // Incorporar cupones sin sobrescribir los existentes.
  documento.cupones ||= [];

  const codigos = new Set(
    documento.cupones.map(c => c.codigo)
  );

  for (const cupon of plantilla.cupones || []) {
    if (!codigos.has(cupon.codigo)) {
      documento.cupones.push(structuredClone(cupon));
      promocionesAgregadas++;
    }
  }

  // Incorporar ofertas sin duplicarlas.
  documento.ofertas ||= [];

  const ofertas = new Set(
    documento.ofertas.map(o => o.id)
  );

  for (const oferta of plantilla.ofertas || []) {
    if (!ofertas.has(oferta.id)) {
      documento.ofertas.push(structuredClone(oferta));
      promocionesAgregadas++;
    }
  }

  // Registrar que la migración inicial ya se ejecutó.
  if (!yaMigrado) {
    documento.migraciones = [
      ...migraciones,
      MIGRACION_CATALOGO_DEMO
    ];
  }

  return {
    documento,

    aplicado:
      !yaMigrado ||
      imagenesActualizadas > 0 ||
      variantesActualizadas > 0 ||
      preciosActualizados > 0 ||
      productosAgregados > 0 ||
      promocionesAgregadas > 0,

    imagenesActualizadas,
    variantesActualizadas,
    preciosActualizados,
    productosAgregados,
    promocionesAgregadas
  };
}
