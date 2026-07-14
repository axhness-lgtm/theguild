import React, { useState, useEffect } from 'react';
import { Search, Download, Trash2, CheckCircle2, RefreshCw, Filter, ArrowUpDown, Eye, X } from 'lucide-react';
import { dataService } from '../services/dataService';
import './Admin.css';

export default function AdminDashboard({ onLogout }) {
  const [submissions, setSubmissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSport, setFilterSport] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('NEWEST');
  const [loading, setLoading] = useState(false);
  const [selectedScreenshotItem, setSelectedScreenshotItem] = useState(null);

  const loadData = async () => {
    setLoading(true);
    const data = await dataService.getSubmissions();
    setSubmissions(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === 'Contacted' ? 'Pending' : 'Contacted';
    const updated = await dataService.updateStatus(item.id, nextStatus);
    setSubmissions(updated);
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Permanently delete interest record for ${name}?`)) {
      const updated = await dataService.deleteSubmission(id);
      setSubmissions(updated);
    }
  };

  const handleExportCSV = () => {
    if (filteredList.length === 0) return;
    const headers = ['ID', 'Name', 'Phone', 'Instagram', 'Sport', 'Selected Event', 'Submission Date', 'Status'];
    const rows = filteredList.map(s => [
      s.id,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.phone}"`,
      `"${s.instagram}"`,
      s.sportCategory.toUpperCase(),
      `"${s.selectedEvent.replace(/"/g, '""')}"`,
      new Date(s.submissionDate).toLocaleString(),
      s.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `the_guild_interest_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter and Sort Logic
  const filteredList = submissions
    .filter(s => {
      const matchesSearch = 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.instagram.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.selectedEvent.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesSport = filterSport === 'ALL' || s.sportCategory.toLowerCase() === filterSport.toLowerCase();
      const matchesStatus = filterStatus === 'ALL' || s.status.toLowerCase() === filterStatus.toLowerCase();
      
      return matchesSearch && matchesSport && matchesStatus;
    })
    .sort((a, b) => {
      if (sortOrder === 'NEWEST') return new Date(b.submissionDate) - new Date(a.submissionDate);
      if (sortOrder === 'OLDEST') return new Date(a.submissionDate) - new Date(b.submissionDate);
      if (sortOrder === 'NAME_ASC') return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <section className="admin-dashboard-section animate-fade-in">
      <div className="grid-container admin-dashboard-container">
        
        {/* Top Header */}
        <div className="admin-topbar">
          <div className="admin-title-group">
            <span className="admin-badge font-tech">RESTRICTED DASHBOARD</span>
            <h1 className="admin-title font-editorial">INTEREST SUBMISSIONS</h1>
          </div>

          <div className="admin-topbar-actions font-tech">
            <button className="btn-action-outline" onClick={loadData} title="Refresh Data">
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              <span>REFRESH</span>
            </button>
            <button className="btn-brutalist export-btn" onClick={handleExportCSV}>
              <Download size={14} />
              <span>EXPORT CSV ({filteredList.length})</span>
            </button>
            <button className="btn-logout" onClick={onLogout}>
              [ LOCK & EXIT ]
            </button>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="admin-toolbar font-tech">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              placeholder="SEARCH NAME, PHONE, IG OR EVENT..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-controls">
            <div className="filter-item">
              <Filter size={13} />
              <span>SPORT:</span>
              <select value={filterSport} onChange={(e) => setFilterSport(e.target.value)}>
                <option value="ALL">ALL SPORTS</option>
                <option value="f1">FORMULA 1</option>
                <option value="football">FOOTBALL</option>
              </select>
            </div>

            <div className="filter-item">
              <span>STATUS:</span>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="ALL">ALL STATUS</option>
                <option value="Pending">PENDING</option>
                <option value="Contacted">CONTACTED</option>
              </select>
            </div>

            <div className="filter-item">
              <ArrowUpDown size={13} />
              <span>SORT:</span>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                <option value="NEWEST">NEWEST FIRST</option>
                <option value="OLDEST">OLDEST FIRST</option>
                <option value="NAME_ASC">NAME A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Grid Table */}
        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr className="font-tech">
                <th>MEMBER NAME</th>
                <th>CONTACT INFO</th>
                <th>INSTAGRAM</th>
                <th>SELECTED SCREENING</th>
                <th>SPORT</th>
                <th>SUBMITTED ON</th>
                <th>PAYMENT RECEIPT</th>
                <th>STATUS</th>
                <th className="text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-row font-tech">
                    // NO MATCHING INTEREST SUBMISSIONS FOUND
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="table-row">
                    <td className="font-editorial row-name">{item.name}</td>
                    <td className="font-tech row-phone">{item.phone}</td>
                    <td className="font-tech row-ig">{item.instagram}</td>
                    <td className="font-editorial row-event">{item.selectedEvent}</td>
                    <td>
                      <span className="sport-badge font-tech">
                        {item.sportCategory.toUpperCase()}
                      </span>
                    </td>
                    <td className="font-tech row-date">
                      {new Date(item.submissionDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="font-tech">
                      {item.paymentScreenshot ? (
                        <button 
                          onClick={() => setSelectedScreenshotItem(item)}
                          className="text-xs text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1 font-bold"
                        >
                          <Eye size={14} /> View Screenshot
                        </button>
                      ) : (
                        <span className="text-gray-500 text-xs">
                          {item.packagePreference && item.packagePreference !== 'N/A' ? item.packagePreference : 'No Screenshot'}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill font-tech ${item.status === 'Contacted' ? 'status-contacted' : 'status-pending'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="text-right row-actions">
                      <button 
                        className="btn-status-toggle font-tech"
                        onClick={() => handleToggleStatus(item)}
                        title="Toggle Contacted Status"
                      >
                        <CheckCircle2 size={15} />
                        <span>{item.status === 'Contacted' ? 'UNMARK' : 'MARK CONTACTED'}</span>
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => handleDelete(item.id, item.name)}
                        title="Delete Entry"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="admin-footer font-tech">
          <span>SHOWING {filteredList.length} OF {submissions.length} LEADS COLLECTED</span>
          <span>SYSTEM // SUPABASE DATA BRIDGE ACTIVE</span>
        </div>

      </div>

      {/* Screenshot Preview Modal for Founder Dashboard */}
      {selectedScreenshotItem && (
        <div className="modal-backdrop animate-fade-in" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedScreenshotItem(null)}>
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl max-w-lg w-full text-left font-tech shadow-2xl m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
              <h4 className="font-impact text-lg text-white">PAYMENT SCREENSHOT // {selectedScreenshotItem.name}</h4>
              <button onClick={() => setSelectedScreenshotItem(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="text-xs text-gray-300 space-y-1 mb-4 bg-zinc-900 p-3 rounded border border-zinc-800">
              <div>ATTENDEE: <strong className="text-white">{selectedScreenshotItem.name}</strong> ({selectedScreenshotItem.phone})</div>
              <div>SCREENING: <strong className="text-emerald-400">{selectedScreenshotItem.selectedEvent}</strong></div>
              <div>DETAILS: <span className="text-gray-300">{selectedScreenshotItem.packagePreference}</span></div>
            </div>

            <div className="bg-black p-3 rounded border border-zinc-800 text-center flex items-center justify-center overflow-hidden max-h-[70vh]">
              <img 
                src={selectedScreenshotItem.paymentScreenshot} 
                alt="Payment Verification Screenshot" 
                className="max-h-[60vh] max-w-full rounded object-contain mx-auto"
              />
            </div>

            <div className="flex justify-between items-center mt-5 pt-4 border-t border-zinc-800">
              <span className="text-emerald-400 text-xs font-bold">✓ SURESHOT COMPRESSED DATA STORED IN DB</span>
              <button onClick={() => setSelectedScreenshotItem(null)} className="btn-brutalist py-2 px-6 text-xs">
                CLOSE PREVIEW
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
