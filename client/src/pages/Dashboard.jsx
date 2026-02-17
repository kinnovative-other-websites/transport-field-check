import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import {
  Download, Search, MapPin, Upload, Trash2, MapPinOff, Check,
  ChevronLeft, ChevronRight, Filter, X, RefreshCw, CheckCircle, AlertCircle, Info, AlertTriangle
} from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Selection state
  const [selectedStudents, setSelectedStudents] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Filters
  const [branchFilter, setBranchFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '', 'logged', 'pending'

  // Bulk upload
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

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

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async (isSync = false) => {
    if (isSync) setSyncing(true); else setLoading(true);
    try {
      const res = await axios.get('/api/all-data');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  // ── Derived filter options ──
  const branches = useMemo(() => [...new Set(data.map(d => d.branch_name).filter(Boolean))].sort(), [data]);
  const routes = useMemo(() => {
    const filtered = branchFilter ? data.filter(d => d.branch_name === branchFilter) : data;
    return [...new Set(filtered.map(d => d.route_name).filter(Boolean))].sort();
  }, [data, branchFilter]);

  // ── Combined filter pipeline ──
  const filteredData = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    return data.filter(item => {
      // Search
      const matchesSearch = !search ||
        (item.student_name && item.student_name.toLowerCase().includes(lowerSearch)) ||
        (item.student_code && item.student_code.toLowerCase().includes(lowerSearch)) ||
        (item.student_id && item.student_id.toLowerCase().includes(lowerSearch)) ||
        (item.route_name && item.route_name.toLowerCase().includes(lowerSearch)) ||
        (item.branch_name && item.branch_name.toLowerCase().includes(lowerSearch));
      // Branch
      const matchesBranch = !branchFilter || item.branch_name === branchFilter;
      // Route
      const matchesRoute = !routeFilter || item.route_name === routeFilter;
      // Status
      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'logged' && item.latitude && item.longitude) ||
        (statusFilter === 'pending' && (!item.latitude || !item.longitude));
      return matchesSearch && matchesBranch && matchesRoute && matchesStatus;
    });
  }, [data, search, branchFilter, routeFilter, statusFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedStudents([]);
  }, [search, branchFilter, routeFilter, statusFilter]);

  // Reset route when branch changes
  useEffect(() => { setRouteFilter(''); }, [branchFilter]);

  // ── Stats (from full data, not filtered) ──
  const stats = useMemo(() => {
    const total = data.length;
    const logged = data.filter(d => d.latitude && d.longitude).length;
    return { total, logged, pending: total - logged };
  }, [data]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage]);

  const getPageNumbers = () => {
    const pages = [];
    const max = 5;
    let start = Math.max(1, currentPage - Math.floor(max / 2));
    let end = Math.min(totalPages, start + max - 1);
    if (end - start < max - 1) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  // ── Export ──
  const handleExport = () => {
    setConfirmModal({
      title: 'Export Data',
      message: `Export ${filteredData.length} record(s) to CSV?`,
      onConfirm: () => {
        const csv = Papa.unparse(filteredData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'student_location_data.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Exported ${filteredData.length} records to CSV`, 'success');
        setConfirmModal(null);
      }
    });
  };

  // ── Clear ALL locations ──
  const handleClearAll = () => {
    setConfirmModal({
      title: 'Clear All Locations',
      message: 'Are you sure you want to clear ALL student locations? This will remove latitude & longitude for every student.',
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await axios.post('/api/clear-all-locations');
          showToast('All locations cleared successfully!', 'success');
          setSelectedStudents([]);
          fetchData();
        } catch (err) {
          console.error(err);
          showToast('Failed to clear locations.', 'error');
        }
      }
    });
  };

  // ── Clear SELECTED ──
  const handleClearSelected = () => {
    if (selectedStudents.length === 0) return;
    setConfirmModal({
      title: 'Remove Selected Locations',
      message: `Clear locations for ${selectedStudents.length} selected student(s)?`,
      danger: true,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await axios.post('/api/clear-selected-locations', { student_codes: selectedStudents });
          showToast(`Cleared locations for ${selectedStudents.length} student(s)`, 'success');
          setSelectedStudents([]);
          fetchData();
        } catch (err) {
          console.error(err);
          showToast('Failed to clear selected locations.', 'error');
        }
      }
    });
  };

  // ── Delete SELECTED students (permanent, two-step) ──
  const handleDeleteSelected = () => {
    if (selectedStudents.length === 0) return;
    // Step 1: Caution
    setConfirmModal({
      title: '⚠️ Delete Selected Students',
      message: `CAUTION: This will permanently DELETE ${selectedStudents.length} selected student record(s) from the database. Their names, codes, locations, and all data will be lost forever.`,
      danger: true,
      confirmText: 'I Understand, Continue',
      onConfirm: () => {
        setConfirmModal(null);
        // Step 2: Final confirmation
        setTimeout(() => {
          setConfirmModal({
            title: 'Final Confirmation',
            message: `Permanently delete ${selectedStudents.length} student(s)? This cannot be undone.`,
            danger: true,
            confirmText: 'Yes, Delete Permanently',
            onConfirm: async () => {
              setConfirmModal(null);
              try {
                const res = await axios.post('/api/delete-selected-students', { student_codes: selectedStudents });
                showToast(`${res.data.deleted} student(s) deleted permanently.`, 'success');
                setSelectedStudents([]);
                fetchData();
              } catch (err) {
                console.error(err);
                showToast('Failed to delete selected students.', 'error');
              }
            }
          });
        }, 200);
      }
    });
  };

  // ── Erase ALL data (two-step: caution → confirm → delete) ──
  const handleEraseAllData = () => {
    // Step 1: Caution warning
    setConfirmModal({
      title: '⚠️ Erase All Data',
      message: 'CAUTION: This will permanently DELETE all student records from the database. This action cannot be undone. All student names, codes, locations, routes — everything will be lost.',
      danger: true,
      confirmText: 'I Understand, Continue',
      onConfirm: () => {
        setConfirmModal(null);
        // Step 2: Final confirmation
        setTimeout(() => {
          setConfirmModal({
            title: 'Final Confirmation',
            message: 'Are you absolutely sure? Type action cannot be reversed. All data will be permanently erased from the database.',
            danger: true,
            confirmText: 'Yes, Erase Everything',
            onConfirm: async () => {
              setConfirmModal(null);
              try {
                const res = await axios.post('/api/erase-all-data');
                showToast(`All data erased. ${res.data.deleted} record(s) deleted.`, 'success');
                setSelectedStudents([]);
                fetchData();
              } catch (err) {
                console.error(err);
                showToast('Failed to erase data.', 'error');
              }
            }
          });
        }, 200);
      }
    });
  };

  // ── Bulk Upload ──
  const handleUploadCSV = () => {
    const templateCSV = 'student_id,student_code,student_name,section_name,branch_name,route_name\n';
    const blob = new Blob([templateCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_upload_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setTimeout(() => fileInputRef.current?.click(), 500);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('/api/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast(`Upload successful! ${res.data.inserted} inserted, ${res.data.updated} updated.`, 'success');
      fetchData();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Selection ──
  const handleSelectAll = () => {
    const codes = paginatedData.map(s => s.student_code);
    const all = codes.every(c => selectedStudents.includes(c));
    if (all) setSelectedStudents(prev => prev.filter(c => !codes.includes(c)));
    else setSelectedStudents(prev => [...new Set([...prev, ...codes])]);
  };
  const handleSelectOne = (code) => {
    setSelectedStudents(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };
  const isAllPageSelected = paginatedData.length > 0 && paginatedData.every(s => selectedStudents.includes(s.student_code));

  // ── Stat card click ──
  const handleStatClick = (type) => {
    setStatusFilter(prev => prev === type ? '' : type);
  };

  const hasActiveFilters = branchFilter || routeFilter || statusFilter || search;

  const clearAllFilters = () => {
    setSearch('');
    setBranchFilter('');
    setRouteFilter('');
    setStatusFilter('');
  };

  // ── Loading state ──
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: '1rem', color: 'var(--text-secondary)' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTopColor: 'var(--brand-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontWeight: 500 }}>Loading Dashboard...</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem 2rem', minHeight: '100vh' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .sync-spin { animation: spin 0.8s linear infinite; }
        .dash-fade { animation: fadeIn 0.35s ease; }
        .dash-row:hover { background: #f9f9f9 !important; }
        .dash-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 8px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: 1px solid #d4d4d4; background: white; color: #1a1a1a; transition: all 0.15s; white-space: nowrap; }
        .dash-btn:hover { background: #f5f5f5; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
        .dash-btn.danger { background: #f5f5f5; color: #333; border-color: #bbb; }
        .dash-btn.danger:hover { background: #eee; }
        .dash-btn.primary { background: #111; color: #fff; border-color: #111; }
        .dash-btn.primary:hover { background: #333; }
        .dash-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .stat-card { padding: 1.25rem 1.5rem; border-radius: 12px; cursor: pointer; transition: all 0.2s; border: 2px solid transparent; position: relative; overflow: hidden; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
        .stat-card.active { border-color: #111; box-shadow: 0 0 0 3px rgba(0,0,0,0.08); }
        .dash-select { padding: 8px 12px; border-radius: 8px; border: 1px solid #d4d4d4; font-size: 0.85rem; background: white; outline: none; cursor: pointer; font-weight: 500; color: #1a1a1a; min-width: 140px; }
        .dash-select:focus { border-color: #111; box-shadow: 0 0 0 3px rgba(0,0,0,0.06); }
        .dash-checkbox { width: 18px; height: 18px; border-radius: 4px; border: 2px solid #bbb; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s; flex-shrink: 0; }
        .dash-checkbox.checked { background: #111; border-color: #111; }
        @keyframes toastSlideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes toastSlideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(120%); opacity: 0; } }
        .toast-item { animation: toastSlideIn 0.3s ease forwards; }
      `}</style>

      {/* ═══ Header ═══ */}
      <div className="dash-fade" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Dashboard
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0', fontSize: '0.9rem' }}>
              Real-time overview of student transport logistics
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="dash-btn" onClick={() => {
              setConfirmModal({
                title: 'Sync Data',
                message: 'Refresh the dashboard with latest data from server?',
                onConfirm: () => { setConfirmModal(null); fetchData(true); showToast('Data synced successfully!', 'success'); }
              });
            }} disabled={syncing} title="Sync data">
              <RefreshCw size={15} className={syncing ? 'sync-spin' : ''} /> {syncing ? 'Syncing...' : 'Sync'}
            </button>
            <button className="dash-btn primary" onClick={handleUploadCSV} disabled={uploading} title="Download template & upload CSV">
              <Upload size={15} /> {uploading ? 'Uploading...' : 'Upload CSV'}
            </button>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
            <button className="dash-btn" onClick={handleExport}>
              <Download size={15} /> Export
            </button>
            <button className="dash-btn danger" onClick={handleClearAll} title="Clear all student locations">
              <Trash2 size={15} /> Clear All
            </button>
            <button className="dash-btn" onClick={handleEraseAllData} title="Permanently delete all data"
              style={{ background: '#fff', color: '#dc2626', borderColor: '#fca5a5' }}>
              <AlertTriangle size={15} /> Erase Data
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Stat Cards ═══ */}
      <div className="dash-fade" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Total */}
        <div
          className="stat-card"
          onClick={() => handleStatClick('')}
          style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '2px solid transparent' }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888', marginBottom: '8px' }}>Total Students</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111', lineHeight: 1 }}>{stats.total}</div>
        </div>
        {/* Logged */}
        <div
          className={`stat-card ${statusFilter === 'logged' ? 'active' : ''}`}
          onClick={() => handleStatClick('logged')}
          style={{ background: statusFilter === 'logged' ? '#f5f5f5' : 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderColor: statusFilter === 'logged' ? '#111' : 'transparent' }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#333', borderRadius: '12px 0 0 12px' }} />
          <div style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888', marginBottom: '8px' }}>Location Logged</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111', lineHeight: 1 }}>{stats.logged}</div>
          {statusFilter === 'logged' && <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '6px', fontWeight: 600 }}>✓ Filter Active — Click to clear</div>}
        </div>
        {/* Pending */}
        <div
          className={`stat-card ${statusFilter === 'pending' ? 'active' : ''}`}
          onClick={() => handleStatClick('pending')}
          style={{ background: statusFilter === 'pending' ? '#f5f5f5' : 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderColor: statusFilter === 'pending' ? '#111' : 'transparent' }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#999', borderRadius: '12px 0 0 12px' }} />
          <div style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888', marginBottom: '8px' }}>Pending</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#555', lineHeight: 1 }}>{stats.pending}</div>
          {statusFilter === 'pending' && <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '6px', fontWeight: 600 }}>✓ Filter Active — Click to clear</div>}
        </div>
      </div>

      {/* ═══ Filter Bar ═══ */}
      <div className="dash-fade" style={{
        display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem',
        padding: '12px 16px', background: 'white', borderRadius: '10px',
        border: '1px solid var(--border-color)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        flexWrap: 'wrap'
      }}>
        <Filter size={16} color="var(--text-secondary)" />

        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search by name, ID, branch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px 8px 32px', borderRadius: '8px',
              border: '1px solid var(--border-color)', fontSize: '0.85rem', outline: 'none',
              background: '#f8fafc'
            }}
          />
        </div>

        {/* Branch filter */}
        <select className="dash-select" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
          <option value="">All Branches</option>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        {/* Route filter */}
        <select className="dash-select" value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)}>
          <option value="">All Routes</option>
          {routes.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <button className="dash-btn" onClick={clearAllFilters} style={{ padding: '6px 10px', fontSize: '0.78rem' }}>
            <X size={14} /> Clear Filters
          </button>
        )}
      </div>

      {/* ═══ Selection Action Bar ═══ */}
      {selectedStudents.length > 0 && (
        <div className="dash-fade" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', marginBottom: '1rem',
          background: '#f5f5f5', borderRadius: '10px', border: '1px solid #d4d4d4'
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111' }}>
            {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="dash-btn danger" onClick={handleClearSelected} style={{ padding: '6px 12px' }}>
              <MapPinOff size={15} /> Remove Locations
            </button>
            <button className="dash-btn" onClick={handleDeleteSelected} style={{ padding: '6px 12px', color: '#dc2626', borderColor: '#fca5a5' }}>
              <Trash2 size={15} /> Delete Students
            </button>
          </div>
        </div>
      )}

      {/* ═══ Table ═══ */}
      <div className="dash-fade" style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '12px', width: '44px' }}>
                  <div className={`dash-checkbox ${isAllPageSelected ? 'checked' : ''}`} onClick={handleSelectAll}>
                    {isAllPageSelected && <Check size={13} color="white" />}
                  </div>
                </th>
                {['Student ID', 'Student Name', 'Code / Section', 'Branch', 'Route', 'Coordinates', 'Status'].map(h => (
                  <th key={h} style={{
                    padding: '12px 14px', fontWeight: 600, color: 'var(--text-secondary)',
                    fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px',
                    textAlign: h === 'Status' ? 'right' : 'left'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((student, i) => {
                const isSelected = selectedStudents.includes(student.student_code);
                const hasLocation = student.latitude && student.longitude;
                return (
                  <tr
                    key={`${student.student_code}-${i}`}
                    className="dash-row"
                    onClick={() => handleSelectOne(student.student_code)}
                    style={{
                      borderBottom: '1px solid #eee', cursor: 'pointer',
                      background: isSelected ? '#f5f5f5' : 'transparent', transition: 'background 0.12s'
                    }}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <div className={`dash-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <Check size={13} color="white" />}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {student.student_id || '—'}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {student.student_name}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontFamily: 'monospace', color: '#333', fontWeight: 600, fontSize: '0.85rem' }}>{student.student_code}</span>
                      <br />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{student.section_name}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-primary)', fontSize: '0.88rem' }}>{student.branch_name}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: '#f5f5f5', padding: '3px 8px', borderRadius: '6px', fontSize: '0.82rem', color: '#555', border: '1px solid #e0e0e0' }}>
                        {student.route_name}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {hasLocation ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} color="#333" />
                          {Number(student.latitude).toFixed(4)}, {Number(student.longitude).toFixed(4)}
                        </span>
                      ) : <span style={{ color: '#ccc' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      {hasLocation ? (
                        <span style={{ background: '#111', color: '#fff', padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                          Logged
                        </span>
                      ) : (
                        <span style={{ background: '#eee', color: '#666', padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredData.length === 0 && (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Search size={44} style={{ opacity: 0.15, marginBottom: '1rem' }} />
            <p style={{ margin: 0, fontWeight: 500 }}>No records found</p>
            <p style={{ margin: '6px 0 0', fontSize: '0.85rem', opacity: 0.7 }}>Try adjusting your search or filters</p>
          </div>
        )}

        {/* ═══ Pagination Footer ═══ */}
        <div style={{
          padding: '10px 16px', borderTop: '1px solid var(--border-color)', background: '#fafbfc',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
        }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredData.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}</strong>–<strong>{Math.min(currentPage * rowsPerPage, filteredData.length)}</strong> of <strong>{filteredData.length}</strong>
            {filteredData.length !== data.length && <span> (filtered from {data.length})</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <select
              className="dash-select"
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              style={{ minWidth: 'auto', padding: '6px 8px', fontSize: '0.8rem' }}
            >
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
            </select>

            <button
              className="dash-btn"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ padding: '5px 8px' }}
            >
              <ChevronLeft size={15} />
            </button>

            {getPageNumbers().map(p => (
              <button
                key={p}
                className="dash-btn"
                onClick={() => setCurrentPage(p)}
                style={{
                  padding: '5px 10px', minWidth: '32px', justifyContent: 'center',
                  background: p === currentPage ? '#111' : 'white',
                  color: p === currentPage ? '#fff' : '#1a1a1a',
                  borderColor: p === currentPage ? '#111' : '#d4d4d4',
                  fontWeight: p === currentPage ? 700 : 500
                }}
              >
                {p}
              </button>
            ))}

            <button
              className="dash-btn"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ padding: '5px 8px' }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Toast Notifications ═══ */}
      <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '380px' }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="toast-item"
            style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
              background: 'white', borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              border: `1px solid ${toast.type === 'error' ? '#fecaca' : toast.type === 'info' ? '#bfdbfe' : '#d1fae5'}`,
              cursor: 'pointer'
            }}
            onClick={() => removeToast(toast.id)}
          >
            {toast.type === 'success' && <CheckCircle size={18} color="#10b981" style={{ flexShrink: 0 }} />}
            {toast.type === 'error' && <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />}
            {toast.type === 'info' && <Info size={18} color="#3b82f6" style={{ flexShrink: 0 }} />}
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1a1a1a', flex: 1 }}>{toast.message}</span>
            <X size={14} color="#999" style={{ flexShrink: 0, cursor: 'pointer' }} />
          </div>
        ))}
      </div>

      {/* ═══ Confirmation Modal ═══ */}
      {confirmModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }} onClick={() => setConfirmModal(null)}>
          <div
            style={{
              background: 'white', borderRadius: '14px', padding: '1.75rem', maxWidth: '420px', width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)', animation: 'fadeIn 0.2s ease'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700, color: '#111' }}>
              {confirmModal.title}
            </h3>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.9rem', color: '#555', lineHeight: 1.5 }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="dash-btn"
                onClick={() => setConfirmModal(null)}
                style={{ padding: '8px 18px' }}
              >
                Cancel
              </button>
              <button
                className={`dash-btn ${confirmModal.danger ? 'danger' : 'primary'}`}
                onClick={confirmModal.onConfirm}
                style={{ padding: '8px 18px' }}
              >
                {confirmModal.confirmText || (confirmModal.danger ? 'Yes, Proceed' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
