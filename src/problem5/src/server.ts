import { createApp } from "./app.js";
import { loadConfigOrExit } from "./config.js";
import { createDatabase, schemaVersion, type DB } from "./db/database.js";
import { createShutdown, listen } from "./lifecycle.js";
import { createLogger } from "./logger.js";

const config = loadConfigOrExit();
const logger = createLogger(config.logLevel);

let db: DB | undefined;
try {
  db = createDatabase(config.databasePath);
  const server = await listen(createApp({ db, logger }), config.port);
  logger.info(
    {
      port: config.port,
      databasePath: config.databasePath,
      schemaVersion: schemaVersion(db),
    },
    `API listening on http://localhost:${config.port}`,
  );

  const shutdown = createShutdown({
    server,
    logger,
    onClosed: () => db?.close(),
  });
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
} catch (err) {
  // e.g. the port is in use, or a migration failed: say so and exit non-zero.
  logger.fatal({ err }, "Could not start server");
  db?.close();
  process.exit(1);
}
