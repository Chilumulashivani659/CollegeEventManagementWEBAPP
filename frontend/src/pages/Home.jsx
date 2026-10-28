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
  const past = events.filter((ev) => new Date(`${String(ev.event_date).slice(0, 10)}T00:00:00`) < today);

  return (
    <div>
      <section className="hero text-white py-5">
        <div className="container py-3">
          <div className="row align-items-center g-4">
            <div className="col-lg-8">
              <h1 className="display-5 fw-bold">College Event Management System</h1>
              <p className="lead mt-3 mb-0">
                Manage seminars, workshops, cultural programs, technical competitions, and
                hackathons in one place. Add, view, search, update, and delete event records
                stored in MySQL.
              </p>
            </div>
            <div className="col-lg-4 text-lg-end">
              <Link to="/manage" className="btn btn-light btn-lg me-2 mb-2">
                Manage Events
              </Link>
              <Link to="/manage?action=add" className="btn btn-outline-light btn-lg mb-2">
                Add New Event
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
                  <p className="display-6 fw-bold mb-0 text-success">{loading ? '—' : upcoming.length}</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card text-center h-100 stat-card">
                <div className="card-body">
                  <h5 className="card-title text-muted">Past Events</h5>
                  <p className="display-6 fw-bold mb-0 text-secondary">{loading ? '—' : past.length}</p>
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
              <Link to="/manage" className="btn btn-sm btn-outline-primary">
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
                  No upcoming events yet. Use{' '}
                  <Link to="/manage?action=add">Add New Event</Link> to create one.
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
          <h2 className="h4 mb-3">Features</h2>
          <div className="row g-3">
            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-body">
                  <h5>Add &amp; Manage</h5>
                  <p className="mb-0">Create, update, and delete event records with validation.</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-body">
                  <h5>Search</h5>
                  <p className="mb-0">Find events by name using a case-insensitive partial search.</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-body">
                  <h5>MySQL Storage</h5>
                  <p className="mb-0">All records are stored persistently in a MySQL database.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
