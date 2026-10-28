import express from 'express';
import {
  getEvents,
  searchEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent
} from '../controllers/eventController.js';
import { requireApprovedCoordinator } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public read access for students. No token is required for GET requests.
// Search must be declared before "/:id" so "search" is not treated as an ID.
router.get('/search', searchEvents);
router.get('/', getEvents);
router.get('/:id', getEvent);

// Management operations require a valid token for an approved coordinator.
router.post('/', requireApprovedCoordinator, createEvent);
router.put('/:id', requireApprovedCoordinator, updateEvent);
router.delete('/:id', requireApprovedCoordinator, deleteEvent);

export default router;
