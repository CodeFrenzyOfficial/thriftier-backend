import { Role } from "@prisma/client";

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  location: string;
  phoneNumber: string;
  role?: Role;
  reqFromAdmin?: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
  location: string;
  phoneNumber: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export type SafeUser = {
  id: string;
  email: string;
  name: string;
  location: string;
  role: Role;
  phoneNumber: string;
  isVerified: boolean;
};

export type AuthSuccessResponse = {
  kind: "SUCCESS";
  user: SafeUser;
  tokens: TokenResponse;
};

export type OtpRequiredResponse = {
  kind: "OTP_REQUIRED";
  user: SafeUser;
  otpRequired: true;
};

export type AuthResponse = AuthSuccessResponse | OtpRequiredResponse;

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface VerifyOtpInput {
  email: string;
  code: string;
}

export interface ResendOtpInput {
  email: string;
}
