# LINO — ampliación funcional 2026

Esta entrega amplía el proyecto de tienda online existente sin incluir credenciales ni archivos `.env`.

## Cambios incluidos

- Catálogo de 28 productos con cuatro zapatillas nuevas y fotografías JPG estáticas de apariencia fotográfica.
- Migración idempotente del catálogo: incorpora productos, cupones y ofertas sin reemplazar pedidos ni usuarios; convierte los precios históricos a precio final con IGV una sola vez.
- Precios de catálogo y administración tratados como precios finales con IGV incluido. El carrito y el pedido extraen el IGV incluido (18/118) y no lo suman dos veces.
- Diez cupones iniciales. `BIENVENIDA10` se limita a la primera compra por cuenta y se registra en `usuariosUsados`; el anuncio superior se oculta después de la primera compra.
- Carrusel de ofertas en el inicio con flechas, indicadores y avance automático. El administrador puede crear, editar y desactivar ofertas.
- Barra superior con mensajes rotativos cada tres segundos y mensaje de bienvenida.
- Apartado de dirección en la barra superior y en checkout: departamento, provincia, distrito, dirección, referencia y captura de ubicación del navegador. La dirección se guarda localmente en el navegador y se adjunta al pedido.
- Centro de ayuda con navegación lateral y preguntas desplegables; se conserva el chatbot existente.
- Categoría Zapatillas disponible en navegación, catálogo y administración.

## Pruebas realizadas en el entorno de preparación

- `node --test tests/catalogo-demo.test.js tests/catalogo-assets.test.js`: 2 pruebas aprobadas.
- Validación del catálogo de 28 productos, 10 cupones y 3 ofertas mediante `scripts/validate-data.js`.
- Inicialización JSON ejecutada dos veces para verificar que la migración sea idempotente.
- Simulación de actualización de un catálogo anterior: añadió 4 productos, 10 cupones, 3 ofertas y migró precios antiguos a precios con IGV sin sobrescribir pedidos.
- `node --check` sobre los archivos JavaScript del backend y scripts.

La instalación completa de dependencias y el build Vite/API no pudieron ejecutarse en este entorno de preparación porque la descarga desde npm agotó el tiempo de espera. Ejecuta `npm ci`, `npm test` y `npm run build` en Windows antes de publicar.

## Notas importantes

- La geolocalización requiere permiso del navegador y funciona en `localhost` o en un sitio HTTPS. La búsqueda inversa de dirección usa OpenStreetMap Nominatim; revisa los campos completados antes de guardar.
- Las imágenes nuevas son imágenes de producto generadas para esta demostración; no representan marcas comerciales ni fotografías de inventario real.
- Los medios de pago siguen siendo demostrativos y no procesan cobros reales.
