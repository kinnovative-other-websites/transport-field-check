import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { Download, Search, LayoutDashboard, MapPin } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const lowerSearch = search.toLowerCase();
    const filtered = data.filter(item => 
      (item.student_name && item.student_name.toLowerCase().includes(lowerSearch)) ||
      (item.student_code && item.student_code.toLowerCase().includes(lowerSearch)) ||
      (item.route_name && item.route_name.toLowerCase().includes(lowerSearch)) ||
      (item.branch_name && item.branch_name.toLowerCase().includes(lowerSearch))
    );
    setFilteredData(filtered);
  }, [search, data]);

  const fetchData = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/all-data');
      setData(res.data);
      setFilteredData(res.data);
    } catch (err) {
      console.error(err);
      // Mock data for UI preview if DB is down
      // setData([]); setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csv = Papa.unparse(filteredData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'student_location_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate Stats
  const stats = React.useMemo(() => {
    const total = data.length;
    const logged = data.filter(d => d.latitude && d.longitude).length;
    const pending = total - logged;
    return { total, logged, pending };
  }, [data]);

  if (loading) return (
    <div className="container" style={{ textAlign: 'center', paddingTop: '30vh' }}>
      <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: 'var(--brand-blue)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div className="container animate-fade-in" style={{ maxWidth: '1400px', padding: '2rem' }}>
      
      {/* Header & Actions */}
      <div className="flex justify-between items-end mb-6" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
           <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>Dashboard</h1>
           <div style={{ color: 'var(--text-secondary)' }}>Real-time overview of student transport logistics.</div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
           <div style={{ position: 'relative' }}>
              <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                placeholder="Search database..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ 
                    padding: '0.75rem 1rem 0.75rem 2.5rem', 
                    borderRadius: '8px', border: '1px solid var(--border-color)', 
                    background: 'white', fontSize: '0.95rem', outline: 'none', width: '300px'
                }}
              />
           </div>
           <button className="btn-secondary" onClick={handleExport} style={{ background: 'white' }}>
             <Download size={18} /> Export CSV
           </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
             <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Students</div>
             <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.total}</div>
          </div>
          <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)' }}>
             <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Location Logged</div>
             <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--success)' }}>{stats.logged}</div>
          </div>
          <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--brand-orange)' }}>
             <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Pending</div>
             <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--brand-orange)' }}>{stats.pending}</div>
          </div>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Student Name</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>ID / Section</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Branch</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Route</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Coordinates</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((student, index) => (
                <tr key={`${student.student_code}-${index}`} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }} className="hover:bg-slate-50">
                  <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--text-primary)' }}>{student.student_name}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <span style={{ fontFamily: 'monospace', color: 'var(--brand-blue)', fontWeight: 600 }}>{student.student_code}</span>
                       <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{student.section_name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>{student.branch_name}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      {student.route_name}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {student.latitude ? (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} color="var(--brand-blue)" />
                        {Number(student.latitude).toFixed(4)}, {Number(student.longitude).toFixed(4)}
                      </div>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    {student.latitude ? (
                      <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        Logged
                      </span>
                    ) : (
                      <span style={{ background: '#f1f5f9', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredData.length === 0 && (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Search size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>No records found matching your search.</p>
          </div>
        )}
        
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', background: '#f8fafc', color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Showing {filteredData.length} of {data.length} records</span>
            <span>{stats.logged} Logged • {stats.pending} Pending</span>
        </div>
      </div>
      <style>{` tr:hover { background-color: #f8fafc; } `}</style>
    </div>
  );
}
