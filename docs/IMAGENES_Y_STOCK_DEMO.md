# Actualización de fotografías y stock de demostración

- El catálogo de ejemplo utiliza imágenes JPG estáticas con fotografía de apariencia realista; no usa animaciones ni ilustraciones SVG para las prendas del catálogo.
- Hay una imagen JPG local para cada uno de los 28 productos de `data/tienda.example.json`.
- Las imágenes son recursos de demostración generados para esta versión. Antes de operar una tienda comercial, deben sustituirse por fotografías propias de los productos físicos que realmente se venderán.
- Cada opción de talla/color del catálogo de ejemplo inicia con 35, 40, 45 o 50 unidades.
- `scripts/lib/actualizarCatalogoDemo.js` aplica la actualización a los datos existentes una sola vez. El marcador `catalogo-fotografico-stock-demo-v1` impide que un reinicio o despliegue posterior vuelva a incrementar el inventario.
- La migración conserva cualquier stock existente que ya sea superior al objetivo, además de los pedidos y usuarios.
- En PostgreSQL, `scripts/init-postgres.js` aplica la migración dentro de una transacción. En almacenamiento JSON local, `npm run init:data` crea un respaldo antes de guardar los cambios.

- Se agregaron cuatro modelos de zapatillas con fotografías de producto estáticas.
