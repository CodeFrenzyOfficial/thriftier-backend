import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

const getHealth = (_req: Request, res: Response) => {
  return res.status(StatusCodes.OK).json({
    status: "ok",
    service: "api",
    timestamp: new Date().toISOString()
  });
};

export const healthController = {
  getHealth
};
