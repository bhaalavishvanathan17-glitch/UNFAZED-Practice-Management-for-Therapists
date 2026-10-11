import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';

export default function ClientNotesPortal() {
  const { clientId } = useParams();
  const [sharedNotes, setSharedNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchSharedNotes();
  }, [clientId]);

  const fetchSharedNotes = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get(`/api/notes/portal/${clientId}`);
      setSharedNotes(res.data?.data?.sharedNotes || []);
    } catch (err) {
      console.error('Error fetching shared notes:', err);
      setErrorMsg(err?.response?.data?.message || 'Could not load shared notes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900">
      {/* Header */}
      <header className="bg-white border-b border-surface-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              U
            </div>
            <div>
              <span className="font-bold text-sm text-surface-900 block leading-none">UNFAZED</span>
              <span className="text-[10px] text-surface-500 font-medium">Client Care Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={`/portal/${clientId}/chat`}
              className="text-xs px-3 py-1.5 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100 font-semibold transition flex items-center gap-1.5"
            >
              <span>💬</span>
              <span>Direct Chat</span>
            </Link>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
              🔒 Secure Clinical Portal
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-surface-900 tracking-tight">
            Shared Session Notes & Resources
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Access take-home exercises, therapeutic homework, and summaries explicitly shared by your therapist.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="p-16 text-center text-xs text-surface-500">
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading your shared clinical documents...
          </div>
        ) : sharedNotes.length === 0 ? (
          <div className="bg-white rounded-3xl border border-surface-200 p-12 text-center shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-100 text-surface-400 flex items-center justify-center text-2xl mx-auto">
              📝
            </div>
            <h3 className="text-base font-bold text-surface-800">No Notes Shared Yet</h3>
            <p className="text-xs text-surface-500 max-w-sm mx-auto">
              Your therapist hasn't shared any session takeaways or exercises yet. New materials will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sharedNotes.map((note) => (
              <article
                key={note._id}
                className="bg-white rounded-2xl border border-surface-200 p-6 sm:p-7 shadow-xs space-y-4 transition hover:border-surface-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                      {note.noteType.toUpperCase()} RESOURCE
                    </span>
                    <h2 className="text-lg font-bold text-surface-900 mt-1">{note.title}</h2>
                  </div>
                  <span className="text-xs text-surface-400">
                    Shared on {new Date(note.sharedAt || note.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {note.contentHtml ? (
                  <div
                    className="text-xs text-surface-700 leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: note.contentHtml }}
                  />
                ) : (
                  <p className="text-xs text-surface-500 italic">No text content provided.</p>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
