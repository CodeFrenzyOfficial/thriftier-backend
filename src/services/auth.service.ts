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
} from "../types/auth.types";
import { logger } from "../utils/logger";

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
  } = input;

  // Validate required fields
  const errors: string[] = [];

  if (!email) {
    errors.push("Email is required");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Invalid email format");
  }

  if (!password) {
    errors.push("Password is required");
  } else if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  } else {
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }
  }
  if (!phoneNumber) {
    errors.push("Phone number is required");
  } else if (
    !/^\+?[1-9]\d{1,14}$/.test(phoneNumber.replace(/[\s\-\(\)]/g, ""))
  ) {
    errors.push("Invalid phone number format");
  }

  if (!name) {
    errors.push("Name is required");
  } else if (name.trim().length < 2) {
    errors.push("Name must be at least 2 characters long");
  }

  if (!location) {
    errors.push("Location is required");
  } else if (location.trim().length < 2) {
    errors.push("Location must be at least 2 characters long");
  }

  if (errors.length > 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errors.join(", "));
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "User with this email already exists"
    );
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      location,
      phoneNumber,
      role,
    },
  });

  logger.info(`New user registered: ${user.email} with role ${user.role}`);

  // Generate tokens
  const jwtPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    location: user.location,
    phoneNumber: user.phoneNumber,
  };

  const tokens = generateTokenPair(jwtPayload);

  // Store refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      location: user.location,
      role: user.role,
      phoneNumber: user.phoneNumber,
    },
    tokens,
  };
};

/**
 * Login user and return JWT tokens
 */
const login = async (input: LoginInput): Promise<AuthResponse> => {
  const { email, password } = input;

  // Validate required fields
  const errors: string[] = [];

  if (!email) {
    errors.push("Email is required");
  }

  if (!password) {
    errors.push("Password is required");
  }

  if (errors.length > 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, errors.join(", "));
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
  }

  // Check if user is active
  if (!user.isActive) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "Your account has been deactivated"
    );
  }

  // Check if user is soft deleted
  if (user.deletedAt) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Your account has been deleted");
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid email or password");
  }

  logger.info(`User logged in: ${user.email}`);

  // Generate tokens
  const jwtPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    location: user.location,
    phoneNumber: user.phoneNumber,
  };

  const tokens = generateTokenPair(jwtPayload);

  // Store refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      token: tokens.refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      location: user.location,
      role: user.role,
      phoneNumber: user.phoneNumber,
    },
    tokens,
  };
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
};
