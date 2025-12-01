import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { ApiError } from "../utils/ApiError";
import { StatusCodes } from "http-status-codes";
import { JwtPayload } from "../types/auth.types";
import { authService } from "../services/auth.service";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authenticate user - minimalistic middleware
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Access token is required");
    }

    const token = authHeader.substring(7);
    req.user = authService.verifyAuthToken(token);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorize user by roles
 */
export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
      }

      if (!authService.checkUserRole(req.user.role, allowedRoles)) {
        throw new ApiError(StatusCodes.FORBIDDEN, "Access denied");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Optional authentication
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      req.user = authService.verifyAuthToken(token);
    }
    next();
  } catch (error) {
    next();
  }
};

/**
 * Check if user is admin
 */
export const isAdmin = authorize(Role.ADMIN);

/**
 * Check if user is driver or admin
 */
export const isDriverOrAdmin = authorize(Role.DRIVER, Role.ADMIN);

/**
 * Check if user owns the resource or is admin
 */
export const isOwnerOrAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Authentication required");
    }

    const resourceUserId = req.params.userId || req.params.id;
    if (
      !authService.checkOwnerOrAdmin(
        req.user.userId,
        resourceUserId,
        req.user.role
      )
    ) {
      throw new ApiError(StatusCodes.FORBIDDEN, "Access denied");
    }

    next();
  } catch (error) {
    next(error);
  }
};
