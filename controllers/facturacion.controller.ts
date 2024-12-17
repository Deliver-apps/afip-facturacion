import { Request, Response } from 'express';
import {
  deleteAllJobsFromAUser,
  getAllJobs,
} from '../services/facturacion.service';
import { logger } from '../logger';

export const getAllJobsController = async (req: Request, res: Response) => {
  try {
    const { external } = req.query;
    const externalBool = external === 'true';
    const jobs = await getAllJobs(externalBool);
    return res.status(200).json(jobs);
  } catch (error: any) {
    logger.error(`Error fetching jobs: ${error.message}`);
    return res.status(500).send(error.message);
  }
};

export const deleteAllJobsController = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    await deleteAllJobsFromAUser(Number(userId));
    return res.status(200).json({ message: 'Jobs deleted successfully' });
  } catch (error: any) {
    logger.error(`Error deleting jobs: ${error.message}`);
    return res.status(500).send(error.message);
  }
};
