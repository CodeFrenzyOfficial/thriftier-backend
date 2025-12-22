import { Role, User } from "@prisma/client";
import { prisma } from "../config/database";
import { ApiError } from "../utils/ApiError";
import { StatusCodes } from "http-status-codes";
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
} from "../utils/password";
import { generateTokenPair, verifyToken } from "../utils/jwt";
import {
  RegisterInput,
  LoginInput,
  AuthResponse,
  JwtPayload,
  SafeUser,
} from "../types/auth.types";
import { logger } from "../utils/logger";
import {
  addMinutes,
  generateOtpCode,
  generateResetToken,
  hashOtp,
  hashResetToken,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_MINUTES,
} from "../utils/auth-helpers";
import { sendVerifyOtpEmail } from "../templates/sendOTP";
import { sendResetPasswordEmail } from "../templates/sendResetPassword.template";

function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    location: user.location,
    role: user.role,
    phoneNumber: user.phoneNumber,
    isVerified: user.isVerified,
  };
}

/**
 * Register a new user
 */
const register = async (input: RegisterInput): Promise<AuthResponse> => {
  const {
    email,
    password,
    name,
    location,
    phoneNumber,
    role = Role.USER,
    reqFromAdmin = false,
  } = input;

  // ---------- validations (your existing logic preserved)
  const errors: string[] = [];

  if (!email) errors.push("Email is required");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push("Invalid email format");

  if (!password) errors.push("Password is required");
  else if (password.length < 8)
    errors.push("Password must be at least 8 characters long");
  else {
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) errors.push(...passwordValidation.errors);
  }

  if (!phoneNumber) errors.push("Phone number is required");
  else if (!/^\+?[1-9]\d{1,14}$/.test(phoneNumber.replace(/[\s\-\(\)]/g, "")))
    errors.push("Invalid phone number format");

  if (!name) errors.push("Name is required");
  else if (name.trim().length < 2)
    errors.push("Name must be at least 2 characters long");

  if (!location) errors.push("Location is required");
  else if (location.trim().length < 2)
    errors.push("Location must be at least 2 characters long");

  if (errors.length > 0)
    throw new ApiError(StatusCodes.BAD_REQUEST, errors.join(", "));

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { phoneNumber }],
    },
    select: { email: true, phoneNumber: true },
  });

  if (existing) {
    if (existing.email === email) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        "User with this email already exists"
      );
    }
    throw new ApiError(
      StatusCodes.CONFLICT,
      "User with this phone number already exists"
    );
  }

  // ---------- create user
  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      location,
      phoneNumber,
      role,
      isVerified: reqFromAdmin ? true : false,
    },
  });

  logger.info(
    `New user registered: ${user.email} with role ${user.role} (reqFromAdmin=${reqFromAdmin})`
  );

  const safeUser = toSafeUser(user);

  //  ADMIN FLOW: directly issue tokens
  if (reqFromAdmin) {
    const jwtPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      location: user.location,
      phoneNumber: user.phoneNumber,
    };

    const tokens = generateTokenPair(jwtPayload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return { kind: "SUCCESS", user: safeUser, tokens };
  }

  //  NORMAL USER FLOW: send OTP; no tokens
  const { code } = await createAndStoreEmailOtp(user.id);
  await sendVerifyOtpEmail({
    toEmail: user.email,
    toName: user.name,
    otp: code,
  });

  return { kind: "OTP_REQUIRED", user: safeUser, otpRequired: true };
};

/**
 * Login user and return JWT tokens
 */
const login = async (input: LoginInput): Promise<AuthResponse> => {
  const { email, password } = input;

  // ---------- validations
  const errors: string[] = [];
  if (!email) errors.push("Email is required");
  if (!password) errors.push("Password is required");
  if (errors.length > 0)
    throw new ApiError(StatusCodes.BAD_REQUEST, errors.join(", "));

  // ---------- find user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user)
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid email or password");

  if (!user.isActive) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Your account has been deactivated"
    );
  }

  if (user.deletedAt) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Your account has been deleted");
  }

  // ---------- verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid)
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid email or password");

  logger.info(`User login attempt: ${user.email}`);

  const safeUser = toSafeUser(user);

  //  Bypass OTP verification for ADMIN and DRIVER roles
  const isAdminOrDriver = user.role === Role.ADMIN || user.role === Role.DRIVER;

  //  OTP gate (skip for ADMIN/DRIVER)
  if (!user.isVerified && !isAdminOrDriver) {
    const okToResend = await canResendOtp(user.id);
    if (okToResend) {
      const { code } = await createAndStoreEmailOtp(user.id);
      await sendVerifyOtpEmail({
        toEmail: user.email,
        toName: user.name,
        otp: code,
      });
    }

    return { kind: "OTP_REQUIRED", user: safeUser, otpRequired: true };
  }

  //  verified OR admin/driver -> issue tokens
  const jwtPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    location: user.location,
    phoneNumber: user.phoneNumber,
  };

  const tokens = generateTokenPair(jwtPayload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  logger.info(`User logged in: ${user.email} (role: ${user.role})`);

  return { kind: "SUCCESS", user: safeUser, tokens };
};

/**
 * Refresh access token using refresh token
 */
const refreshToken = async (
  refreshToken: string
): Promise<{ accessToken: string }> => {
  // Validate refresh token
  if (!refreshToken) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Refresh token is required");
  }

  // Find refresh token in database
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!tokenRecord) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid refresh token");
  }

  // Check if token is expired
  if (tokenRecord.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Refresh token has expired");
  }

  // Check if user is still active
  if (!tokenRecord.user.isActive || tokenRecord.user.deletedAt) {
    throw new ApiError(StatusCodes.FORBIDDEN, "User account is not active");
  }

  // Generate new access token
  const jwtPayload: JwtPayload = {
    userId: tokenRecord.user.id,
    email: tokenRecord.user.email,
    name: tokenRecord.user.name,
    role: tokenRecord.user.role,
    location: tokenRecord.user.location,
    phoneNumber: tokenRecord.user.phoneNumber,
  };

  const { accessToken } = generateTokenPair(jwtPayload);

  return { accessToken };
};

/**
 * Logout user by invalidating refresh token
 */
const logout = async (refreshToken: string): Promise<void> => {
  // Validate refresh token
  if (!refreshToken) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Refresh token is required");
  }

  await prisma.refreshToken.deleteMany({
    where: { token: refreshToken },
  });

  logger.info("User logged out");
};

/**
 * Get user by ID
 */
const getUserById = async (
  userId: string
): Promise<Omit<User, "password"> | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      location: true,
      role: true,
      phoneNumber: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      password: false,
    },
  });

  return user;
};

/**
 * Verify user email (for future email verification feature)
 */
const verifyEmail = async (userId: string): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { isVerified: true },
  });

  logger.info(`User email verified: ${userId}`);
};

/**
 * Verify JWT token and return decoded payload
 */
const verifyAuthToken = (token: string): JwtPayload => {
  return verifyToken(token);
};

/**
 * Check if user has required role
 */
const checkUserRole = (userRole: Role, allowedRoles: Role[]): boolean => {
  return allowedRoles.includes(userRole);
};

/**
 * Check if user is owner or admin
 */
const checkOwnerOrAdmin = (
  userId: string,
  resourceUserId: string,
  userRole: Role
): boolean => {
  return userRole === Role.ADMIN || userId === resourceUserId;
};

/**
 * Change Password ADMIN SIDE Service
 */
const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  // Validate inputs
  const errors: string[] = [];

  if (!currentPassword) {
    errors.push("Current password is required");
  }

  if (!newPassword) {
    errors.push("New password is required");
  } else if (newPassword.length < 8) {
    errors.push("New password must be at least 8 characters long");
  }

  if (errors.length > 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errors.join(", "));
  }

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  // Verify current password
  const isPasswordValid = await comparePassword(currentPassword, user.password);
  if (!isPasswordValid) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      "Current password is incorrect"
    );
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  logger.info(`Password changed for user: ${userId}`);
};

const createAndStoreEmailOtp = async (userId: string) => {
  const code = generateOtpCode(6);
  const codeHash = hashOtp(code);
  const expiresAt = addMinutes(new Date(), OTP_TTL_MINUTES);

  // optional: invalidate old unused OTPs
  await prisma.emailOtp.updateMany({
    where: { userId, purpose: "VERIFY_EMAIL", consumedAt: null },
    data: { consumedAt: new Date() }, // mark old ones as consumed/invalidated
  });

  const otp = await prisma.emailOtp.create({
    data: {
      userId,
      codeHash,
      expiresAt,
      purpose: "VERIFY_EMAIL",
    },
  });

  return { code, otpId: otp.id, expiresAt };
};

const canResendOtp = async (userId: string) => {
  const latest = await prisma.emailOtp.findFirst({
    where: { userId, purpose: "VERIFY_EMAIL", consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!latest) return true;

  const secondsSince = (Date.now() - latest.createdAt.getTime()) / 1000;
  return secondsSince >= OTP_RESEND_COOLDOWN_SECONDS;
};

const verifyEmailOtp = async (userId: string, code: string) => {
  const otp = await prisma.emailOtp.findFirst({
    where: {
      userId,
      purpose: "VERIFY_EMAIL",
      consumedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "OTP not found. Please request a new code."
    );
  }

  if (otp.expiresAt.getTime() < Date.now()) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "OTP expired. Please request a new code."
    );
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      "Too many attempts. Request a new code."
    );
  }

  const incomingHash = hashOtp(code.trim());

  if (incomingHash !== otp.codeHash) {
    await prisma.emailOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid OTP.");
  }

  // success: consume OTP + verify user
  await prisma.$transaction([
    // mark current OTP consumed (optional if you delete all anyway)
    prisma.emailOtp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    }),

    // mark user verified
    prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    }),

    // delete all OTPs for this user/purpose (keeps DB minimal)
    prisma.emailOtp.deleteMany({
      where: { userId, purpose: "VERIFY_EMAIL" },
    }),
  ]);

  return true;
};

// Reset Password Services For User MAIN APP
const RESET_TOKEN_TTL_MINUTES = Number(
  process.env.RESET_TOKEN_TTL_MINUTES || 15
);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const requestPasswordReset = async (email: string) => {
  if (!email) throw new ApiError(StatusCodes.BAD_REQUEST, "Email is required");

  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond success (don’t leak whether user exists)
  if (!user) return;

  if (!user.isActive || user.deletedAt) return;

  const rawToken = generateResetToken();
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = addMinutes(new Date(), RESET_TOKEN_TTL_MINUTES);

  // Optional: invalidate previous unused tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const resetUrl = `${FRONTEND_URL}/reset-password?token=${rawToken}`;

  await sendResetPasswordEmail({
    toEmail: user.email,
    toName: user.name,
    resetUrl,
  });
};

const resetPassword = async (params: {
  token: string;
  newPassword: string;
}) => {
  const { token, newPassword } = params;

  if (!token) throw new ApiError(StatusCodes.BAD_REQUEST, "Token is required");
  if (!newPassword)
    throw new ApiError(StatusCodes.BAD_REQUEST, "New password is required");
  if (newPassword.length < 8) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Password must be at least 8 characters long"
    );
  }

  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.isValid) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      passwordValidation.errors.join(", ")
    );
  }

  const tokenHash = hashResetToken(token);

  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Invalid or already used token"
    );
  }

  if (record.expiresAt.getTime() < Date.now()) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Token expired. Please request again."
    );
  }

  if (!record.user.isActive || record.user.deletedAt) {
    throw new ApiError(StatusCodes.FORBIDDEN, "User account is not active");
  }

  const hashed = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Optional: delete all other reset tokens for this user
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, id: { not: record.id } },
    }),
    // Optional but recommended: revoke refresh tokens to force re-login
    prisma.refreshToken.deleteMany({
      where: { userId: record.userId },
    }),
  ]);
};

export const authService = {
  register,
  login,
  refreshToken,
  logout,
  getUserById,
  verifyEmail,
  verifyAuthToken,
  checkUserRole,
  checkOwnerOrAdmin,
  changePassword,
  verifyEmailOtp,
  resetPassword,
  requestPasswordReset,
};
