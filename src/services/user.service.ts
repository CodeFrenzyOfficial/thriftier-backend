import { User } from "../types/user.types";

// In-memory store for demo. Replace with real DB in production.
let users: User[] = [];

const getUsers = async (): Promise<User[]> => {
  return users;
};

const createUser = async (payload: Pick<User, "name" | "email">): Promise<User> => {
  const newUser: User = {
    id: (users.length + 1).toString(),
    name: payload.name,
    email: payload.email,
    createdAt: new Date()
  };

  users.push(newUser);
  return newUser;
};

export const userService = {
  getUsers,
  createUser
};
