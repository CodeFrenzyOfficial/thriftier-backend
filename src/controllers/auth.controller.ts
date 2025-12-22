import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { authService } from "../services/auth.service";
import { catchAsync } from "../utils/catchAsync";
import { RegisterInput, LoginInput, JwtPayload } from "../types/auth.types";
import { ApiError } from "../utils/ApiError";
import { prisma } from "../config/database";
import { generateTokenPair } from "../utils/jwt";

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
export const register = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const input: RegisterInput = req.body;
    const result = await authService.register(input);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message:
        result.kind === "OTP_REQUIRED"
          ? "User registered. OTP sent to email."
          : "User registered successfully",
      data: result,
    });
  }
);

/**
 * Login user
 * POST /api/v1/auth/login
 * Returns: JWT token with email, name, and role in the payload
 */
export const login = catchAsync(
  async (req: Request, res: Response) => {
    const input: LoginInput = req.body;
    const result = await authService.login(input);

    res.status(StatusCodes.OK).json({
      success: true,
      message:
        result.kind === "OTP_REQUIRED"
          ? "OTP verification required"
          : "Login successful",
      data: result,
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

/**
 * Verify email OTP and issue tokens
 * POST /api/v1/auth/verify-otp
 */
const verifyOtp = catchAsync(async (req: Request, res: Response) => {
  const { email, code } = req.body as { email?: string; code?: string };

  if (!email) throw new ApiError(StatusCodes.BAD_REQUEST, "Email is required");
  if (!code)
    throw new ApiError(StatusCodes.BAD_REQUEST, "OTP code is required");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

  if (!user.isActive) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Your account has been deactivated"
    );
  }
  if (user.deletedAt) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Your account has been deleted");
  }

  // Verify OTP (this sets user.isVerified=true inside transaction)
  await authService.verifyEmailOtp(user.id, code);

  // Re-fetch to ensure latest state
  const updatedUser = await prisma.user.findUnique({ where: { email } });
  if (!updatedUser || !updatedUser.isVerified) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "OTP verification failed");
  }

  const jwtPayload: JwtPayload = {
    userId: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    role: updatedUser.role,
    location: updatedUser.location,
    phoneNumber: updatedUser.phoneNumber,
  };

  const tokens = generateTokenPair(jwtPayload);

  // Store refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      token: tokens.refreshToken,
      userId: updatedUser.id,
      expiresAt,
    },
  });

  res.status(StatusCodes.OK).json({
    success: true,
    message: "OTP verified successfully",
    data: {
      kind: "SUCCESS",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        location: updatedUser.location,
        role: updatedUser.role,
        phoneNumber: updatedUser.phoneNumber,
        isVerified: updatedUser.isVerified,
      },
      tokens,
    },
  });
});

/**
 * Change user password
 * PUT /api/v1/auth/change-password
 * Requires authentication
 */
const changePassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(
      req.user!.userId,
      currentPassword,
      newPassword
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Password changed successfully",
    });
  }
);

// Forgot password - request reset (User MAin App Controllers)
const forgotPassword = catchAsync(
  async (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };

    await authService.requestPasswordReset(email ?? "");

    //  Always success
    res.status(StatusCodes.OK).json({
      success: true,
      message:
        "If an account exists for this email, a reset link has been sent.",
    });
  }
);

const confirmResetPassword = catchAsync(
  async (req: Request, res: Response) => {
    const { token, newPassword } = req.body as {
      token?: string;
      newPassword?: string;
    };

    await authService.resetPassword({
      token: token ?? "",
      newPassword: newPassword ?? "",
    });

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Password reset successfully",
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
  changePassword,
  verifyOtp,
  confirmResetPassword,
  forgotPassword
};
