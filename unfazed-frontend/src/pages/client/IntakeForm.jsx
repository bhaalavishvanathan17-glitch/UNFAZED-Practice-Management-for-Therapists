import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';

const COMMON_CONCERNS = [
  'Work & Academic Burnout',
  'Generalized Anxiety & Panic',
  'Low Mood & Depression',
  'Relationship & Marriage Conflicts',
  'Grief & Bereavement',
  'Sleep Difficulties / Insomnia',
  'Self-Esteem & Identity',
  'Trauma & PTSD',
];

export default function IntakeForm() {
  const { clientId } = useParams();

  const [formData, setFormData] = useState({
    dateOfBirth: '',
    gender: 'female',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    presentingConcerns: [],
    priorTherapyExperience: 'no',
    currentMedications: '',
    goalsForTherapy: '',
    consentAgreed: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCheckboxChange = (concern) => {
    setFormData((prev) => {
      const exists = prev.presentingConcerns.includes(concern);
      const updated = exists
        ? prev.presentingConcerns.filter((c) => c !== concern)
        : [...prev.presentingConcerns, concern];
      return { ...prev, presentingConcerns: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.consentAgreed) {
      setErrorMsg('Please read and affirm the digital informed consent agreement.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      await api.post(`/api/clients/${clientId}/intake`, formData);
      setSubmitted(true);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to submit intake questionnaire.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center shadow-xl border border-surface-200 space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-3xl flex items-center justify-center mx-auto">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-surface-900">Intake Form Submitted</h1>
          <p className="text-xs text-surface-600 leading-relaxed max-w-md mx-auto">
            Thank you for completing your clinical intake background and digital consent agreement. Your responses have been safely recorded in your therapist’s confidential practice portal.
          </p>
          <div className="pt-4">
            <Link
              to="/"
              className="inline-block px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-xl transition"
            >
              Return to Practice Portal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 text-primary-700 text-xs font-semibold rounded-full border border-primary-200">
            <span>🛡️</span> Confidential & Secure Telehealth Intake
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight">
            Client Clinical Intake Form
          </h1>
          <p className="text-xs sm:text-sm text-surface-500 max-w-md mx-auto">
            Please fill out your demographic background, presenting symptoms, and therapeutic goals prior to your first consultation.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-surface-200 p-6 sm:p-8 shadow-sm space-y-6">
          {/* Section 1: Demographics */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-surface-900 uppercase tracking-wider border-b border-surface-100 pb-2">
              1. Personal Demographics
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  required
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Gender Identity</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 bg-white outline-none focus:border-primary-500"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Emergency Contact */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-surface-900 uppercase tracking-wider border-b border-surface-100 pb-2">
              2. Emergency Contact
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Contact Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suman Sen"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Relationship *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spouse / Parent"
                  value={formData.emergencyContactRelation}
                  onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="+91 9988776655"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Clinical Background & Focus Areas */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-surface-900 uppercase tracking-wider border-b border-surface-100 pb-2">
              3. Symptoms & Areas of Concern
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {COMMON_CONCERNS.map((concern) => (
                <label
                  key={concern}
                  className={`p-3 rounded-xl border text-xs font-medium cursor-pointer transition flex items-center gap-2.5 ${
                    formData.presentingConcerns.includes(concern)
                      ? 'bg-primary-50 border-primary-400 text-primary-900'
                      : 'bg-surface-50 border-surface-200 text-surface-700 hover:bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.presentingConcerns.includes(concern)}
                    onChange={() => handleCheckboxChange(concern)}
                    className="w-4 h-4 text-primary-600 rounded border-surface-300 focus:ring-primary-500"
                  />
                  <span>{concern}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Have you attended psychotherapy before?
                </label>
                <select
                  value={formData.priorTherapyExperience}
                  onChange={(e) => setFormData({ ...formData, priorTherapyExperience: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 bg-white outline-none focus:border-primary-500"
                >
                  <option value="no">No, this is my first time</option>
                  <option value="yes">Yes, I have prior experience</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Current Psychiatric / Physical Medications
                </label>
                <input
                  type="text"
                  placeholder="None or list medications..."
                  value={formData.currentMedications}
                  onChange={(e) => setFormData({ ...formData, currentMedications: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                What are your main goals for therapy?
              </label>
              <textarea
                rows={3}
                placeholder="Share any specific challenges, changes you wish to make, or expectations..."
                value={formData.goalsForTherapy}
                onChange={(e) => setFormData({ ...formData, goalsForTherapy: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-surface-200 outline-none focus:border-primary-500 resize-none"
              />
            </div>
          </div>

          {/* Section 4: Digital Consent & Timestamp Agreement */}
          <div className="p-4 bg-primary-50/70 border border-primary-200/80 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-primary-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>📜</span> Telehealth Informed Consent & Confidentiality
            </h3>
            <p className="text-[11px] text-surface-600 leading-relaxed">
              Sessions are confidential except where disclosure is required by law (e.g. imminent self-harm, harm to others, or court order). By clicking below, you confirm your voluntary participation in psychotherapy.
            </p>
            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="intakeConsent"
                required
                checked={formData.consentAgreed}
                onChange={(e) => setFormData({ ...formData, consentAgreed: e.target.checked })}
                className="mt-0.5 w-4 h-4 text-primary-600 rounded border-surface-300 focus:ring-primary-500 cursor-pointer"
              />
              <label htmlFor="intakeConsent" className="text-xs font-bold text-surface-800 cursor-pointer">
                I give informed consent to receive psychological consultation and confirm the accuracy of this information.
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-primary-600/25 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? 'Submitting confidential intake...' : 'Submit Clinical Intake & Consent'}
          </button>
        </form>
      </div>
    </div>
  );
}
