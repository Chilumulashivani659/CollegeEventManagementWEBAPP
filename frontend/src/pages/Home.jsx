import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEvents } from '../services/api';
import { formatDate } from '../utils/formatDate';

const Home = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await getEvents();
        if (!cancelled) setEvents(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              'Unable to load events. Make sure the backend is running on http://localhost:5000.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEvents();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = events
    .filter((ev) => new Date(`${String(ev.event_date).slice(0, 10)}T00:00:00`) >= today)
    .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)));
  const past = events.filter(
    (ev) => new Date(`${String(ev.event_date).slice(0, 10)}T00:00:00`) < today
  );

  return (
    <div>
      <section className="hero text-white py-5">
        <div className="container py-3">
          <div className="row align-items-center g-4">
            <div className="col-lg-8">
              <h1 className="display-5 fw-bold">College Event Management System</h1>
              <p className="lead mt-3 mb-0">
                Students can browse and search college events. Faculty can add, view, search,
                update, and delete event records stored in MySQL.
              </p>
            </div>
            <div className="col-lg-4 text-lg-end">
              <Link to="/events" className="btn btn-light btn-lg me-2 mb-2">
                Browse Events
              </Link>
              <Link to="/manage" className="btn btn-outline-light btn-lg mb-2">
                Faculty: Manage Events
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-4">
        <div className="container">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="card text-center h-100 stat-card">
                <div className="card-body">
                  <h5 className="card-title text-muted">Total Events</h5>
                  <p className="display-6 fw-bold mb-0">{loading ? '—' : events.length}</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-center h-100 stat-card">
                <div className="card-body">
                  <h5 className="card-title text-muted">Upcoming Events</h5>
                  <p className="display-6 fw-bold mb-0 text-success">
                    {loading ? '—' : upcoming.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-center h-100 stat-card">
                <div className="card-body">
                  <h5 className="card-title text-muted">Past Events</h5>
                  <p className="display-6 fw-bold mb-0 text-secondary">
                    {loading ? '—' : past.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-4">
        <div className="container">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="card h-100 border-start border-info border-4">
                <div className="card-body">
                  <h2 className="h5">For Students</h2>
                  <p>
                    Browse all college events, search by event name, and view complete details
                    including date, venue, and organizer.
                  </p>
                  <Link to="/events" className="btn btn-info">
                    Browse &amp; Search Events
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100 border-start border-primary border-4">
                <div className="card-body">
                  <h2 className="h5">For Faculty</h2>
                  <p>
                    Add new events, view and search existing events, update event details, and
                    delete events that are no longer required.
                  </p>
                  <Link to="/manage" className="btn btn-primary">
                    Manage Events
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-4">
        <div className="container">
          <div className="card shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <h2 className="h4 mb-0">Upcoming Events</h2>
              <Link to="/events" className="btn btn-sm btn-outline-primary">
                View all events
              </Link>
            </div>
            <div className="card-body p-0">
              {loading && (
                <p className="p-3 mb-0">
                  <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
                  Loading events...
                </p>
              )}

              {!loading && error && (
                <div className="alert alert-danger m-3 mb-0">
                  {error}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger ms-3"
                    onClick={() => setRefreshKey((key) => key + 1)}
                  >
                    Try again
                  </button>
                </div>
              )}

              {!loading && !error && upcoming.length === 0 && (
                <p className="text-muted p-3 mb-0">
                  No upcoming events yet. Faculty can add one from the{' '}
                  <Link to="/manage?action=add">Manage Events</Link> page.
                </p>
              )}

              {!loading && !error && upcoming.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col">Event Name</th>
                        <th scope="col">Date</th>
                        <th scope="col">Venue</th>
                        <th scope="col">Organizer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcoming.slice(0, 5).map((ev) => (
                        <tr key={ev.id}>
                          <td className="fw-semibold">{ev.event_name}</td>
                          <td>{formatDate(ev.event_date)}</td>
                          <td>{ev.venue}</td>
                          <td>{ev.organizer}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="pb-4">
        <div className="container">
          <div className="alert alert-secondary mb-0">
            <strong>Simple role-based pages:</strong> the student page is read-only, while the
            faculty page provides the full Add, View, Search, Update, and Delete workflow. No login
            is required, as authentication is outside the scope of this assignment.
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
