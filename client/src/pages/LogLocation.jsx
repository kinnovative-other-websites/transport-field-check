import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Search, RefreshCw, Check, ChevronDown, X, CheckCircle, AlertCircle, Info, BookOpen, Hash, Route } from 'lucide-react';

export default function LogLocation() {
  const { branch, route } = useParams();
  const navigate = useNavigate();
  
  const [students, setStudents] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [search, setSearch] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);

  // Toast notifications
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  const showToast = useCallback((message, type = 'success') => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const decodedBranch = decodeURIComponent(branch || '');
  const decodedRoute = route ? decodeURIComponent(route) : 'All Routes';

  useEffect(() => {
    fetchRoutes();
    fetchStudents();
  }, [branch, route]);

  useEffect(() => {
    const lowerSearch = search.toLowerCase();
    setFilteredStudents(
      students.filter(s => 
        s.student_name.toLowerCase().includes(lowerSearch) || 
        s.student_code.toLowerCase().includes(lowerSearch)
      )
    );
  }, [search, students]);

  const fetchRoutes = async () => {
    try {
      const res = await axios.get(`/api/routes/${decodedBranch}`);
      setRoutes(res.data);
    } catch (err) {
      console.error("Failed to fetch routes", err);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      let url = `/api/students/${decodedBranch}`;
      if (route) url += `/${decodeURIComponent(route)}`;
      const res = await axios.get(url);
      setStudents(res.data);
      setSelectedStudents([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRouteChange = (e) => {
    const value = e.target.value;
    if (value === 'All Routes') {
      navigate(`/${branch}`);
    } else {
      navigate(`/${branch}/${encodeURIComponent(value)}`);
    }
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.student_code));
    }
  };

  const handleSelect = (code) => {
    if (selectedStudents.includes(code)) {
      setSelectedStudents(selectedStudents.filter(s => s !== code));
    } else {
      setSelectedStudents([...selectedStudents, code]);
    }
  };

  const handleLogLocation = () => {
    if (selectedStudents.length === 0) return;
    setLogging(true);
    if (!navigator.geolocation) {
      showToast('Geolocation not supported', 'error');
      setLogging(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        await axios.post('/api/log-location', {
          student_codes: selectedStudents,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          branch_name: decodedBranch
        });
        showToast(`Location logged for ${selectedStudents.length} student(s)!`, 'success');
        setSelectedStudents([]);
        fetchStudents();
      } catch (e) {
        showToast('Failed to log location.', 'error');
      } finally {
        setLogging(false);
      }
    }, () => {
      showToast('Location permission denied', 'error');
      setLogging(false);
    });
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem', color: '#888', background: '#f5f5f5' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid #ddd', borderTopColor: '#111', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Loading...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const allSelected = selectedStudents.length === filteredStudents.length && filteredStudents.length > 0;

  return (
    <div style={{ paddingBottom: '100px', background: '#f5f5f5', minHeight: '100vh' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastSlideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .log-card { animation: fadeUp 0.25s ease forwards; }
        .log-card:active { transform: scale(0.98); }
        .toast-item { animation: toastSlideIn 0.3s ease forwards; }
      `}</style>

      {/* ══ Sticky Header ══ */}
      <div style={{
        background: '#fff', padding: '14px 16px', borderBottom: '1px solid #e5e5e5',
        position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}>
        {/* Top Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1.2rem', color: '#111' }}>
              <MapPin size={20} />
              Tag Location
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{
                fontSize: '0.7rem', fontWeight: 600, background: '#111', color: '#fff',
                padding: '2px 8px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.3px'
              }}>{decodedBranch}</span>
              <span style={{ fontSize: '0.78rem', color: '#888' }}>{filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <button
            onClick={fetchStudents}
            style={{
              background: '#f5f5f5', border: '1px solid #e5e5e5', padding: '8px',
              borderRadius: '8px', color: '#555', cursor: 'pointer', display: 'flex'
            }}
          >
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Route Filter */}
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888', pointerEvents: 'none' }} />
          <select
            value={decodedRoute}
            onChange={handleRouteChange}
            style={{
              width: '100%', padding: '10px 36px 10px 12px', borderRadius: '8px',
              border: '1px solid #ddd', background: '#fff', fontSize: '0.9rem',
              outline: 'none', appearance: 'none', cursor: 'pointer', fontWeight: 500, color: '#333'
            }}
          >
            <option value="All Routes">All Routes</option>
            {routes.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
          <input
            type="text"
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px',
              border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none', background: '#fafafa'
            }}
          />
          {search && (
            <X
              size={16}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#aaa', cursor: 'pointer' }}
              onClick={() => setSearch('')}
            />
          )}
        </div>
      </div>

      {/* ══ Select All Bar ══ */}
      {filteredStudents.length > 0 && (
        <div style={{
          padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#fff', borderBottom: '1px solid #e5e5e5'
        }}>
          <span style={{ fontSize: '0.78rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Student List
          </span>
          <div
            onClick={handleSelectAll}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#111', fontWeight: 600, cursor: 'pointer' }}
          >
            {allSelected ? 'Deselect All' : 'Select All'}
            <div style={{
              width: '20px', height: '20px', borderRadius: '4px', border: '2px solid',
              borderColor: allSelected ? '#111' : '#ccc', background: allSelected ? '#111' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
            }}>
              {allSelected && <Check size={13} color="white" />}
            </div>
          </div>
        </div>
      )}

      {/* ══ Student Cards ══ */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredStudents.map((student, i) => {
          const isSelected = selectedStudents.includes(student.student_code);
          return (
            <div
              key={student.student_code}
              className="log-card"
              onClick={() => handleSelect(student.student_code)}
              style={{
                background: '#fff', borderRadius: '12px', padding: '14px',
                border: `2px solid ${isSelected ? '#111' : '#e5e5e5'}`,
                boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'all 0.15s', display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer',
                animationDelay: `${i * 0.03}s`
              }}
            >
              {/* Checkbox */}
              <div style={{
                width: '22px', height: '22px', borderRadius: '6px', border: '2px solid',
                borderColor: isSelected ? '#111' : '#ccc', background: isSelected ? '#111' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s'
              }}>
                {isSelected && <Check size={14} color="white" />}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Student Name */}
                <div style={{ fontWeight: 600, fontSize: '1rem', color: '#111', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {student.student_name}
                </div>

                {/* Details Grid: Code, Class/Section, Route */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {/* Student Code */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '0.75rem', fontWeight: 600, color: '#555', background: '#f5f5f5',
                    padding: '2px 8px', borderRadius: '6px', border: '1px solid #e5e5e5',
                    fontFamily: 'monospace'
                  }}>
                    <Hash size={11} /> {student.student_code}
                  </span>

                  {/* Class / Section */}
                  {student.section_name && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '0.75rem', fontWeight: 500, color: '#555', background: '#f5f5f5',
                      padding: '2px 8px', borderRadius: '6px', border: '1px solid #e5e5e5'
                    }}>
                      <BookOpen size={11} /> {student.section_name}
                    </span>
                  )}

                  {/* Route */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '0.75rem', fontWeight: 500, color: '#555', background: '#f5f5f5',
                    padding: '2px 8px', borderRadius: '6px', border: '1px solid #e5e5e5'
                  }}>
                    <Route size={11} /> {student.route_name}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {filteredStudents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#aaa' }}>
            <Search size={44} style={{ opacity: 0.15, margin: '0 auto 1rem', display: 'block' }} />
            <p style={{ margin: 0, fontWeight: 500, color: '#888' }}>No students found</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#bbb' }}>
              {search ? `No match for "${search}"` : 'No data available'}
            </p>
          </div>
        )}
      </div>

      {/* ══ Sticky Bottom Action Bar ══ */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff',
        padding: '12px 16px', boxShadow: '0 -2px 10px rgba(0,0,0,0.06)',
        borderTop: '1px solid #e5e5e5', zIndex: 100
      }}>
        <button
          onClick={handleLogLocation}
          disabled={logging || selectedStudents.length === 0}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '14px', borderRadius: '10px', border: 'none', fontSize: '1rem', fontWeight: 700,
            background: selectedStudents.length > 0 ? '#111' : '#ddd',
            color: selectedStudents.length > 0 ? '#fff' : '#aaa',
            cursor: selectedStudents.length > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s', letterSpacing: '-0.01em'
          }}
        >
          {logging ? (
            <>
              <RefreshCw size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Processing...
            </>
          ) : (
            <>
              <MapPin size={18} />
              {selectedStudents.length > 0
                ? `Mark ${selectedStudents.length} Location${selectedStudents.length !== 1 ? 's' : ''} as Pick / Drop`
                : 'Select students to log'}
            </>
          )}
        </button>
      </div>

      {/* ══ Toast Notifications ══ */}
      <div style={{ position: 'fixed', bottom: '90px', right: '16px', left: '16px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="toast-item"
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px',
              background: '#fff', borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              border: `1px solid ${toast.type === 'error' ? '#fecaca' : toast.type === 'info' ? '#bfdbfe' : '#d1fae5'}`,
              cursor: 'pointer'
            }}
            onClick={() => removeToast(toast.id)}
          >
            {toast.type === 'success' && <CheckCircle size={18} color="#10b981" style={{ flexShrink: 0 }} />}
            {toast.type === 'error' && <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />}
            {toast.type === 'info' && <Info size={18} color="#3b82f6" style={{ flexShrink: 0 }} />}
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#111', flex: 1 }}>{toast.message}</span>
            <X size={14} color="#999" style={{ flexShrink: 0 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
