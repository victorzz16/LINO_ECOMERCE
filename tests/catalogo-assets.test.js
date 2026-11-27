import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('los 28 productos usan fotografías JPG estáticas locales y stock amplio', async () => {
  const tienda = JSON.parse(await readFile(path.join(root, 'data/tienda.example.json'), 'utf8'));
  assert.equal(tienda.productos.length, 28);
  for (const producto of tienda.productos) {
    assert.match(producto.imagen, /^\/imagenes\/[a-z0-9-]+\.jpg$/i, producto.nombre);
    await access(path.join(root, 'frontend/public', producto.imagen.slice(1)));
    assert.ok(producto.variantes.length > 0, producto.nombre);
    for (const variante of producto.variantes) {
      assert.ok(variante.stock >= 35, `${producto.nombre} / ${variante.talla} / ${variante.color}`);
    }
  }
});
