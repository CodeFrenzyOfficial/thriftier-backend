import { Router } from "express";
import { authController } from "../../controllers/auth.controller";
import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

/**
 * @route   POST /v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post("/register", authController.register);

/**
 * @route   POST /v1/auth/login
 * @desc    Login user and get JWT tokens
 *          JWT token payload includes: email, name, role
 * @access  Public
 */
router.post("/login", authController.login);

/**
 * @route   POST /v1/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post("/refresh", authController.refreshToken);

/**
 * @route   POST /v1/auth/logout
 * @desc    Logout user and invalidate refresh token
 * @access  Public
 */
router.post("/logout", authController.logout);

/**
 * @route   GET /v1/auth/me
 * @desc    Get current user profile
 *          Requires JWT token in Authorization header
 *          Token is decoded and email, name, role are attached to req.user
 * @access  Private
 */
router.get("/me", authenticate, authController.getMe);

/**
 * @route   POST /v1/auth/verify-email
 * @desc    Verify user email
 * @access  Private
 */
router.post("/verify-email", authenticate, authController.verifyEmail);

/**
 * @route   PUT /v1/auth/change-password
 * @desc    Change user password
 * @access  Private (Admin Side Route)
 */
// router.put("/change-password", authenticate, authController.changePassword);


/**
 * @route   PUT /v1/auth/verify-otp
 * @desc    Verify OTP during login
 * @access  Private
 */
router.put("/verify-otp", authController.verifyOtp);

// Main App Routes
/**
 * @route   PUT /v1/auth/forgot-password
 * @desc    Verify OTP during login
 * @access  Private
 */
router.post("/forgot-password", authController.forgotPassword);

/**
 * @route   PUT /v1/auth/confirm-reset-password
 * @desc    Verify OTP during login
 * @access  Private
 */
router.put("/confirm-reset-password", authController.confirmResetPassword);


export default router;