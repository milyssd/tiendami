import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env')) {
  console.info('Existing .env preserved.');
  process.exit(0);
}
const password = randomBytes(24).toString('hex');
const rootPassword = randomBytes(24).toString('hex');
const key = () => randomBytes(32).toString('base64');
writeFileSync(
  '.env',
  `# Development only. Keep private; replace settings for production.\nDATABASE_URL="mysql://tiendami:${password}@127.0.0.1:3306/tiendami"\nMYSQL_PASSWORD="${password}"\nMYSQL_ROOT_PASSWORD="${rootPassword}"\nAPP_URL="http://localhost:3000"\nCODE_KEY_V1="${key()}"\nCODE_ACTIVE_KEY="V1"\nSTORAGE_SIGNING_KEY="${key()}"\nSTORAGE_ROOT="./storage/private"\n`,
  { mode: 0o600, flag: 'wx' },
);
console.info(
  'Local .env created with independent random keys. No admin account created.',
);
