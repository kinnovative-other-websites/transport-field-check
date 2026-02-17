import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import LogLocation from './pages/LogLocation';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const [auth, setAuth] = useState(null); // null = checking, true/false = result

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setAuth(false);
      return;
    }
    // Verify token with backend
    axios.get('/api/verify-token', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(() => setAuth(true))
    .catch(() => {
      localStorage.removeItem('auth_token');
      setAuth(false);
    });
  }, []);

  if (auth === null) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '1rem', color: '#888', background: '#f5f5f5' }}>
        <div style={{ width: '30px', height: '30px', border: '3px solid #ddd', borderTopColor: '#111', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Verifying session...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!auth) {
    return <Login onLogin={() => setAuth(true)} />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LogLocation />} />
        <Route path="/:branch" element={<LogLocation />} />
        <Route path="/:branch/:route" element={<LogLocation />} />
        <Route path="/admin/dash-board" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={<Navigate to="/admin/dash-board" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
