import React, { useEffect, useMemo, useState } from 'react';
import { getEvents, getEvent } from '../services/api';
import { formatDate } from '../utils/formatDate';

const todayString = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

/**
 * Public, read-only event list for students.
 * Students can view upcoming events, search by name, and open details.
 * There are intentionally no management controls and no coordinator links here.
 */
const BrowseEvents = () => {
  const [events, setEvents] = useState([]);
  const [search, setSearch] = useState('');
  const [includePast, setIncludePast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [viewEvent, setViewEvent] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState('');

  const today = useMemo(() => todayString(), []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getEvents(search);
        if (!cancelled) setEvents(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (!cancelled) {
          setEvents([]);
          setError(
            err.response?.data?.message ||
              'Unable to load events. Make sure the backend is running on http://localhost:5000.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, search ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, refreshKey]);

  const visibleEvents = useMemo(() => {
    if (includePast) return events;
    return events.filter((ev) => String(ev.event_date).slice(0, 10) >= today);
  }, [events, includePast, today]);

  const handleView = async (ev) => {
    setViewEvent(ev);
    setViewError('');
    setViewLoading(true);
    try {
      const res = await getEvent(ev.id);
      setViewEvent(res.data);
    } catch (err) {
      setViewError(err.response?.data?.message || 'Unable to load this event.');
    } finally {
      setViewLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div>
          <h1 className="h2 mb-1">Browse Events</h1>
          <p className="text-primary fw-semibold mb-1">Student view — read-only</p>
          <p className="text-muted mb-0">
            View upcoming events and search by name. This page needs no login.
          </p>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-white">
          <div className="row g-2 align-items-center">
            <div className="col-md-6">
              <label htmlFor="student-search" className="visually-hidden">
                Search events
              </label>
              <input
                id="student-search"
                type="search"
                className="form-control"
                placeholder="Search by event name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <div className="d-flex flex-wrap justify-content-md-end align-items-center gap-3">
                <div className="form-check form-switch mb-0">
                  <input
                    id="include-past-events"
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={includePast}
                    onChange={(e) => setIncludePast(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="include-past-events">
                    Include past events
                  </label>
                </div>
                {search && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setSearch('')}
                  >
                    Clear Search
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => setRefreshKey((key) => key + 1)}
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          {error && (
            <div className="alert alert-danger m-3 mb-0" role="alert">
              {error}
            </div>
          )}

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" id="browse-events-table">
              <thead className="table-light">
                <tr>
                  <th scope="col">Event Name</th>
                  <th scope="col">Event Date</th>
                  <th scope="col">Venue</th>
                  <th scope="col">Organizer</th>
                  <th scope="col" className="text-end">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="5" className="text-center py-4">
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                      Loading events...
                    </td>
                  </tr>
                )}

                {!loading && !error && visibleEvents.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-4">
                      {search
                        ? `No ${includePast ? '' : 'upcoming '}events found for "${search}". Try a different event name.`
                        : includePast
                          ? 'No events are available yet.'
                          : 'No upcoming events are scheduled yet. Turn on "Include past events" to see older events.'}
                    </td>
                  </tr>
                )}

                {!loading &&
                  visibleEvents.map((ev) => (
                    <tr key={ev.id}>
                      <td className="fw-semibold">{ev.event_name}</td>
                      <td>{formatDate(ev.event_date)}</td>
                      <td>{ev.venue}</td>
                      <td>{ev.organizer}</td>
                      <td className="text-end text-nowrap">
                        <button
                          type="button"
                          className="btn btn-sm btn-info"
                          onClick={() => handleView(ev)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-footer bg-white text-muted small">
          {loading
            ? 'Loading...'
            : `${visibleEvents.length} ${includePast ? 'event' : 'upcoming event'}${
                visibleEvents.length === 1 ? '' : 's'
              } shown`}
          {search ? ` for "${search}"` : ''}
        </div>
      </div>

      <div className="alert alert-light border mt-3 mb-0">
        <strong>Students:</strong> search for an event by name, then click <strong>View</strong> to
        see its date, venue, and organizer. Students cannot add, update, or delete events.
      </div>

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
    </div>
  );
};

export default BrowseEvents;
