import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import TherapistLayout from '../../components/profile/TherapistLayout';
import { format, parseISO } from 'date-fns';

export default function AppointmentsCalendar() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'confirmed', 'completed', 'cancelled'

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/sessions/me');
      setSessions(res.data.data.sessions);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (sessionId, newStatus) => {
    try {
      await api.patch(`/api/sessions/${sessionId}/status`, { status: newStatus });
      setSessions((prev) =>
        prev.map((s) => (s._id === sessionId ? { ...s, status: newStatus } : s))
      );
    } catch (err) {
      alert('Failed to update session status.');
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  return (
    <TherapistLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-surface-200">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Appointments & Sessions</h1>
            <p className="text-sm text-surface-500 mt-1">
              Track client bookings, Google Meet invitations, and upcoming clinical consultations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-surface-500">Filter:</span>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-surface-200 bg-white text-xs font-semibold outline-none"
            >
              <option value="all">All Bookings ({sessions.length})</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-surface-600">Loading appointments...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-surface-200 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center text-3xl mx-auto mb-4">
              📅
            </div>
            <h3 className="text-base font-bold text-surface-900">No appointments scheduled</h3>
            <p className="text-xs text-surface-500 mt-1 max-w-sm mx-auto">
              When clients select a slot on your public branded page, confirmed bookings will appear here instantly.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => {
              const start = parseISO(session.startDateTime);
              const end = parseISO(session.endDateTime);

              return (
                <div
                  key={session._id}
                  className="bg-white rounded-2xl border border-surface-200 p-5 shadow-sm hover:border-primary-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-surface-900">{session.clientName}</h3>
                      <span
                        className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          session.status === 'confirmed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : session.status === 'completed'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {session.status}
                      </span>
                    </div>

                    <div className="text-xs text-surface-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>📧 {session.clientEmail}</span>
                      {session.clientPhone && <span>📞 {session.clientPhone}</span>}
                      <span>💼 {session.serviceTitle} ({session.durationMinutes} mins)</span>
                      <span>₹{session.priceInr.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="text-xs font-semibold text-primary-800 pt-1 flex items-center gap-2">
                      <span>🗓️ {format(start, 'EEEE, dd MMMM yyyy')}</span>
                      <span>•</span>
                      <span>⏰ {format(start, 'hh:mm a')} – {format(end, 'hh:mm a')} (IST)</span>
                    </div>

                    {session.intakeNotes && (
                      <p className="text-xs text-surface-500 bg-surface-50 p-2.5 rounded-xl border border-surface-100 max-w-xl mt-2">
                        <span className="font-semibold text-surface-700">Client Note: </span>
                        {session.intakeNotes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <a
                      href={session.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-semibold rounded-xl border border-primary-200 transition text-center"
                    >
                      Join Meeting Link
                    </a>

                    {session.status === 'confirmed' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(session._id, 'completed')}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                        >
                          Mark Completed
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(session._id, 'cancelled')}
                          className="px-3 py-2 bg-surface-100 hover:bg-red-50 hover:text-red-600 text-surface-600 text-xs font-semibold rounded-xl transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TherapistLayout>
  );
}
