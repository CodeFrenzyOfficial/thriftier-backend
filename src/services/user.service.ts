import { User } from "@prisma/client";
import { prisma } from "../config/database";
import { ApiError } from "../utils/ApiError";
import { StatusCodes } from "http-status-codes";

interface PaginationParams {
  page?: number;
  limit?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Get all users with pagination (excluding password)
 */
const getUsers = async (
  params: PaginationParams = {}
): Promise<PaginatedResponse<Omit<User, "password">>> => {
  const page = params.page && params.page > 0 ? params.page : 1;
  const limit = params.limit && params.limit > 0 ? params.limit : 10;
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null, // Only active users
  };

  // Get total count for pagination
  const totalItems = await prisma.user.count({ where });

  // Get paginated users
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      location: true,
      phoneNumber: true,
      role: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      password: false,
    },
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take: limit,
  });

  const totalPages = Math.ceil(totalItems / limit);

  return {
    data: users,
    pagination: {
      page,
      limit,
      totalPages,
      totalItems,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

/**
 * Get user by ID
 */
const getUserById = async (id: string): Promise<Omit<User, "password">> => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      location: true,
      phoneNumber: true,
      role: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      password: false,
    },
  });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  return user;
};

/**
 * Create a new user (Admin only - uses auth service with reqFromAdmin flag)
 */
const createUser = async (payload: {
  name: string;
  email: string;
  location: string;
  password: string;
  phoneNumber: string;
  role?: string;
}): Promise<Omit<User, "password">> => {
  const { authService } = require("./auth.service");
  const { Role } = require("@prisma/client");

  // Use authService.register with reqFromAdmin flag
  // This ensures consistent validation, auto-verification, and no OTP requirement
  const result = await authService.register({
    name: payload.name,
    email: payload.email,
    location: payload.location,
    password: payload.password,
    phoneNumber: payload.phoneNumber,
    role: payload.role || Role.USER,
    reqFromAdmin: true, // Skip OTP, auto-verify user
  });

  // Return the user data (result should be SUCCESS type since reqFromAdmin=true)
  if (result.kind !== "SUCCESS") {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Expected SUCCESS response for admin-created user"
    );
  }

  // Fetch and return the complete user object
  const user = await prisma.user.findUnique({
    where: { id: result.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      location: true,
      phoneNumber: true,
      role: true,
      isActive: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      password: false,
    },
  });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User creation failed");
  }

  return user;
};

/**
 * Update user
 */
const updateUser = async (
  id: string,
  data: Partial<
    Pick<User, "name" | "email" | "location" | "phoneNumber" | "isActive">
  >
): Promise<Omit<User, "password">> => {
  // Check if user exists
  const existingUser = await prisma.user.findUnique({ where: { id } });

  if (!existingUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  // Validate phone number if provided
  if (
    data.phoneNumber &&
    !/^\+?[1-9]\d{1,14}$/.test(data.phoneNumber.replace(/[\s\-\(\)]/g, ""))
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid phone number format");
  }

  // If updating email, check if it's already taken
  if (data.email && data.email !== existingUser.email) {
    const emailTaken = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (emailTaken) {
      throw new ApiError(StatusCodes.CONFLICT, "Email is already in use");
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      location: true,
      phoneNumber: true,
      role: true,
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
 * Delete user (soft delete)
 */
const deleteUser = async (id: string): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  // Soft delete
  await prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });
};

/**
 * Get user statistics
 */
const getUserStats = async (): Promise<{
  totalUsers: number;
  activeUsers: number;
  adminCount: number;
  driverCount: number;
  newUsersThisMonth: number;
}> => {
  const { Role } = require("@prisma/client");

  // Get total users (excluding deleted)
  const totalUsers = await prisma.user.count({
    where: { deletedAt: null },
  });

  // Get active users
  const activeUsers = await prisma.user.count({
    where: {
      isActive: true,
      deletedAt: null,
    },
  });

  // Get admin count
  const adminCount = await prisma.user.count({
    where: {
      role: Role.ADMIN,
      deletedAt: null,
    },
  });

  // Get driver count
  const driverCount = await prisma.user.count({
    where: {
      role: Role.DRIVER,
      deletedAt: null,
    },
  });

  // Get new users this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const newUsersThisMonth = await prisma.user.count({
    where: {
      createdAt: {
        gte: startOfMonth,
      },
      deletedAt: null,
    },
  });

  return {
    totalUsers,
    activeUsers,
    adminCount,
    driverCount,
    newUsersThisMonth,
  };
};

export const userService = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
};
