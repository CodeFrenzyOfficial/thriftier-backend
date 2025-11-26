import http from "http";
import { createApp } from "./app";
import { logger } from "./utils/logger";
import dotenv from "dotenv";

dotenv.config();

const app = createApp();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(
    `Server running on port http://localhost:${PORT} in ${process.env.NODE_ENV} mode`
  );
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
