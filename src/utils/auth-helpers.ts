import crypto from "crypto";

export const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10);
export const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
export const OTP_RESEND_COOLDOWN_SECONDS = Number(
  process.env.OTP_RESEND_COOLDOWN_SECONDS || 60
);

export function generateOtpCode(length = 6) {
  // 6-digit numeric OTP
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(crypto.randomInt(min, max + 1));
}

export function hashOtp(code: string) {
  const secret = process.env.JWT_SECRET || "sagsa897sah7sah798xxxxa9698s6g";
  if (!secret) throw new Error("Missing env: JWT_SECRET");

  return crypto.createHmac("sha256", secret).update(code).digest("hex");
}

export function addMinutes(date: Date, minutes: number) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}

// Helpers for password reset tokens
export function generateResetToken() {
  // raw token sent in email
  return crypto.randomBytes(32).toString("hex");
}

export function hashResetToken(token: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing env: JWT_SECRET");

  return crypto.createHmac("sha256", secret).update(token).digest("hex");
}
