import React, { useState } from 'react';
import axios from 'axios';
import { Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/login', { username, password });
      localStorage.setItem('auth_token', res.data.token);
      onLogin(res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f5f5f5', padding: '1rem'
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-6px); } 40%, 80% { transform: translateX(6px); } }
        .login-card { animation: fadeUp 0.4s ease forwards; }
        .login-input { width: 100%; padding: 12px 12px 12px 42px; border-radius: 8px; border: 1px solid #ddd; font-size: 0.95rem; outline: none; transition: border-color 0.2s, box-shadow 0.2s; background: #fafafa; }
        .login-input:focus { border-color: #111; box-shadow: 0 0 0 3px rgba(0,0,0,0.06); background: #fff; }
        .login-btn { width: 100%; padding: 13px; border-radius: 8px; border: none; background: #111; color: #fff; font-size: 1rem; font-weight: 700; cursor: pointer; transition: all 0.2s; letter-spacing: -0.01em; }
        .login-btn:hover { background: #333; }
        .login-btn:active { transform: scale(0.98); }
        .login-btn:disabled { background: #999; cursor: not-allowed; }
        .shake { animation: shake 0.4s ease; }
      `}</style>

      <div className="login-card" style={{
        background: '#fff', borderRadius: '16px', padding: '2.5rem 2rem', width: '100%', maxWidth: '400px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.08)', border: '1px solid #e5e5e5'
      }}>
        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px', background: '#111',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem'
          }}>
            <Lock size={24} color="white" />
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 700, color: '#111' }}>
            Dashboard Login
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#888' }}>
            Enter your credentials to continue
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="shake" style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
            background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca',
            marginBottom: '1.25rem', fontSize: '0.85rem', color: '#dc2626', fontWeight: 500
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
              <input
                type="text"
                className="login-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#555', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                style={{ paddingRight: '42px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#aaa',
                  display: 'flex'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
