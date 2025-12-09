import { Router } from "express";
import healthRoutes from "./health.routes";
import userRoutes from "./user.routes";
import authRoutes from "./auth.routes";
import { createContact } from "../../controllers/contact.controller";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);

// Public API
// Contact Form Route
// Public (Main App Contact us form)
router.post("/contact", createContact);

export default router;
