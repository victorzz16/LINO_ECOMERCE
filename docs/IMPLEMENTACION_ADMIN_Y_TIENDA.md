# Implementación de tienda pública, administración y soporte

## Comportamiento del sitio

- El inicio, el catálogo, las fichas de producto, Nosotros, Contacto y Centro de ayuda son públicos.
- Se puede agregar productos al carrito sin iniciar sesión.
- Para confirmar un pedido se requiere una sesión válida. Si no hay sesión, la interfaz dirige al formulario de acceso/registro y luego vuelve al carrito.
- Los clientes autenticados consultan su propio historial en `/mis-pedidos`.
- El panel `/admin` requiere una sesión cuyo rol sea `admin`; el backend vuelve a comprobar el rol en cada endpoint administrativo.

## Preparar la cuenta administradora

No se incluye una contraseña fija en el repositorio. Configura en Render, en el servicio `lino-ecomerce-api`, estas variables privadas:

| Variable | Uso |
|---|---|
| `LINO_ADMIN_EMAIL` | Correo de la cuenta administradora |
| `LINO_ADMIN_PASSWORD` | Contraseña nueva, única y de 12 caracteres o más |
| `LINO_ADMIN_NAME` | Nombre que se mostrará en el panel (opcional) |

Al iniciar el contenedor, `scripts/ensure-admin.js` busca el correo configurado. Si no existe, crea la cuenta con hash scrypt y sal. Si ya existe, asigna el rol `admin` sin cambiar su contraseña. Los demás usuarios antiguos siguen teniendo rol `cliente` por defecto. No se imprimen contraseñas en logs.

En local, coloca estas variables en `.env`, que está excluido de Git. Ejecuta `npm run admin:ensure` para aplicar la configuración. Si el proyecto usa Neon, asegúrate de que `DATABASE_URL` apunte a la base correcta antes de ejecutar el comando.

## Módulos de administración

- Resumen: productos activos, productos agotados, pedidos, pedidos pendientes, usuarios, cupones activos y ventas registradas.
- Productos: crear, editar y desactivar; el stock se gestiona por variantes (talla, color e identificador).
- Pedidos: listar y actualizar estado a registrado, preparando, enviado, entregado o cancelado.
- Usuarios: consulta de nombre, correo, rol y fecha de registro; no se muestran hashes de contraseña.
- Cupones: crear, editar y desactivar códigos porcentuales o de importe fijo, con mínimo de compra, fechas y límite de usos.

## Aplicación de cupones

El carrito solicita una validación preliminar al servidor para mostrar el descuento. Al confirmar el pedido, el backend vuelve a comprobar estado, vigencia, mínimo de compra y límite de usos dentro de la misma actualización transaccional de la tienda. El descuento se guarda en el pedido y se contabiliza un uso. No se confía en el importe de descuento enviado por el navegador.

## Centro de ayuda

`/centro-ayuda` presenta categorías de orientación. El botón flotante abre un asistente guiado con respuestas predefinidas sobre pedidos, pagos, envíos, cupones, cuenta y cambios. Es un chatbot informativo local; no se conecta a un modelo externo ni a una persona en vivo.

## Datos existentes y despliegue

La lista de usuarios se conserva en `lino_usuarios_state`. El documento de tienda continúa en `lino_tienda_state`; se añade la propiedad `cupones` de manera compatible cuando se lee o actualiza un documento antiguo. El inicializador de PostgreSQL utiliza `ON CONFLICT DO NOTHING`, por lo que no reemplaza el catálogo, pedidos ni usuarios que ya estén en Neon.

El flujo Docker del backend inicializa el esquema, prepara la cuenta administradora configurada y después inicia Express. No se debe compartir ni subir `.env`, credenciales de Neon, secretos de sesión o contraseñas de administración.

## Validaciones realizadas al preparar esta versión

- Comprobación sintáctica de todos los archivos JavaScript de backend, scripts y pruebas con Node.js.
- Transpilación de sintaxis JSX de todos los componentes y páginas con el compilador TypeScript disponible en el entorno de preparación.
- Prueba aislada de servicios: creación/promoción de administrador, validación de cupón, descuento calculado al registrar un pedido, historial y resumen administrativo.

No se pudo ejecutar `npm ci`, `npm test` ni `npm run build` en el entorno de preparación porque no había resolución DNS/conectividad con el registro npm. Deben ejecutarse en el equipo local antes de publicar esta versión.
