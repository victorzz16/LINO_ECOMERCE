import test from 'node:test';
import assert from 'node:assert/strict';
import { actualizarCatalogoDemo, MIGRACION_CATALOGO_DEMO } from '../scripts/lib/actualizarCatalogoDemo.js';

function tienda(productos, migraciones = []) {
  return { versionEsquema: 1, revision: 0, productos, pedidos: [], migraciones };
}

test('actualiza imágenes y amplía el stock de cada variante una sola vez', () => {
  const documento = tienda([
    { id: 'prod-001', nombre: 'Polo esencial de algodón', imagen: '/imagenes/polo-algodon.svg', variantes: [
      { id: 'v1', talla: 'S', color: 'Marfil', stock: 4 },
      { id: 'v2', talla: 'M', color: 'Marfil', stock: 70 },
      { id: 'v3', talla: 'L', color: 'Marfil', stock: 0 },
      { id: 'v4', talla: 'XL', color: 'Marfil', stock: 8 },
    ] },
  ]);
  const plantilla = tienda([
    { id: 'prod-001', nombre: 'Polo esencial de algodón', imagen: '/imagenes/polo-algodon.jpg', variantes: [] },
  ]);

  const resultado = actualizarCatalogoDemo(documento, plantilla);
  assert.equal(resultado.aplicado, true);
  assert.equal(documento.productos[0].imagen, '/imagenes/polo-algodon.jpg');
  assert.deepEqual(documento.productos[0].variantes.map(v => v.stock), [35, 70, 45, 50]);
  assert.ok(documento.migraciones.includes(MIGRACION_CATALOGO_DEMO));

  const segunda = actualizarCatalogoDemo(documento, plantilla);
  assert.equal(segunda.aplicado, false);
  assert.deepEqual(documento.productos[0].variantes.map(v => v.stock), [35, 70, 45, 50]);
});
