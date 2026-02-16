import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LogLocation from './pages/LogLocation';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LogLocation />} />
        <Route path="/:branch" element={<LogLocation />} />
        <Route path="/:branch/:route" element={<LogLocation />} />
        <Route path="/admin/dash-board" element={<Dashboard />} />
        <Route path="/dashboard" element={<Navigate to="/admin/dash-board" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
