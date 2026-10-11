import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import TipTapEditor from './TipTapEditor';

export default function ClinicalNoteModal({
  isOpen,
  onClose,
  clientId,
  sessions = [],
  noteToEdit = null,
  onNoteSaved,
}) {
  const [noteType, setNoteType] = useState('soap'); // 'soap', 'dap', 'freeform'
  const [title, setTitle] = useState('Clinical Progress Note');
  const [sessionId, setSessionId] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [visibility, setVisibility] = useState('private'); // 'private' or 'shared'
  const [isLocked, setIsLocked] = useState(false);
  const [contentHtml, setContentHtml] = useState('');

  // Structured SOAP fields
  const [soap, setSoap] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });

  // Structured DAP fields
  const [dap, setDap] = useState({
    data: '',
    assessment: '',
    plan: '',
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (noteToEdit) {
      setNoteType(noteToEdit.noteType || 'soap');
      setTitle(noteToEdit.title || '');
      setSessionId(noteToEdit.sessionId || '');
      setSessionDate(
        noteToEdit.sessionDate
          ? new Date(noteToEdit.sessionDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setVisibility(noteToEdit.visibility || 'private');
      setIsLocked(noteToEdit.isLocked || false);
      setContentHtml(noteToEdit.contentHtml || '');
      if (noteToEdit.soap) setSoap(noteToEdit.soap);
      if (noteToEdit.dap) setDap(noteToEdit.dap);
    } else {
      setNoteType('soap');
      setTitle('SOAP Progress Note');
      setSessionId(sessions[0]?._id || '');
      setSessionDate(new Date().toISOString().split('T')[0]);
      setVisibility('private');
      setIsLocked(false);
      setContentHtml('');
      setSoap({ subjective: '', objective: '', assessment: '', plan: '' });
      setDap({ data: '', assessment: '', plan: '' });
    }
  }, [noteToEdit, isOpen]);

  if (!isOpen) return null;

  const handleTemplateChange = (type) => {
    setNoteType(type);
    if (!noteToEdit) {
      if (type === 'soap') setTitle('SOAP Progress Note');
      else if (type === 'dap') setTitle('DAP Session Note');
      else setTitle('Clinical Synthesis Note');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErrorMsg('');

      const payload = {
        clientId,
        sessionId: sessionId || null,
        noteType,
        title,
        visibility,
        contentHtml,
        sessionDate,
        isLocked,
        soap,
        dap,
      };

      let res;
      if (noteToEdit) {
        res = await api.put(`/api/notes/${noteToEdit._id}`, payload);
      } else {
        res = await api.post('/api/notes', payload);
      }

      if (onNoteSaved) onNoteSaved(res.data.data.note);
      onClose();
    } catch (err) {
      console.error('Error saving note:', err);
      setErrorMsg(err?.response?.data?.message || 'Failed to save clinical note.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-surface-200 relative my-8 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-100 hover:bg-surface-200 text-surface-600 flex items-center justify-center text-sm font-bold transition cursor-pointer"
        >
          ✕
        </button>

        <div className="mb-6">
          <span className="text-[11px] font-bold text-primary-600 uppercase tracking-wider">
            Clinical Documentation
          </span>
          <h2 className="text-xl font-bold text-surface-900 mt-0.5">
            {noteToEdit ? 'Edit Clinical Session Note' : 'New Clinical Progress Note'}
          </h2>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Note Template Format Switcher */}
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1.5">
              Documentation Framework
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTemplateChange('soap')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  noteType === 'soap'
                    ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-100'
                    : 'border-surface-200 hover:bg-surface-50 text-surface-600'
                }`}
              >
                📋 SOAP Note
              </button>
              <button
                type="button"
                onClick={() => handleTemplateChange('dap')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  noteType === 'dap'
                    ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-100'
                    : 'border-surface-200 hover:bg-surface-50 text-surface-600'
                }`}
              >
                📑 DAP Note
              </button>
              <button
                type="button"
                onClick={() => handleTemplateChange('freeform')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  noteType === 'freeform'
                    ? 'border-primary-500 bg-primary-50 text-primary-700 ring-2 ring-primary-100'
                    : 'border-surface-200 hover:bg-surface-50 text-surface-600'
                }`}
              >
                ✍️ Rich Free-form
              </button>
            </div>
          </div>

          {/* Meta Fields: Title, Session Link, Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-surface-700 mb-1">Note Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Session Date</label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Link to Session</label>
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 bg-white outline-none focus:border-primary-500"
              >
                <option value="">General (No specific session)</option>
                {sessions.map((s) => (
                  <option key={s._id} value={s._id}>
                    {new Date(s.startDateTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — {s.serviceTitle}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SOAP STRUCTURED INPUTS */}
          {noteType === 'soap' && (
            <div className="space-y-3 p-4 bg-surface-50 rounded-2xl border border-surface-200">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-primary-900 mb-1">
                  (S) Subjective — Client reported symptoms & narrative
                </label>
                <textarea
                  rows={2}
                  value={soap.subjective}
                  onChange={(e) => setSoap({ ...soap, subjective: e.target.value })}
                  placeholder="Direct quotes, presenting complaints, client perception of week..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 bg-white outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-primary-900 mb-1">
                  (O) Objective — Clinical observations, affect & behavior
                </label>
                <textarea
                  rows={2}
                  value={soap.objective}
                  onChange={(e) => setSoap({ ...soap, objective: e.target.value })}
                  placeholder="Mental status exam, eye contact, speech rate, physical presentation..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 bg-white outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-primary-900 mb-1">
                  (A) Assessment — Clinical synthesis & diagnostic formulation
                </label>
                <textarea
                  rows={2}
                  value={soap.assessment}
                  onChange={(e) => setSoap({ ...soap, assessment: e.target.value })}
                  placeholder="Therapeutic evaluation, progress toward treatment goals..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 bg-white outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-primary-900 mb-1">
                  (P) Plan — Interventions, homework & next session focus
                </label>
                <textarea
                  rows={2}
                  value={soap.plan}
                  onChange={(e) => setSoap({ ...soap, plan: e.target.value })}
                  placeholder="Assigned behavioral homework, frequency of next consultation..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 bg-white outline-none focus:border-primary-500"
                />
              </div>
            </div>
          )}

          {/* DAP STRUCTURED INPUTS */}
          {noteType === 'dap' && (
            <div className="space-y-3 p-4 bg-surface-50 rounded-2xl border border-surface-200">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-primary-900 mb-1">
                  (D) Data — Session description, client input & therapist interventions
                </label>
                <textarea
                  rows={3}
                  value={dap.data}
                  onChange={(e) => setDap({ ...dap, data: e.target.value })}
                  placeholder="What occurred in the session, topics explored..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 bg-white outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-primary-900 mb-1">
                  (A) Assessment — Clinical impression & response to interventions
                </label>
                <textarea
                  rows={2}
                  value={dap.assessment}
                  onChange={(e) => setDap({ ...dap, assessment: e.target.value })}
                  placeholder="Clinical assessment of client's emotional and behavioral state..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 bg-white outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-primary-900 mb-1">
                  (P) Plan — Treatment plan adjustments & homework
                </label>
                <textarea
                  rows={2}
                  value={dap.plan}
                  onChange={(e) => setDap({ ...dap, plan: e.target.value })}
                  placeholder="Upcoming therapeutic interventions and scheduled follow-ups..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 bg-white outline-none focus:border-primary-500"
                />
              </div>
            </div>
          )}

          {/* TIPTAP RICH-TEXT SYNTHESIS EDITOR */}
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1.5">
              {noteType === 'freeform' ? 'Clinical Note Content (TipTap Rich Text) *' : 'Additional Narrative & Clinical Notes (TipTap)'}
            </label>
            <TipTapEditor
              content={contentHtml}
              onChange={(html) => setContentHtml(html)}
              placeholder="Clinical dialogue, verbatim quotes, psychometric scores..."
            />
          </div>

          {/* VISIBILITY & ACCESS-CONTROL SETTINGS */}
          <div className="p-4 rounded-2xl border border-surface-200 bg-surface-50 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-surface-700">
              Confidentiality & Access-Control
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 cursor-pointer transition ${
                  visibility === 'private'
                    ? 'border-surface-800 bg-white shadow-xs font-semibold text-surface-900'
                    : 'border-surface-200 text-surface-600 hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={() => setVisibility('private')}
                  className="mt-0.5 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <span className="block font-bold">🔒 Private Note</span>
                  <span className="text-[10px] text-surface-500 font-normal">
                    Therapist eyes only. Never visible in client portal.
                  </span>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 cursor-pointer transition ${
                  visibility === 'shared'
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-xs font-semibold text-emerald-900'
                    : 'border-surface-200 text-surface-600 hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value="shared"
                  checked={visibility === 'shared'}
                  onChange={() => setVisibility('shared')}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="block font-bold">🌐 Shared with Client</span>
                  <span className="text-[10px] text-surface-500 font-normal">
                    Take-home exercise or shared session summary.
                  </span>
                </div>
              </label>
            </div>

            {/* Note Lock Toggle */}
            <div className="pt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="isLocked"
                checked={isLocked}
                onChange={(e) => setIsLocked(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded border-surface-300 focus:ring-primary-500 cursor-pointer"
              />
              <label htmlFor="isLocked" className="text-xs text-surface-700 cursor-pointer font-medium">
                Sign & Lock Note (prevents inadvertent edits)
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-surface-600 hover:bg-surface-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-primary-600/25 transition disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Saving Note...' : 'Save Clinical Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
