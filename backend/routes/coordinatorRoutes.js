import express from 'express';
import {
  registerCoordinator,
  loginCoordinator,
  getCurrentCoordinator
} from '../controllers/coordinatorController.js';
import { requireActiveCoordinator } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public registration is allowed only for identities already present in the
// authorized_coordinators table. There is no public endpoint for adding or
// editing that table.
router.post('/register', registerCoordinator);
router.post('/login', loginCoordinator);
router.get('/me', requireActiveCoordinator, getCurrentCoordinator);

export default router;
