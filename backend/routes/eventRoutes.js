import express from 'express';
import {
  getEvents,
  searchEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent
} from '../controllers/eventController.js';

const router = express.Router();

// Search must be declared before "/:id" so "search" is not treated as an ID.
router.get('/search', searchEvents);

router.get('/', getEvents);
router.get('/:id', getEvent);
router.post('/', createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);

export default router;
