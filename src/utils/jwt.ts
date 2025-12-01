import * as jwt from "jsonwebtoken";
import { JwtPayload } from "../types/auth.types";
import { ApiError } from "./ApiError";
import { StatusCodes } from "http-status-codes";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION || "1h"; // Changed from 15m to 1h
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || "7d";

/**
 * Generate JWT access token
 */
export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRATION as string,
    issuer: "thrifter-api",
    audience: "thrifter-app",
  } as jwt.SignOptions);
};

/**
 * Generate JWT refresh token
 */
export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRATION as string,
    issuer: "thrifter-api",
    audience: "thrifter-app",
  } as jwt.SignOptions);
};

/**
 * Verify and decode JWT token
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: "thrifter-api",
      audience: "thrifter-app",
    }) as JwtPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Token has expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid token");
    }
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Token verification failed");
  }
};

/**
 * Decode token without verification (for debugging)
 */
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
};

/**
 * Generate both access and refresh tokens
 */
export const generateTokenPair = (payload: JwtPayload) => {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};
