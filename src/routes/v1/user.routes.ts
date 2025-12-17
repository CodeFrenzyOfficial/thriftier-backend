import { Router } from "express";
import { userController } from "../../controllers/user.controller";
import {
  authenticate,
  isAdmin,
  isOwnerOrAdmin,
} from "../../middlewares/auth.middleware";
import { getContacts } from "../../controllers/contact.controller";

const router = Router();

/**
 * @route   GET /v1/users
 * @desc    Get all users (Admin only)
 * @access  Private/Admin
 */
router.get("/", authenticate, isAdmin, userController.getUsers);

/**
 * @route   POST /v1/users
 * @desc    Create a new user (Admin only)
 * @access  Private/Admin
 */
router.post("/", authenticate, isAdmin, userController.createUser);

/**
 * @route   GET /v1/users/stats
 * @desc    Get user statistics (Admin only)
 * @access  Private/Admin
 */
router.get("/stats", authenticate, isAdmin, userController.getUserStats);

/**
 * @route   GET /v1/users/:id
 * @desc    Get user by ID (Owner or Admin)
 * @access  Private
 */
// hi this is test
router.get("/:id", authenticate, isOwnerOrAdmin, userController.getUserById);

/**
 * @route   PUT /v1/users/:id
 * @desc    Update user (Owner or Admin)
 * @access  Private
 */
router.put("/:id", authenticate, isOwnerOrAdmin, userController.updateUser);

/**
 * @route   DELETE /v1/users/:id
 * @desc    Delete user (Admin only)
 * @access  Private/Admin
 */
router.delete("/:id", authenticate, isAdmin, userController.deleteUser);

// Route to show Contacted Entries through main app form (ADMIN)
router.get("/admin/contacts", authenticate, isAdmin, getContacts);

export default router;