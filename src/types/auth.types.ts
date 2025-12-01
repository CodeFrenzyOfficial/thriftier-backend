import { Role } from "@prisma/client";

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  location: string;
  phoneNumber: string;
  role?: Role;
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

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    location: string;
    role: Role;
    phoneNumber: string;
  };
  tokens: TokenResponse;
}

export interface RefreshTokenInput {
  refreshToken: string;
}
