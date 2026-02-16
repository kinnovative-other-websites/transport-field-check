import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Search, RefreshCw, Send, Check, User, Map, Filter, ChevronDown } from 'lucide-react';

export default function LogLocation() {
  const { branch, route } = useParams(); // route is optional now
  const navigate = useNavigate();
  
  const [students, setStudents] = useState([]); // All students for the view
  const [routes, setRoutes] = useState([]); // Available routes for filter
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState(false);
  const [search, setSearch] = useState('');
  
  const [filteredStudents, setFilteredStudents] = useState([]);
  
  const decodedBranch = decodeURIComponent(branch || '');
  const decodedRoute = route ? decodeURIComponent(route) : 'All Routes';

  useEffect(() => {
    fetchRoutes();
    fetchStudents();
  }, [branch, route]); // Re-run when URL params change

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
      const res = await axios.get(`http://localhost:3000/api/routes/${decodedBranch}`);
      setRoutes(res.data);
    } catch (err) {
      console.error("Failed to fetch routes", err);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      let url = `http://localhost:3000/api/students/${decodedBranch}`;
      if (route) { // If specific route is in URL, fetch only that
        url += `/${decodeURIComponent(route)}`;
      }
      const res = await axios.get(url);
      setStudents(res.data);
      // Reset selection when data changes
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
      alert('Geolocation not supported');
      setLogging(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            await axios.post('http://localhost:3000/api/log-location', {
                student_codes: selectedStudents,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                branch_name: decodedBranch
            });
            alert('Logged successfully!');
            setSelectedStudents([]);
            fetchStudents(); // Refresh data
        } catch (e) {
            alert('Failed to log.');
        } finally {
            setLogging(false);
        }
    }, () => {
        alert('Permission denied');
        setLogging(false);
    });
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: 'var(--brand-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <span>Loading Data...</span>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ paddingBottom: '100px', background: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Mobile-First Header */}
      <div style={{ background: 'white', padding: '1rem', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.25rem', color: 'var(--brand-blue)' }}>
                    <Send size={20} style={{ transform: 'rotate(-45deg)' }} />
                    Sheet Mapper
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
                    <span className="branch-badge" style={{ fontSize: '0.7rem' }}>{decodedBranch}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{filteredStudents.length} Students</span>
                </div>
            </div>
            <button onClick={fetchStudents} style={{ background: '#f1f5f9', border: 'none', padding: '0.5rem', borderRadius: '50%', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <RefreshCw size={20} />
            </button>
        </div>

        {/* Filters & Search - Stacked for mobile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            
            {/* Route Filter Dropdown */}
            <div style={{ position: 'relative' }}>
                <Filter size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <ChevronDown size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <select 
                    value={decodedRoute} 
                    onChange={handleRouteChange}
                    style={{ 
                        width: '100%', padding: '0.75rem 2.5rem 0.75rem 2.5rem', 
                        borderRadius: '8px', border: '1px solid var(--border-color)', 
                        background: 'white', fontSize: '1rem', outline: 'none',
                        appearance: 'none', cursor: 'pointer', fontWeight: 500, color: 'var(--text-primary)'
                    }}
                >
                    <option value="All Routes">All Routes</option>
                    {routes.map(r => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>
            </div>

            {/* Search Bar */}
            <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="Search student or code..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ 
                      width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', 
                      borderRadius: '8px', border: '1px solid var(--border-color)', 
                      background: '#f8fafc', fontSize: '1rem', outline: 'none' 
                  }}
                />
            </div>
        </div>
      </div>

      {/* Select All Toggle */}
      {filteredStudents.length > 0 && (
          <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f1f5f9', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student List</span>
              <div 
                  onClick={handleSelectAll}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--brand-blue)', fontWeight: 600, cursor: 'pointer' }}
              >
                  {selectedStudents.length === filteredStudents.length ? 'Unselect All' : 'Select All'}
                  <div className={`custom-checkbox ${selectedStudents.length === filteredStudents.length ? 'checked' : ''}`} style={{ width: '18px', height: '18px', borderColor: 'var(--brand-blue)', background: selectedStudents.length === filteredStudents.length ? 'var(--brand-blue)' : 'transparent' }}>
                      {selectedStudents.length === filteredStudents.length && <Check size={12} color="white" />}
                  </div>
              </div>
          </div>
      )}

      {/* Mobile Card List */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredStudents.map(student => {
            const isSelected = selectedStudents.includes(student.student_code);
            return (
              <div 
                key={student.student_code} 
                onClick={() => handleSelect(student.student_code)}
                style={{ 
                    background: 'white', borderRadius: '12px', padding: '1rem', 
                    border: '1px solid', borderColor: isSelected ? 'var(--brand-blue)' : 'var(--border-color)',
                    boxShadow: isSelected ? '0 4px 12px rgba(59, 130, 246, 0.15)' : '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s', display: 'flex', gap: '1rem', alignItems: 'center', cursor: 'pointer'
                }}
              >
                {/* Checkbox Column */}
                <div style={{ flexShrink: 0 }}>
                    <div className="custom-checkbox" style={{ 
                        width: '24px', height: '24px', 
                        borderColor: isSelected ? 'var(--brand-blue)' : '#cbd5e1',
                        background: isSelected ? 'var(--brand-blue)' : 'transparent'
                    }}>
                        {isSelected && <Check size={16} color="white" />}
                    </div>
                </div>

                {/* Content Column */}
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {student.student_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <User size={14} /> {student.student_code}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Map size={14} /> {student.route_name.length > 15 ? student.route_name.substring(0, 15) + '...' : student.route_name}
                        </div>
                    </div>
                </div>
              </div>
            );
        })}

        {filteredStudents.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                <Search size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                <p>No students found for "{search}"{route ? ` in ${decodeURIComponent(route)}` : ''}</p>
            </div>
        )}
      </div>

      {/* Sticky Mobile Footer */}
      <div style={{ 
          position: 'fixed', bottom: 0, left: 0, right: 0, 
          background: 'white', padding: '1rem', 
          boxShadow: '0 -4px 10px rgba(0,0,0,0.05)', 
          borderTop: '1px solid var(--border-color)', zIndex: 100 
      }}>
          <button 
            className="btn-primary" 
            onClick={handleLogLocation} 
            disabled={logging || selectedStudents.length === 0}
            style={{ width: '100%', justifyContent: 'center', fontSize: '1.1rem', padding: '1rem' }}
          >
             {logging ? (
                 <>
                    <RefreshCw className="spin" size={20} /> Processing...
                 </>
             ) : (
                 <>
                    <MapPin size={22} /> Log {selectedStudents.length} Location{selectedStudents.length !== 1 ? 's' : ''}
                 </>
             )}
          </button>
      </div>

    </div>
  );
}
