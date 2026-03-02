// server.js
import "dotenv/config";
import app from "./src/app.js";
import { env } from "./src/config/env.js";
import { logger } from "./src/utils/logger.js";

import { testDbConnection } from "./src/config/db.js";

await testDbConnection();
logger.info("✅ Conectado a PostgreSQL");

app.listen(env.PORT, () => {
  logger.info(`API running on http://localhost:${env.PORT}`);
  logger.info(`Health check: http://localhost:${env.PORT}/api/health`);
});