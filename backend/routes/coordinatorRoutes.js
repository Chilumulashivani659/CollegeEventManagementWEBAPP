import express from 'express';
import {
  registerCoordinator,
  loginCoordinator,
  getCurrentCoordinator
} from '../controllers/coordinatorController.js';
import { requireApprovedCoordinator } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerCoordinator);
router.post('/login', loginCoordinator);
router.get('/me', requireApprovedCoordinator, getCurrentCoordinator);

export default router;
