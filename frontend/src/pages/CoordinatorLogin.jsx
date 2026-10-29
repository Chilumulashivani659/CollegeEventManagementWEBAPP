import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CoordinatorLogin = () => {
  const { login, isAuthenticated, initializing } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const infoMessage = location.state?.message;
  const redirectTo = location.state?.from || '/manage';

  if (!initializing && isAuthenticated) {
    return <Navigate to="/manage" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your college email and password.');
      return;
    }

    try {
      setSubmitting(true);
      await login(email.trim().toLowerCase(), password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.message ||
          'Unable to log in. Please check that the backend is running and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-4 py-lg-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="mb-4">
            <Link to="/" className="small text-decoration-none">
              ← Back to Home
            </Link>
            <h1 className="h2 mt-2 mb-1">Coordinator Login</h1>
            <p className="text-muted mb-0">
              Log in with your registered Faculty or Student Council Member account to manage
              events.
            </p>
          </div>

          {infoMessage && (
            <div className="alert alert-info" role="status">
              {infoMessage}
            </div>
          )}

          <div className="card shadow-sm">
            <div className="card-body p-4">
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label htmlFor="login-email" className="form-label">
                    College Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    placeholder="name@college.edu"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="login-password" className="form-label">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        aria-hidden="true"
                      ></span>
                      Logging in...
                    </>
                  ) : (
                    'Login'
                  )}
                </button>
              </form>

              <hr />
              <p className="text-center text-muted small mb-0">
                New coordinator? <Link to="/coordinator/register">Register here</Link>
              </p>
            </div>
          </div>

          <div className="alert alert-light border mt-3 mb-0 small">
            Students do not need an account. Use the{' '}
            <Link to="/events">Browse Events</Link> page to view and search events.
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoordinatorLogin;
