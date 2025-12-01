import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";
import dotenv from "dotenv";

dotenv.config();

// Prisma Client instance with logging
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: [
    {
      emit: "event",
      level: "query",
    },
    {
      emit: "event",
      level: "error",
    },
    {
      emit: "event",
      level: "info",
    },
    {
      emit: "event",
      level: "warn",
    },
  ],
});

// Log Prisma queries in development
if (process.env.NODE_ENV === "development") {
  prisma.$on("query" as never, (e: any) => {
    logger.debug("Query: " + e.query);
    logger.debug("Params: " + e.params);
    logger.debug("Duration: " + e.duration + "ms");
  });
}

prisma.$on("error" as never, (e: any) => {
  logger.error("Prisma Error:", e);
});

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

export { prisma };
