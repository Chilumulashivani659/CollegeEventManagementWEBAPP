import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDate, toDateInputValue } from '../utils/formatDate';

const MAX_LENGTH = 150;

const emptyForm = {
  event_name: '',
  event_date: '',
  venue: '',
  organizer: ''
};

const todayString = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

const ManageEvents = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { coordinator, logout } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'danger', text }
  const [formError, setFormError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [viewEvent, setViewEvent] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState('');

  const [eventToDelete, setEventToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const minDate = useMemo(() => todayString(), []);

  const refresh = () => setRefreshKey((key) => key + 1);

  // If the token expires or approval is revoked, clear the session and return
  // to the login page with the server's explanation.
  const handleAuthFailure = useCallback(
    (err) => {
      const status = err.response?.status;
      if (status !== 401 && status !== 403) return false;

      const message =
        err.response?.data?.message || 'Your session has ended. Please log in again.';
      logout();
      navigate('/coordinator/login', { replace: true, state: { message } });
      return true;
    },
    [logout, navigate]
  );

  const handleLogout = () => {
    logout();
    navigate('/coordinator/login', { replace: true });
  };

  // Load events whenever the search term (debounced) or refresh key changes.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await getEvents(search);
        if (cancelled) return;
        setEvents(Array.isArray(res.data) ? res.data : []);
        setLoadError('');
      } catch (err) {
        if (cancelled) return;
        if (handleAuthFailure(err)) return;
        setEvents([]);
        setLoadError(
          err.response?.data?.message ||
            'Unable to load events. Make sure the backend is running on http://localhost:5000.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, search ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, refreshKey, handleAuthFailure]);

  // Open the add form when arriving from /manage?action=add
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openAddForm();
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const validateField = (name, value) => {
    const text = typeof value === 'string' ? value.trim() : '';

    if (name === 'event_name') {
      if (!text) return 'Event name is required.';
      if (text.length > MAX_LENGTH) return `Event name must be ${MAX_LENGTH} characters or fewer.`;
    }

    if (name === 'event_date') {
      if (!text) return 'Event date is required.';
      const [year, month, day] = text.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const valid =
        text.length === 10 &&
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day;
      if (!valid) return 'Enter a valid event date.';
      if (!isEdit && text < todayString()) return 'Event date cannot be in the past for a new event.';
    }

    if (name === 'venue') {
      if (!text) return 'Venue is required.';
      if (text.length > MAX_LENGTH) return `Venue must be ${MAX_LENGTH} characters or fewer.`;
    }

    if (name === 'organizer') {
      if (!text) return 'Organizer is required.';
      if (text.length > MAX_LENGTH) return `Organizer must be ${MAX_LENGTH} characters or fewer.`;
    }

    return '';
  };

  const validateForm = () => {
    const errors = {};
    Object.keys(emptyForm).forEach((name) => {
      const message = validateField(name, form[name]);
      if (message) errors[name] = message;
    });
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    if (formError) setFormError('');
  };

  const openAddForm = () => {
    setIsEdit(false);
    setEditId(null);
    setForm(emptyForm);
    setFieldErrors({});
    setFormError('');
    setFeedback(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEditForm = (ev) => {
    setIsEdit(true);
    setEditId(ev.id);
    setForm({
      event_name: ev.event_name || '',
      event_date: toDateInputValue(ev.event_date),
      venue: ev.venue || '',
      organizer: ev.organizer || ''
    });
    setFieldErrors({});
    setFormError('');
    setFeedback(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormError('Please fix the highlighted fields before saving.');
      setFeedback(null);
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      if (isEdit) {
        await updateEvent(editId, form);
        setFeedback({ type: 'success', text: `"${form.event_name}" was updated successfully.` });
      } else {
        await createEvent(form);
        setFeedback({ type: 'success', text: `"${form.event_name}" was added successfully.` });
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditId(null);
      setIsEdit(false);
      refresh();
    } catch (err) {
      if (handleAuthFailure(err)) return;
      setFormError(err.response?.data?.message || 'Failed to save the event. Please try again.');
      setFeedback(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleView = async (ev) => {
    setViewEvent(ev);
    setViewError('');
    setViewLoading(true);
    try {
      const res = await getEvent(ev.id);
      setViewEvent(res.data);
    } catch (err) {
      if (handleAuthFailure(err)) return;
      setViewError(err.response?.data?.message || 'Unable to load this event.');
    } finally {
      setViewLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    try {
      setDeleting(true);
      await deleteEvent(eventToDelete.id);
      setFeedback({ type: 'success', text: `"${eventToDelete.event_name}" was deleted successfully.` });
      setEventToDelete(null);
      refresh();
    } catch (err) {
      if (handleAuthFailure(err)) return;
      setFeedback({
        type: 'danger',
        text: err.response?.data?.message || 'Failed to delete the event. Please try again.'
      });
      setEventToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div>
          <h1 className="h2 mb-2">Coordinator Dashboard</h1>
          <div className="mb-1">
            <span className="badge text-bg-success fs-6">Approved Coordinator</span>
          </div>
          <p className="text-muted mb-0">
            Signed in as <strong>{coordinator?.full_name}</strong>
            {coordinator?.designation ? ` · ${coordinator.designation}` : ''} — add, view, search,
            update, and delete college events.
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link to="/events" className="btn btn-outline-info">
            Browse Events
          </Link>
          <button type="button" className="btn btn-outline-secondary" onClick={handleLogout}>
            Logout
          </button>
          <button id="add-event-button" className="btn btn-primary" onClick={openAddForm}>
            + Add New Event
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`alert alert-${feedback.type} alert-dismissible fade show`}
          role="alert"
          id="feedback-alert"
        >
          {feedback.text}
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setFeedback(null)}
          ></button>
        </div>
      )}

      {showForm && (
        <div className="card mb-4 shadow-sm" id="event-form-card">
          <div className="card-header bg-white">
            <span className="fw-semibold">{isEdit ? 'Update Event' : 'Add Event'}</span>
          </div>
          <div className="card-body">
            {formError && <div className="alert alert-danger py-2">{formError}</div>}
            <form onSubmit={handleSubmit} noValidate>
              <div className="row g-3">
                <div className="col-md-6">
                  <label htmlFor="event_name" className="form-label">
                    Event Name <span className="text-danger">*</span>
                  </label>
                  <input
                    id="event_name"
                    name="event_name"
                    type="text"
                    className={`form-control ${fieldErrors.event_name ? 'is-invalid' : ''}`}
                    placeholder="e.g., Annual Tech Fest"
                    value={form.event_name}
                    onChange={handleChange}
                    maxLength={MAX_LENGTH}
                  />
                  {fieldErrors.event_name && (
                    <div className="invalid-feedback">{fieldErrors.event_name}</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label htmlFor="event_date" className="form-label">
                    Event Date <span className="text-danger">*</span>
                  </label>
                  <input
                    id="event_date"
                    name="event_date"
                    type="date"
                    className={`form-control ${fieldErrors.event_date ? 'is-invalid' : ''}`}
                    value={form.event_date}
                    onChange={handleChange}
                    min={isEdit ? undefined : minDate}
                  />
                  {fieldErrors.event_date && (
                    <div className="invalid-feedback">{fieldErrors.event_date}</div>
                  )}
                </div>

                <div className="col-md-6">
                  <label htmlFor="venue" className="form-label">
                    Venue <span className="text-danger">*</span>
                  </label>
                  <input
                    id="venue"
                    name="venue"
                    type="text"
                    className={`form-control ${fieldErrors.venue ? 'is-invalid' : ''}`}
                    placeholder="e.g., Main Auditorium"
                    value={form.venue}
                    onChange={handleChange}
                    maxLength={MAX_LENGTH}
                  />
                  {fieldErrors.venue && <div className="invalid-feedback">{fieldErrors.venue}</div>}
                </div>

                <div className="col-md-6">
                  <label htmlFor="organizer" className="form-label">
                    Organizer <span className="text-danger">*</span>
                  </label>
                  <input
                    id="organizer"
                    name="organizer"
                    type="text"
                    className={`form-control ${fieldErrors.organizer ? 'is-invalid' : ''}`}
                    placeholder="e.g., Computer Science Department"
                    value={form.organizer}
                    onChange={handleChange}
                    maxLength={MAX_LENGTH}
                  />
                  {fieldErrors.organizer && (
                    <div className="invalid-feedback">{fieldErrors.organizer}</div>
                  )}
                </div>
              </div>

              <div className="mt-3 d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : isEdit ? (
                    'Update Event'
                  ) : (
                    'Save Event'
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setFieldErrors({});
                    setFormError('');
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-header bg-white">
          <div className="row g-2 align-items-center">
            <div className="col-md-6">
              <label htmlFor="search" className="visually-hidden">
                Search events
              </label>
              <input
                id="search"
                type="search"
                className="form-control"
                placeholder="Search by event name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-6 d-flex justify-content-md-end gap-2">
              {search && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => setSearch('')}
                >
                  Clear Search
                </button>
              )}
              <button className="btn btn-outline-primary" type="button" onClick={refresh}>
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          {loadError && (
            <div className="alert alert-danger m-3 mb-0" role="alert">
              {loadError}
            </div>
          )}

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" id="events-table">
              <thead className="table-light">
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Event Name</th>
                  <th scope="col">Event Date</th>
                  <th scope="col">Venue</th>
                  <th scope="col">Organizer</th>
                  <th scope="col" className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      Loading events...
                    </td>
                  </tr>
                )}

                {!loading && !loadError && events.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-4">
                      {search
                        ? `No events found for "${search}".`
                        : 'No events yet. Click "Add New Event" to create one.'}
                    </td>
                  </tr>
                )}

                {!loading &&
                  events.map((ev) => (
                    <tr key={ev.id}>
                      <td>{ev.id}</td>
                      <td className="fw-semibold">{ev.event_name}</td>
                      <td>{formatDate(ev.event_date)}</td>
                      <td>{ev.venue}</td>
                      <td>{ev.organizer}</td>
                      <td className="text-end text-nowrap">
                        <button
                          type="button"
                          className="btn btn-sm btn-info me-1"
                          onClick={() => handleView(ev)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-warning me-1"
                          onClick={() => openEditForm(ev)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => setEventToDelete(ev)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-footer bg-white text-muted small">
          {loading ? 'Loading...' : `${events.length} event${events.length === 1 ? '' : 's'} shown`}
          {search ? ` for "${search}"` : ''}
        </div>
      </div>

      {/* View event modal */}
      {viewEvent && (
        <>
          <div className="modal show d-block" tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Event Details</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setViewEvent(null)}
                  ></button>
                </div>
                <div className="modal-body">
                  {viewLoading ? (
                    <p className="mb-0">
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      Loading event details...
                    </p>
                  ) : viewError ? (
                    <div className="alert alert-danger mb-0">{viewError}</div>
                  ) : (
                    <dl className="row mb-0">
                      <dt className="col-sm-4">ID</dt>
                      <dd className="col-sm-8">{viewEvent.id}</dd>
                      <dt className="col-sm-4">Event Name</dt>
                      <dd className="col-sm-8">{viewEvent.event_name}</dd>
                      <dt className="col-sm-4">Event Date</dt>
                      <dd className="col-sm-8">{formatDate(viewEvent.event_date)}</dd>
                      <dt className="col-sm-4">Venue</dt>
                      <dd className="col-sm-8">{viewEvent.venue}</dd>
                      <dt className="col-sm-4">Organizer</dt>
                      <dd className="col-sm-8 mb-0">{viewEvent.organizer}</dd>
                    </dl>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setViewEvent(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show"></div>
        </>
      )}

      {/* Delete confirmation modal */}
      {eventToDelete && (
        <>
          <div className="modal show d-block" tabIndex="-1" role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Confirm Delete</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={() => setEventToDelete(null)}
                  ></button>
                </div>
                <div className="modal-body">
                  <p className="mb-1">
                    Are you sure you want to delete <strong>{eventToDelete.event_name}</strong>?
                  </p>
                  <p className="text-muted mb-0">This action cannot be undone.</p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEventToDelete(null)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={confirmDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show"></div>
        </>
      )}
    </div>
  );
};

export default ManageEvents;
