import { asegurarAdministradorConfigurado } from '../backend/src/services/usuarioService.js';
import { cerrarPoolPostgres } from '../backend/src/db/postgres.js';
try { process.loadEnvFile?.(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
try {
  const resultado = await asegurarAdministradorConfigurado();
  if (!resultado.configurado) console.log('ℹ Cuenta admin no configurada. Define LINO_ADMIN_EMAIL y LINO_ADMIN_PASSWORD para habilitarla.');
  else console.log(resultado.creado ? '✓ Cuenta de administración creada.' : '✓ Rol de administración verificado para la cuenta configurada.');
} catch (error) {
  console.error('✗ No se pudo preparar la cuenta de administración:', error.message);
  process.exitCode = 1;
} finally { await cerrarPoolPostgres().catch(() => {}); }
