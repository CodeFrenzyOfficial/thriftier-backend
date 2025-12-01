import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { authService } from "../services/auth.service";
import { catchAsync } from "../utils/catchAsync";
import { RegisterInput, LoginInput } from "../types/auth.types";

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
const register = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const input: RegisterInput = req.body;

    const result = await authService.register(input);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  }
);

/**
 * Login user
 * POST /api/v1/auth/login
 * Returns: JWT token with email, name, and role in the payload
 */
const login = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const input: LoginInput = req.body;

    const result = await authService.login(input);

    // The JWT token already contains email, name, and role
    // These are decoded and attached to req.user by the authenticate middleware

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
        tokens: result.tokens,
        // Explicitly showing what's in the JWT token payload
        tokenPayload: {
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        },
      },
    });
  }
);

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
const refreshToken = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;

    const result = await authService.refreshToken(refreshToken);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Token refreshed successfully",
      data: result,
    });
  }
);

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
const logout = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { refreshToken } = req.body;

    await authService.logout(refreshToken);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Logout successful",
    });
  }
);

/**
 * Get current user profile
 * GET /api/v1/auth/me
 * Requires authentication
 */
const getMe = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // User data is already attached to req.user by authenticate middleware
    // This includes email, name, and role decoded from JWT token

    const user = await authService.getUserById(req.user!.userId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "User profile retrieved successfully",
      data: {
        user,
        // Show the decoded JWT payload that was attached to the request
        decodedToken: {
          email: req.user!.email,
          name: req.user!.name,
          role: req.user!.role,
        },
      },
    });
  }
);

/**
 * Verify user email
 * POST /api/v1/auth/verify-email
 */
const verifyEmail = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    await authService.verifyEmail(req.user!.userId);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Email verified successfully",
    });
  }
);
export const authController = {
  register,
  login,
  refreshToken,
  logout,
  getMe,
  verifyEmail,
};
