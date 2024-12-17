import { Router } from 'express';
import {
  loadCertificateController,
  getCertificateController,
  getCertificateControllerOk,
} from '../controllers/vault.controller';

const router = Router();

router.post('/load-certificate', loadCertificateController);
router.get('/get-certificate/:userId', getCertificateController);
router.get('/get-ok/:username', getCertificateControllerOk);

export default router;
