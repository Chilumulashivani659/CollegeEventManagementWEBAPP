import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, coordinator, logout, initializing } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/coordinator/login', { replace: true });
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark">
      <div className="container">
        <NavLink className="navbar-brand" to="/">
          🎓 College Event Management
        </NavLink>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-lg-center">
            <li className="nav-item">
              <NavLink className="nav-link" to="/" end>
                Home
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/events">
                Browse Events
              </NavLink>
            </li>

            {/* Coordinator navigation is shown only after an active login.
                Students never see a registration or management link here. */}
            {!initializing && isAuthenticated && (
              <>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/manage">
                    Coordinator Dashboard{' '}
                    <span className="badge text-bg-success">Active</span>
                  </NavLink>
                </li>
                <li className="nav-item d-none d-lg-block">
                  <span className="navbar-text small text-white-50 ms-lg-2">
                    {coordinator?.full_name}
                  </span>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className="nav-link btn btn-link"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
