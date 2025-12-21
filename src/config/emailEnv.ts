type EmailEnv = {
  SENDGRID_API_KEY: string;
  SENDGRID_FROM_EMAIL: string;
  SENDGRID_FROM_NAME: string;
  SENDGRID_REPLY_TO?: string;
  NODE_ENV?: string;
};

function requireEnv(key: keyof EmailEnv): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

export const emailEnv = {
  SENDGRID_API_KEY: requireEnv("SENDGRID_API_KEY"),
  SENDGRID_FROM_EMAIL: requireEnv("SENDGRID_FROM_EMAIL"),
  SENDGRID_FROM_NAME: process.env.SENDGRID_FROM_NAME || "App",
  SENDGRID_REPLY_TO: process.env.SENDGRID_REPLY_TO,
  NODE_ENV: process.env.NODE_ENV,
} as const;