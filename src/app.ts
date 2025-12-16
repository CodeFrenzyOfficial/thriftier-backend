import express, { Application } from "express";
// import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { StatusCodes } from "http-status-codes";
import routes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";
import { notFoundHandler } from "./middlewares/notFoundHandler";
import { initPrisma } from "./db";

export const createApp = (): Application => {
  const app = express();

  // Basic security and parsers
  app.use(helmet());
  // app.use(cors({
  //   origin: "*"
  // }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize Prisma DB connection on server start
  initPrisma();

  // Logging
  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }

  // Rate limit (basic global limiter)
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/v1", apiLimiter);

  // Root route
  app.get("/", (_req, res) => {
    res.status(StatusCodes.OK).json({
      message: "Hello World",
      api: "/v1",
      health: "/health",
    });
  });

  // Health check root
  app.get("/health", (_req, res) => {
    res.status(StatusCodes.OK).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // API routes
  app.use("", routes);

  // 404 handler
  app.use(notFoundHandler);

  // Central error handler
  app.use(errorHandler);

  return app;
};
