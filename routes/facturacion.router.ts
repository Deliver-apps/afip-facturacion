import { Router } from 'express';
import { getAllJobsController } from '../controllers/facturacion.controller';

const router = Router();

router.get('/jobs', getAllJobsController);

export default router;
