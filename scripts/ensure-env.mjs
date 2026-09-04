// Copia .env.example → .env solo si aún no existe (no sobrescribe credenciales).
// Se usa en `npm run bootstrap` para que el arranque sea un solo comando.
import { copyFileSync, existsSync } from 'node:fs';

if (existsSync('.env')) {
  console.log('✓ .env ya existe, no se sobrescribe');
} else {
  copyFileSync('.env.example', '.env');
  console.log('✓ .env creado desde .env.example');
}
