/**
 * Inicializa data/tienda.json si falta y agrega productos nuevos del catálogo.
 * También aplica una sola vez la actualización fotográfica y el stock amplio
 * de demostración, conservando pedidos y cualquier stock que ya sea mayor.
 * Ejecutar sin el servidor en marcha (un único escritor de JSON).
 */
import { readFile, writeFile, access, mkdir, copyFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { validarTienda } from '../backend/src/repositories/jsonStore.js';
import { actualizarCatalogoDemo } from './lib/actualizarCatalogoDemo.js';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sample = path.join(root, 'data', 'tienda.example.json');
const target = process.env.LINO_DATA_FILE || path.join(root, 'data', 'tienda.json');

try {
  const plantilla = validarTienda(JSON.parse(await readFile(sample, 'utf8')));
  await mkdir(path.dirname(target), { recursive: true });
  let previo;
  try {
    await access(target);
    previo = validarTienda(JSON.parse(await readFile(target, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const inicial = structuredClone(plantilla);
    actualizarCatalogoDemo(inicial, plantilla);
    await writeFile(target, JSON.stringify(inicial, null, 2) + '\n', { flag: 'wx' });
    console.log(`✓ Tienda creada con ${inicial.productos.length} productos fotográficos y stock amplio: ${target}`);
    process.exit(0);
  }

  // Migración única: los precios antiguos estaban sin IGV. Los precios del catálogo plantilla ya son finales.
  if (previo.configuracion?.preciosIncluyenIgv !== true) {
    for (const producto of previo.productos) producto.precioCentimos = Math.round(producto.precioCentimos * 1.18);
    previo.configuracion ||= {}; previo.configuracion.preciosIncluyenIgv = true; previo.configuracion.igvPorcentaje = 18;
  }
  const existentes = new Set(previo.productos.map(p => p.id));
  const idsVariantes = new Set(previo.productos.flatMap(p => p.variantes.map(v => v.id)));
  const nuevos = plantilla.productos.filter(p => !existentes.has(p.id));
  for (const nuevo of nuevos) {
    for (const v of nuevo.variantes) {
      if (idsVariantes.has(v.id)) throw new Error(`Variante duplicada al ampliar catálogo: ${v.id}`);
      idsVariantes.add(v.id);
    }
  }

  const combinado = { ...structuredClone(previo), productos: [...previo.productos, ...nuevos] };
  const migracion = actualizarCatalogoDemo(combinado, plantilla);
  const actualizado = migracion.documento;
  if (!nuevos.length && !migracion.aplicado) {
    console.log(`✓ Catálogo actualizado (${previo.productos.length} productos). No hubo cambios pendientes.`);
    process.exit(0);
  }

  actualizado.revision = previo.revision + 1;
  validarTienda(actualizado);
  const respaldoDir = path.join(path.dirname(target), 'backups');
  await mkdir(respaldoDir, { recursive: true });
  const respaldo = path.join(respaldoDir, `tienda-antes-actualizacion-${Date.now()}-${randomUUID().slice(0, 8)}.json`);
  const temporal = path.join(path.dirname(target), `tienda.${randomUUID()}.tmp`);
  await copyFile(target, respaldo);
  await writeFile(temporal, JSON.stringify(actualizado, null, 2) + '\n', { flag: 'wx' });
  await rename(temporal, target);

  if (nuevos.length) console.log(`✓ Se agregaron ${nuevos.length} productos (total ${actualizado.productos.length}).`);
  if (migracion.aplicado) console.log(`✓ Migración aplicada: ${migracion.productosAgregados || 0} productos, ${migracion.preciosActualizados || 0} precios con IGV, ${migracion.promocionesAgregadas || 0} promociones, ${migracion.imagenesActualizadas} imágenes y ${migracion.variantesActualizadas} stocks actualizados.`);
  console.log('✓ Se conservaron los pedidos y el stock que ya superaba el objetivo. Respaldo:', respaldo);
} catch (error) {
  console.error('✗ No se modificaron los datos: ' + error.message);
  process.exitCode = 1;
}
