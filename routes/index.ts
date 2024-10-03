import { BillController } from '../controllers/bill.controller';
import { Router } from 'express';
import {
  loadCertificateController,
  getCertificateController,
} from '../controllers/vault.controller';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({ storage });

export const router = Router();

router.post('/bill', BillController.createBillController);
router.post(
  '/vault/load-certificate',
  upload.fields([
    {
      name: 'cert',
    },
    {
      name: 'key',
    },
    {
      name: 'userId',
    },
  ]),
  loadCertificateController
);
router.get('/vault/get-certificate/:userId', getCertificateController);
