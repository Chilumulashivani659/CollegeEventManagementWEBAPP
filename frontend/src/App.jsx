import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import BrowseEvents from './pages/BrowseEvents';
import CoordinatorRegister from './pages/CoordinatorRegister';
import CoordinatorLogin from './pages/CoordinatorLogin';
import ManageEvents from './pages/ManageEvents';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './styles/custom.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="d-flex flex-column min-vh-100">
          <Navbar />
          <main className="flex-grow-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/events" element={<BrowseEvents />} />
              <Route path="/coordinator/register" element={<CoordinatorRegister />} />
              <Route path="/coordinator/login" element={<CoordinatorLogin />} />
              <Route
                path="/manage"
                element={
                  <ProtectedRoute>
                    <ManageEvents />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
