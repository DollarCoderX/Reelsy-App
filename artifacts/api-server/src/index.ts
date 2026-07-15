import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from artifacts/api-server directory
// Bundled file is at: artifacts/api-server/dist/index.mjs
// .env is at: artifacts/api-server/.env
// From dist, go up 1 level to api-server
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Not set');
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Not set');

import app from "./app";
import { logger } from "./lib/logger";
import { initSupabase } from "./lib/supabase";
import { seedHelpCenterBot } from "./lib/seed";

// Initialise Supabase eagerly so auth + messaging routes are ready
initSupabase()
  .then(() => seedHelpCenterBot())
  .catch((err) => {
    logger.warn({ err }, "Supabase init failed – some features may be degraded");
  });

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
