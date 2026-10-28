import * as eventService from '../services/eventService.js';

const MAX_LENGTH = 150;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;

const isValidDate = (value) => {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const todayString = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

/**
 * Validate and normalise the request body.
 * Returns { error } when invalid, or { value } when valid.
 */
const validateEvent = (body = {}, { allowPastDate = false } = {}) => {
  const event_name = typeof body.event_name === 'string' ? body.event_name.trim() : '';
  const event_date = typeof body.event_date === 'string' ? body.event_date.trim() : '';
  const venue = typeof body.venue === 'string' ? body.venue.trim() : '';
  const organizer = typeof body.organizer === 'string' ? body.organizer.trim() : '';

  if (!isNonEmptyString(event_name)) return { error: 'Please enter the event name.' };
  if (event_name.length > MAX_LENGTH) return { error: `Event name must be ${MAX_LENGTH} characters or fewer.` };
  if (!isValidDate(event_date)) return { error: 'Please select a valid event date (YYYY-MM-DD).' };
  if (!allowPastDate && event_date < todayString()) {
    return { error: 'Event date cannot be in the past for a new event.' };
  }
  if (!isNonEmptyString(venue)) return { error: 'Please enter the venue.' };
  if (venue.length > MAX_LENGTH) return { error: `Venue must be ${MAX_LENGTH} characters or fewer.` };
  if (!isNonEmptyString(organizer)) return { error: 'Please enter the organizer.' };
  if (organizer.length > MAX_LENGTH) return { error: `Organizer must be ${MAX_LENGTH} characters or fewer.` };

  return { value: { event_name, event_date, venue, organizer } };
};

const parseId = (rawId) => {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const serverError = (res, message, err) => {
  console.error(`${message}:`, err.message);
  return res.status(500).json({ message });
};

// GET /api/events?search=term
export const getEvents = async (req, res) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const events = await eventService.getAllEvents(search);
    res.json(events);
  } catch (err) {
    serverError(res, 'Failed to fetch events', err);
  }
};

// GET /api/events/search?q=term
export const searchEvents = async (req, res) => {
  try {
    const rawQuery = req.query.q ?? req.query.search ?? '';
    const search = typeof rawQuery === 'string' ? rawQuery.trim() : '';

    if (!search) {
      return res.status(400).json({ message: 'Please provide a search term using ?q=...' });
    }

    const events = await eventService.getAllEvents(search);
    res.json(events);
  } catch (err) {
    serverError(res, 'Failed to search events', err);
  }
};

// GET /api/events/:id
export const getEvent = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ message: 'Invalid event ID' });

    const event = await eventService.getEventById(id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    res.json(event);
  } catch (err) {
    serverError(res, 'Failed to fetch event', err);
  }
};

// POST /api/events
export const createEvent = async (req, res) => {
  try {
    const { error, value } = validateEvent(req.body);
    if (error) return res.status(400).json({ message: error });

    const created = await eventService.createEvent(value);
    res.status(201).json(created);
  } catch (err) {
    serverError(res, 'Failed to create event', err);
  }
};

// PUT /api/events/:id
export const updateEvent = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ message: 'Invalid event ID' });

    // Past dates are allowed on update so older events can still be corrected.
    const { error, value } = validateEvent(req.body, { allowPastDate: true });
    if (error) return res.status(400).json({ message: error });

    const updated = await eventService.updateEvent(id, value);
    if (!updated) return res.status(404).json({ message: 'Event not found' });

    res.json(updated);
  } catch (err) {
    serverError(res, 'Failed to update event', err);
  }
};

// DELETE /api/events/:id
export const deleteEvent = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) return res.status(400).json({ message: 'Invalid event ID' });

    const deleted = await eventService.deleteEvent(id);
    if (!deleted) return res.status(404).json({ message: 'Event not found' });

    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    serverError(res, 'Failed to delete event', err);
  }
};
