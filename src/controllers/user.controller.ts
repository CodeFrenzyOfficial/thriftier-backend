import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { userService } from "../services/user.service";
import { catchAsync } from "../utils/catchAsync";

/**
 * Get all users with pagination (Admin only)
 */
const getUsers = catchAsync(async (req: Request, res: Response) => {
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

  const result = await userService.getUsers({ page, limit });

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Users retrieved successfully",
    data: result.data,
    pagination: result.pagination,
    requestedBy: {
      email: req.user!.email,
      role: req.user!.role,
    },
  });
});

/**
 * Create a new user (Admin only)
 */
const createUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, location, password, phoneNumber, role } = req.body;

    const user = await userService.createUser({
      name,
      email,
      location,
      password,
      phoneNumber,
      role,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  }
);

/**
 * Get user by ID (Owner or Admin)
 */
const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await userService.getUserById(id);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "User retrieved successfully",
    data: user,
  });
});

/**
 * Update user (Owner or Admin)
 */
const updateUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  const user = await userService.updateUser(id, updateData);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "User updated successfully",
    data: user,
  });
});

/**
 * Delete user (Admin only)
 */
const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  await userService.deleteUser(id);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "User deleted successfully",
  });
});

export const userController = {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
};
