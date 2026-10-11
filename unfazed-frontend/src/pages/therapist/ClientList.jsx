import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import TherapistLayout from '../../components/profile/TherapistLayout';

export default function ClientList() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New client form state
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'active',
    tags: 'Individual',
    internalNotes: '',
  });
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchClients();
  }, [statusFilter]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/api/clients', { params });
      setClients(res.data.data.clients || []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchClients();
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg('');

    try {
      const payload = {
        name: newClient.name,
        email: newClient.email,
        phone: newClient.phone,
        status: newClient.status,
        tags: newClient.tags.split(',').map((t) => t.trim()).filter(Boolean),
        internalNotes: newClient.internalNotes,
      };

      const res = await api.post('/api/clients', payload);
      setClients([res.data.data.client, ...clients]);
      setShowAddModal(false);
      setNewClient({
        name: '',
        email: '',
        phone: '',
        status: 'active',
        tags: 'Individual',
        internalNotes: '',
      });
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to create client.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <TherapistLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-surface-200">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Client CRM & Records</h1>
            <p className="text-sm text-surface-500 mt-1">
              Manage client records, intake questionnaires, consent audits, and clinical histories.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm shadow-primary-600/20 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>+</span>
            <span>Add New Client</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <input
              type="text"
              placeholder="Search by client name, email or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl border border-surface-200 text-xs sm:text-sm outline-none focus:border-primary-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-surface-800 hover:bg-surface-900 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-surface-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-surface-200 bg-white text-xs font-semibold outline-none"
            >
              <option value="all">All Clients</option>
              <option value="active">Active</option>
              <option value="prospective">Prospective</option>
              <option value="inactive">Inactive</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Client Table / Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-surface-600">Loading client roster...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-surface-200 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center text-3xl mx-auto mb-4">
              👥
            </div>
            <h3 className="text-base font-bold text-surface-900">No client records found</h3>
            <p className="text-xs text-surface-500 mt-1 max-w-sm mx-auto">
              Clients are automatically added when they book appointments on your branded website, or you can add them manually.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-surface-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-200 text-[11px] font-bold text-surface-500 uppercase tracking-wider">
                    <th className="py-3 px-5">Client Name</th>
                    <th className="py-3 px-5">Contact Details</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Tags</th>
                    <th className="py-3 px-5">Intake & Consent</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 text-xs">
                  {clients.map((client) => (
                    <tr key={client._id} className="hover:bg-surface-50/70 transition">
                      <td className="py-4 px-5">
                        <Link
                          to={`/dashboard/clients/${client._id}`}
                          className="font-bold text-surface-900 hover:text-primary-600 flex items-center gap-2"
                        >
                          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {client.name.charAt(0)}
                          </div>
                          <span>{client.name}</span>
                        </Link>
                      </td>

                      <td className="py-4 px-5 text-surface-600">
                        <div>{client.email}</div>
                        {client.phone && <div className="text-[11px] text-surface-400">{client.phone}</div>}
                      </td>

                      <td className="py-4 px-5">
                        <span
                          className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            client.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : client.status === 'prospective'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-surface-100 text-surface-600 border border-surface-200'
                          }`}
                        >
                          {client.status}
                        </span>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex flex-wrap gap-1">
                          {client.tags?.map((t, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-surface-100 rounded-md text-[10px] font-medium text-surface-700"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1.5">
                          {client.intakeCompleted ? (
                            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                              <span>✓</span> Intake Complete
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-amber-600">
                              ⏳ Intake Pending
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-5 text-right">
                        <Link
                          to={`/dashboard/clients/${client._id}`}
                          className="px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 font-semibold rounded-lg text-xs transition"
                        >
                          View File ➔
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Add Client Manually */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-surface-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-surface-200 relative">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-surface-400 hover:text-surface-700 text-sm font-bold"
              >
                ✕
              </button>

              <h2 className="text-lg font-bold text-surface-900 mb-1">Add New Client</h2>
              <p className="text-xs text-surface-500 mb-4">
                Enter client contact details to establish their practice CRM record.
              </p>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs mb-4">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreateClient} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohini Sen"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="rohini@example.com"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-700 mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    placeholder="Individual, Anxiety, Weekly"
                    value={newClient.tags}
                    onChange={(e) => setNewClient({ ...newClient, tags: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-surface-600 hover:bg-surface-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition cursor-pointer"
                  >
                    {creating ? 'Saving...' : 'Add Client'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </TherapistLayout>
  );
}
