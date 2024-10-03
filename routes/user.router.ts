import { Router } from 'express';
import {
  createUserController,
  getUserController,
  updateUserController,
  deleteUserController,
  getAllUsersController,
} from '../controllers/user.controller';

const router = Router();

router.post('/users', createUserController);
router.get('/users', getAllUsersController);
router.get('/users/:id', getUserController);
router.put('/users/:id', updateUserController);
router.delete('/users/:id', deleteUserController);

export default router;
