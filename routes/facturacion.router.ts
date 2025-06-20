import { Router } from 'express';
import {
  deleteAllJobsController,
  getAllJobsController,
  makeFailAllJobsController,
} from '../controllers/facturacion.controller';

const router = Router();

router.get('/jobs', getAllJobsController);
router.delete('/jobs/:userId', deleteAllJobsController);
router.post('/jobs/fail', makeFailAllJobsController);

export default router;
