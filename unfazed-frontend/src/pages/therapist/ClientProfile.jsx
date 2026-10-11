import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import TherapistLayout from '../../components/profile/TherapistLayout';
import ClinicalNoteModal from '../../components/clinical/ClinicalNoteModal';
import { format, parseISO } from 'date-fns';

export default function ClientProfile() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Editable fields state
  const [status, setStatus] = useState('active');
  const [internalNotes, setInternalNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [clientPackages, setClientPackages] = useState([]);

  // Clinical Documentation State (Module 5)
  const [notes, setNotes] = useState([]);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedNoteToEdit, setSelectedNoteToEdit] = useState(null);

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [res, pkgsRes, notesRes] = await Promise.all([
        api.get(`/api/clients/${id}`),
        api.get(`/api/packages/client/${id}`).catch(() => ({ data: { data: { clientPackages: [] } } })),
        api.get(`/api/notes/client/${id}`).catch(() => ({ data: { data: { notes: [] } } })),
      ]);
      const data = res.data.data;
      setClient(data.client);
      setSessions(data.sessions || []);
      setStatus(data.client.status);
      setInternalNotes(data.client.internalNotes || '');
      setClientPackages(pkgsRes.data?.data?.clientPackages || []);
      setNotes(notesRes.data?.data?.notes || []);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to load client record.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this clinical note?')) return;
    try {
      await api.delete(`/api/notes/${noteId}`);
      fetchClientData();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete note.');
    }
  };

  const handleUpdateNotes = async () => {
    try {
      setSavingNotes(true);
      await api.put(`/api/clients/${id}`, { internalNotes, status });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2500);
    } catch (err) {
      alert('Failed to save notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <TherapistLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-surface-600">Loading client clinical file...</p>
        </div>
      </TherapistLayout>
    );
  }

  if (errorMsg || !client) {
    return (
      <TherapistLayout>
        <div className="bg-white rounded-2xl border border-surface-200 p-12 text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <h2 className="text-lg font-bold text-surface-900">Access Denied or Not Found</h2>
          <p className="text-xs text-surface-500 mt-1 max-w-sm mx-auto">
            {errorMsg || 'This client record is not available or belongs to another practitioner.'}
          </p>
          <Link
            to="/dashboard/clients"
            className="mt-5 inline-block px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-semibold"
          >
            Back to Client List
          </Link>
        </div>
      </TherapistLayout>
    );
  }

  const intake = client.intakeForm;
  const consent = client.consentRecord;

  return (
    <TherapistLayout>
      <div className="space-y-6">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-surface-500">
          <Link to="/dashboard/clients" className="hover:text-primary-600">Clients</Link>
          <span>/</span>
          <span className="text-surface-900">{client.name}</span>
        </div>

        {/* Client Header Card */}
        <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white font-bold text-2xl flex items-center justify-center shrink-0 shadow-md">
              {client.name.charAt(0)}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-surface-900">{client.name}</h1>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-full border border-surface-200 bg-surface-50 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="prospective">Prospective</option>
                  <option value="inactive">Inactive</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="text-xs text-surface-500 flex flex-wrap gap-x-4 gap-y-1">
                <span>📧 {client.email}</span>
                {client.phone && <span>📞 {client.phone}</span>}
                <span>📅 Client since {format(parseISO(client.createdAt), 'MMM yyyy')}</span>
              </div>

              {client.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {client.tags.map((t, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-surface-100 text-surface-700 text-[10px] font-semibold">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Link
              to={`/dashboard/messages?clientId=${client._id}`}
              className="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold text-center transition flex items-center justify-center gap-1 shadow-xs"
            >
              <span>💬 Message Client</span>
            </Link>
            <Link
              to={`/portal/${client._id}/notes`}
              target="_blank"
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold text-center transition flex items-center justify-center gap-1"
            >
              <span>🌐 Shared Notes</span>
              <span>↗</span>
            </Link>
            <Link
              to={`/intake/${client._id}`}
              target="_blank"
              className="px-3.5 py-2 bg-surface-50 hover:bg-surface-100 text-surface-700 border border-surface-200 rounded-xl text-xs font-semibold text-center transition"
            >
              Copy Intake Link ↗
            </Link>
          </div>
        </div>

        {/* Grid: Intake & Consent vs Sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Intake & Clinical Overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Demographic & Intake Record */}
            <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-surface-100 pb-3">
                <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
                  <span>📋</span> Demographic & Intake Form
                </h2>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    client.intakeCompleted
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {client.intakeCompleted ? '✓ Completed' : 'Pending Submission'}
                </span>
              </div>

              {intake ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-surface-400 font-semibold block">Date of Birth:</span>
                    <span className="text-surface-800 font-medium">{intake.dateOfBirth || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-surface-400 font-semibold block">Gender Identity:</span>
                    <span className="text-surface-800 font-medium capitalize">{intake.gender || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-surface-400 font-semibold block">Emergency Contact:</span>
                    <span className="text-surface-800 font-medium">
                      {intake.emergencyContactName ? `${intake.emergencyContactName} (${intake.emergencyContactRelation}) - ${intake.emergencyContactPhone}` : 'None listed'}
                    </span>
                  </div>
                  <div>
                    <span className="text-surface-400 font-semibold block">Prior Therapy Experience:</span>
                    <span className="text-surface-800 font-medium capitalize">{intake.priorTherapyExperience || 'Not specified'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-surface-400 font-semibold block">Presenting Concerns:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {intake.presentingConcerns?.map((c, i) => (
                        <span key={i} className="px-2 py-0.5 bg-primary-50 text-primary-800 rounded-md text-[11px] font-semibold border border-primary-100">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-surface-400 font-semibold block">Client Therapy Goals:</span>
                    <p className="text-surface-700 bg-surface-50 p-2.5 rounded-xl border border-surface-100 mt-1">
                      {intake.goalsForTherapy || 'No specific goals provided.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-surface-500">
                  <p>Intake questionnaire has not been submitted by the client yet.</p>
                  <p className="text-[11px] text-surface-400 mt-1">
                    You can share the intake link with them or fill clinical notes below.
                  </p>
                </div>
              )}
            </div>

            {/* CLINICAL DOCUMENTATION & SOAP NOTES (Module 5) */}
            <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-surface-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2">
                    <span>📝</span> Clinical Documentation ({notes.length})
                  </h2>
                  <p className="text-[11px] text-surface-400 mt-0.5">
                    SOAP & DAP progress notes, private clinical formulation, and client shared resources.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNoteToEdit(null);
                    setIsNoteModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  + New Note
                </button>
              </div>

              {notes.length === 0 ? (
                <div className="py-8 text-center text-xs text-surface-400">
                  No session notes recorded yet. Click "+ New Note" to document a SOAP or DAP progress note.
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((n) => (
                    <article
                      key={n._id}
                      className="p-4 rounded-xl border border-surface-200 bg-surface-50/50 hover:border-surface-300 transition space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-200/60 pb-2.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-surface-900">{n.title}</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800 uppercase">
                              {n.noteType}
                            </span>
                          </div>
                          <span className="text-[11px] text-surface-400">
                            Session Date: {new Date(n.sessionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              n.visibility === 'shared'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-surface-200 text-surface-700'
                            }`}
                          >
                            {n.visibility === 'shared' ? '🌐 Shared with Client' : '🔒 Private'}
                          </span>

                          {n.isLocked && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              🔒 Signed
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedNoteToEdit(n);
                              setIsNoteModalOpen(true);
                            }}
                            className="p-1 text-surface-500 hover:text-primary-600 text-xs font-semibold"
                            title="Edit Note"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(n._id)}
                            className="p-1 text-surface-400 hover:text-rose-600 text-xs font-semibold"
                            title="Delete Note"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Structured SOAP Presentation */}
                      {n.noteType === 'soap' && n.soap && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          {n.soap.subjective && (
                            <div className="p-2.5 rounded-lg bg-white border border-surface-200">
                              <span className="font-bold text-primary-900 block mb-0.5">(S) Subjective</span>
                              <p className="text-surface-700">{n.soap.subjective}</p>
                            </div>
                          )}
                          {n.soap.objective && (
                            <div className="p-2.5 rounded-lg bg-white border border-surface-200">
                              <span className="font-bold text-primary-900 block mb-0.5">(O) Objective</span>
                              <p className="text-surface-700">{n.soap.objective}</p>
                            </div>
                          )}
                          {n.soap.assessment && (
                            <div className="p-2.5 rounded-lg bg-white border border-surface-200">
                              <span className="font-bold text-primary-900 block mb-0.5">(A) Assessment</span>
                              <p className="text-surface-700">{n.soap.assessment}</p>
                            </div>
                          )}
                          {n.soap.plan && (
                            <div className="p-2.5 rounded-lg bg-white border border-surface-200">
                              <span className="font-bold text-primary-900 block mb-0.5">(P) Plan</span>
                              <p className="text-surface-700">{n.soap.plan}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Structured DAP Presentation */}
                      {n.noteType === 'dap' && n.dap && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                          {n.dap.data && (
                            <div className="p-2.5 rounded-lg bg-white border border-surface-200">
                              <span className="font-bold text-primary-900 block mb-0.5">(D) Data</span>
                              <p className="text-surface-700">{n.dap.data}</p>
                            </div>
                          )}
                          {n.dap.assessment && (
                            <div className="p-2.5 rounded-lg bg-white border border-surface-200">
                              <span className="font-bold text-primary-900 block mb-0.5">(A) Assessment</span>
                              <p className="text-surface-700">{n.dap.assessment}</p>
                            </div>
                          )}
                          {n.dap.plan && (
                            <div className="p-2.5 rounded-lg bg-white border border-surface-200">
                              <span className="font-bold text-primary-900 block mb-0.5">(P) Plan</span>
                              <p className="text-surface-700">{n.dap.plan}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* TipTap Rich Text Presentation */}
                      {n.contentHtml && (
                        <div
                          className="text-xs text-surface-700 bg-white p-3 rounded-xl border border-surface-200 prose prose-xs max-w-none"
                          dangerouslySetInnerHTML={{ __html: n.contentHtml }}
                        />
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* Session History */}
            <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider flex items-center gap-2 border-b border-surface-100 pb-3">
                <span>🗓️</span> Appointment History ({sessions.length})
              </h2>

              {sessions.length === 0 ? (
                <p className="text-xs text-surface-400 py-4 text-center">No past or upcoming sessions on file.</p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((sess) => {
                    const sDate = parseISO(sess.startDateTime);
                    return (
                      <div
                        key={sess._id}
                        className="p-3.5 rounded-xl border border-surface-200 bg-surface-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-bold text-surface-900">{sess.serviceTitle}</div>
                          <div className="text-[11px] text-surface-500">
                            {format(sDate, 'dd MMM yyyy, hh:mm a')} • {sess.durationMinutes} mins • ₹{sess.priceInr}
                          </div>
                        </div>
                        <span
                          className={`self-start sm:self-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            sess.status === 'confirmed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : sess.status === 'completed'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-surface-200 text-surface-600'
                          }`}
                        >
                          {sess.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (1 Col): Consent Audit & Internal Notes */}
          <div className="space-y-6">
            {/* Consent Audit Box */}
            <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>🛡️</span> Digital Consent Audit Record
              </h3>
              <p className="text-[11px] text-surface-500">
                Auditable legal timestamp proving client accepted practice terms prior to consultations.
              </p>

              {consent ? (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl space-y-1.5 text-[11px]">
                  <div className="text-emerald-800 font-bold flex items-center gap-1">
                    <span>✓</span> Consent Affirmed & Recorded
                  </div>
                  <div className="text-surface-600">
                    <span className="font-semibold">Timestamp: </span>
                    {format(parseISO(consent.agreedAt || client.createdAt), 'dd MMM yyyy, HH:mm:ss')}
                  </div>
                  <div className="text-surface-600">
                    <span className="font-semibold">IP Address: </span>
                    {consent.ipAddress || '127.0.0.1'}
                  </div>
                  <div className="text-surface-600">
                    <span className="font-semibold">Version: </span>
                    {consent.consentVersion || 'v1.0'}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                  No digital consent record captured.
                </div>
              )}
            </div>

            {/* Purchased Packages & Session Credits (Module 4) */}
            <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>📦</span> Session Credits & Packages
              </h3>

              {clientPackages.length > 0 ? (
                <div className="space-y-3">
                  {clientPackages.map((cp) => (
                    <div key={cp._id} className="p-3 rounded-xl bg-primary-50/50 border border-primary-100 text-xs space-y-1.5">
                      <div className="flex justify-between items-baseline font-bold text-surface-900">
                        <span>{cp.packageTitle}</span>
                        <span className="text-[11px] font-mono text-emerald-700">
                          {cp.remainingSessions} / {cp.totalSessions} Left
                        </span>
                      </div>
                      <div className="w-full bg-surface-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all"
                          style={{ width: `${Math.round(((cp.totalSessions - cp.usedSessions) / cp.totalSessions) * 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-surface-500">
                        <span>Used: {cp.usedSessions}</span>
                        <span>
                          Expires: {new Date(cp.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-surface-400">
                  No multi-session care packages currently active for this client.
                </p>
              )}
            </div>

            {/* Internal Therapist Notes */}
            <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-surface-900 uppercase tracking-wider">
                  Internal Case Notes
                </h3>
                {notesSaved && <span className="text-[11px] font-bold text-emerald-600">Saved!</span>}
              </div>
              <p className="text-[11px] text-surface-400">
                Private notes visible ONLY to you. Never shared with the client.
              </p>

              <textarea
                rows={5}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Diagnostic impressions, payment arrangements, or case background..."
                className="w-full p-3 rounded-xl border border-surface-200 text-xs outline-none focus:border-primary-500 bg-surface-50 resize-y"
              />

              <button
                type="button"
                onClick={handleUpdateNotes}
                disabled={savingNotes}
                className="w-full py-2 bg-surface-800 hover:bg-surface-900 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                {savingNotes ? 'Saving Notes...' : 'Save Internal Notes'}
              </button>
            </div>
          </div>
        </div>

        {/* Clinical Note Modal (Module 5) */}
        <ClinicalNoteModal
          isOpen={isNoteModalOpen}
          onClose={() => setIsNoteModalOpen(false)}
          clientId={client._id}
          sessions={sessions}
          noteToEdit={selectedNoteToEdit}
          onNoteSaved={() => fetchClientData()}
        />
      </div>
    </TherapistLayout>
  );
}
