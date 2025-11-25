import http from "http";
import { createApp } from "./app";
import { config } from "./config/env";
import { logger } from "./utils/logger";

const app = createApp();
const server = http.createServer(app);
const PORT = config.port;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
});

const shutdown = (signal: string) => {
  return () => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close((err) => {
      if (err) {
        logger.error("Error during shutdown", err);
        process.exit(1);
      }
      logger.info("Server closed. Exiting.");
      process.exit(0);
    });
  };
};

process.on("SIGINT", shutdown("SIGINT"));
process.on("SIGTERM", shutdown("SIGTERM"));
