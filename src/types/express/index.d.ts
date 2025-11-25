import "express";

declare module "express-serve-static-core" {
  interface Request {
    // Add custom properties here if needed, e.g.:
    // user?: { id: string; role: string };
  }
}
