import { Request, Response } from 'express';
import {
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getAllUsers,
} from '../services/user.service';
import { logger } from '../logger';

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const createUserController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const user = req.body;
    const data = await createUser(user);
    return res.status(201).json(data);
  } catch (error: any) {
    logger.error(`Error creating user: ${error.message}`);
    return res.status(500).send(error.message);
  }
};

export const getAllUsersController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { external } = req.query;
    const externalBool = external === 'true';
    const data = await getAllUsers(externalBool);
    return res.status(200).json(data);
  } catch (error: any) {
    logger.error(`Error fetching users: ${error.message}`);
    return res.status(500).send(error.message);
  }
};

export const getUserController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const data = await getUserById(parseInt(id));
    if (!data) return res.status(404).send('User not found');
    return res.status(200).json(data);
  } catch (error: any) {
    logger.error(`Error fetching user: ${error.message}`);
    return res.status(500).send(error.message);
  }
};

export const updateUserController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const changes = req.body;
    const data = await updateUser(parseInt(id), changes);
    if (!data) return res.status(404).send('User not found');
    return res.status(200).json(data);
  } catch (error: any) {
    logger.error(`Error updating user: ${error.message}`);
    return res.status(500).send(error.message);
  }
};

export const deleteUserController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    await deleteUser(parseInt(id));
    return res.status(204).send();
  } catch (error: any) {
    logger.error(`Error deleting user: ${error.message}`);
    return res.status(500).send(error.message);
  }
};
