import { Router } from 'express';
import {
  loadCertificateController,
  getCertificateController,
} from '../controllers/vault.controller';

const router = Router();

router.post('/load-certificate', loadCertificateController);
router.get('/get-certificate/:userId', getCertificateController);

export default router;
