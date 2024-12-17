import { Router } from 'express';
import {
  deleteAllJobsController,
  getAllJobsController,
} from '../controllers/facturacion.controller';

const router = Router();

router.get('/jobs', getAllJobsController);
router.delete('/jobs/:userId', deleteAllJobsController);

export default router;
