import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="container py-5 text-center">
        <span className="spinner-border text-primary me-2" aria-hidden="true"></span>
        Checking coordinator session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/coordinator/login"
        replace
        state={{
          from: location.pathname,
          message: 'Please log in with an approved coordinator account to manage events.'
        }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
