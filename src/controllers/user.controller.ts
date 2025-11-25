import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { userService } from "../services/user.service";
import { catchAsync } from "../utils/catchAsync";

const getUsers = catchAsync(async (_req: Request, res: Response) => {
  const users = await userService.getUsers();
  res.status(StatusCodes.OK).json({ data: users });
});

const createUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, email } = req.body;

    if (!name || !email) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "name and email are required" });
    }

    const user = await userService.createUser({ name, email });
    res.status(StatusCodes.CREATED).json({ data: user });
  }
);

export const userController = {
  getUsers,
  createUser
};
