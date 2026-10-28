import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEvents } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatDate';

const Home = () => {
  const { coordinator } = useAuth();
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
          setEvents([]);
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

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const upcoming = useMemo(
    () =>
      events
        .filter(
          (ev) => new Date(`${String(ev.event_date).slice(0, 10)}T00:00:00`) >= today
        )
        .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date))),
    [events, today]
  );

  return (
    <div>
      <section className="hero text-white py-5">
        <div className="container py-4">
          <div className="row align-items-center g-4">
            <div className="col-lg-8">
              <span className="badge bg-light text-dark mb-3">College events in one place</span>
              <h1 className="display-4 fw-bold">College Event Management System</h1>
              <p className="lead mt-3 mb-0">
                Discover college events and keep track of upcoming activities.
              </p>
            </div>
            <div className="col-lg-4">
              <div className="hero-panel rounded-3 p-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-white-50">Total events</span>
                  <span className="h4 mb-0">{loading ? '—' : events.length}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-white-50">Upcoming events</span>
                  <span className="h4 mb-0">{loading ? '—' : upcoming.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: Event Coordinators */}
      <section
        className="py-5"
        id="event-coordinators"
        aria-labelledby="coordinators-heading"
      >
        <div className="container">
          <div className="card coordinator-card shadow-sm">
            <div className="card-body p-4 p-lg-5">
              <div className="row align-items-center g-4">
                <div className="col-lg-8">
                  <span className="section-kicker">For Faculty &amp; Authorized Student Council Members</span>
                  <h2 id="coordinators-heading" className="h2 mt-2 mb-3">
                    Event Coordinators
                  </h2>
                  <p className="mb-2">
                    Coordinate college events from planning to completion. Approved coordinators
                    can add events, view and search them, update details, and remove events that
                    are no longer required.
                  </p>
                  <p className="text-muted mb-3">
                    Registration is limited to Faculty members and authorized Student Council
                    Members. New accounts remain <strong>pending</strong> until approved by the
                    event administrator, and only approved coordinators can manage events.
                  </p>

                  {coordinator && (
                    <div className="alert alert-success py-2 mb-0" role="status">
                      Signed in as <strong>{coordinator.full_name}</strong> ({coordinator.designation}).
                      Your coordinator account is approved.
                    </div>
                  )}
                </div>
                <div className="col-lg-4">
                  <div className="d-grid gap-2">
                    <Link
                      to="/coordinator/register"
                      className="btn btn-primary btn-lg"
                      id="coordinator-registration-button"
                    >
                      Coordinator Registration
                    </Link>
                    <Link
                      to="/coordinator/login"
                      className="btn btn-outline-primary btn-lg"
                      id="coordinator-login-button"
                    >
                      Coordinator Login
                    </Link>
                    {coordinator && (
                      <Link to="/manage" className="btn btn-success btn-lg">
                        Open Coordinator Dashboard
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Students */}
      <section
        className="py-5 bg-white border-top border-bottom"
        id="students"
        aria-labelledby="students-heading"
      >
        <div className="container">
          <div className="card student-card shadow-sm">
            <div className="card-body p-4 p-lg-5">
              <div className="row align-items-center g-4">
                <div className="col-lg-8">
                  <span className="section-kicker text-info">For all students</span>
                  <h2 id="students-heading" className="h2 mt-2 mb-3">
                    Students
                  </h2>
                  <p className="mb-2">
                    Browse upcoming college events and search by event name. Open any event to see
                    its date, venue, and organizer.
                  </p>
                  <p className="text-muted mb-0">
                    No student account or login is needed. This view is read-only, so students
                    cannot add, update, or delete events.
                  </p>
                </div>
                <div className="col-lg-4 text-lg-end">
                  <Link to="/events" className="btn btn-info btn-lg" id="browse-events-button">
                    Browse Events
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-5">
        <div className="container">
          <div className="card shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
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
                <p className="text-muted p-3 mb-0">No upcoming events are scheduled yet.</p>
              )}

              {!loading && !error && upcoming.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" id="home-upcoming-events">
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
    </div>
  );
};

export default Home;
