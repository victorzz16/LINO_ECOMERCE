# Aplicar esta versión al repositorio `main` en Windows

> Antes de copiar archivos, conserva una copia de tu `.env` local. El ZIP no contiene `.env`, `data/bd.json` ni `data/tienda.json`.

## 1. Extraer el ZIP

Extrae `LINO_ECOMERCE-Implementado.zip`. La carpeta interna se llama `LINO_ECOMERCE-main`.

## 2. Clonar o actualizar el repositorio

Si aún no tienes el repositorio clonado:

```cmd
git clone https://github.com/Naranjo68/LINO_ECOMERCE.git
cd LINO_ECOMERCE
git switch main
git pull origin main
```

Si ya lo tienes clonado, entra a esa carpeta y ejecuta:

```cmd
git switch main
git pull origin main
```

## 3. Copiar la versión implementada al clon

Cambia las rutas por las que correspondan a tu computadora. Este ejemplo conserva `.git`, `node_modules`, `.env` y los archivos locales de datos:

```cmd
robocopy "C:\Users\User\Downloads\LINO_ECOMERCE-main" "C:\Users\User\LINO_ECOMERCE" /E /XD .git node_modules /XF .env bd.json tienda.json
```

Si tus archivos `bd.json` y `tienda.json` están dentro de `data`, comprueba que no se sobrescriban. El ZIP de esta entrega no incluye esos archivos privados.

## 4. Instalar y comprobar

Desde la carpeta clonada:

```cmd
npm ci
npm test
npm run build
```

Si vas a ejecutar con Docker y PostgreSQL, comprueba primero que el `.env` conserve tu `DATABASE_URL` y los secretos correctos:

```cmd
docker compose up --build
```

## 5. Configurar la cuenta administradora

En Render, en el servicio `lino-ecomerce-api`, agrega:

- `LINO_ADMIN_EMAIL`: correo de administración.
- `LINO_ADMIN_PASSWORD`: contraseña privada de al menos 12 caracteres.
- `LINO_ADMIN_NAME`: nombre visible (opcional).

No pegues estos valores en Git ni en el código. Al arrancar el contenedor se prepara la cuenta configurada. Después inicia sesión y abre `/admin`.

## 6. Publicar en `main`

Comprueba que no se vaya a subir `.env` ni datos privados:

```cmd
git status --short
git add .
git status --short
git commit -m "feat: ampliar tienda LINO con administración y soporte"
git push origin main
```

El último comando requiere permiso de escritura en el repositorio y que `main` permita push directo. Si el repositorio exige Pull Request, publica una rama y abre el PR hacia `main`.

Después del push, revisa GitHub Actions. Render y Vercel solo desplegarán automáticamente si sus integraciones siguen conectadas a ese repositorio y rama.
