import dotenv from "dotenv";

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

export const config = {
  nodeEnv: NODE_ENV,
  port: PORT
};
