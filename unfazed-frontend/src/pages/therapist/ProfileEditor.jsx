import React, { useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import TherapistLayout from '../../components/profile/TherapistLayout';

export default function ProfileEditor() {
  const { therapist, updateTherapistState } = useAuth();

  const [formData, setFormData] = useState({
    name: therapist?.name || '',
    headline: therapist?.headline || '',
    bio: therapist?.bio || '',
    city: therapist?.city || '',
    contactPhone: therapist?.contactPhone || '',
    experienceYears: therapist?.experienceYears || 5,
    customSlug: therapist?.slug || '',
    specializationsStr: (therapist?.specializations || []).join(', '),
    languagesStr: (therapist?.languages || []).join(', '),
    qualificationsStr: (therapist?.qualifications || []).join(', '),
    services: therapist?.services || [],
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleServiceChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.services];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, services: updated };
    });
    setSuccessMsg('');
    setErrorMsg('');
  };

  const addService = () => {
    setFormData((prev) => ({
      ...prev,
      services: [
        ...prev.services,
        {
          title: 'New Consultation Service',
          description: 'Personalized therapy session.',
          durationMinutes: 60,
          priceInr: 1500,
          mode: 'video',
          isActive: true,
        },
      ],
    }));
  };

  const removeService = (index) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      // Parse comma-separated strings to clean arrays
      const payload = {
        name: formData.name,
        headline: formData.headline,
        bio: formData.bio,
        city: formData.city,
        contactPhone: formData.contactPhone,
        experienceYears: Number(formData.experienceYears),
        customSlug: formData.customSlug,
        specializations: formData.specializationsStr
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        languages: formData.languagesStr
          .split(',')
          .map((l) => l.trim())
          .filter(Boolean),
        qualifications: formData.qualificationsStr
          .split(',')
          .map((q) => q.trim())
          .filter(Boolean),
        services: formData.services,
      };

      const res = await api.put('/api/therapists/profile', payload);
      const updatedTherapist = res.data.data.therapist;
      updateTherapistState(updatedTherapist);
      setSuccessMsg('Profile and public website successfully updated!');
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TherapistLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-surface-200">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Practice Profile & Branding</h1>
            <p className="text-sm text-surface-500 mt-1">
              Customize how your practice looks on your branded public website.
            </p>
          </div>
          {therapist?.slug && (
            <a
              href={`/${therapist.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-xl border border-primary-200 transition"
            >
              <span>View Live Website</span>
              <span>↗</span>
            </a>
          )}
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Card 1: Core Details */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-surface-900 border-b border-surface-100 pb-3">
              1. Basic Information & Practice URL
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-700 mb-1">
                  Full Name with Title
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 focus:border-primary-500 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-700 mb-1">
                  Unique Practice URL Slug
                </label>
                <div className="flex rounded-xl border border-surface-200 overflow-hidden focus-within:border-primary-500">
                  <span className="px-3 py-2.5 bg-surface-100 text-surface-500 text-sm select-none border-r border-surface-200">
                    unfazed.in/
                  </span>
                  <input
                    type="text"
                    name="customSlug"
                    value={formData.customSlug}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 text-sm outline-none"
                  />
                </div>
                <p className="text-[11px] text-surface-400 mt-1">Unique branded link for clients to book you.</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-700 mb-1">
                  Professional Headline
                </label>
                <input
                  type="text"
                  name="headline"
                  value={formData.headline}
                  onChange={handleChange}
                  placeholder="e.g. RCI Licensed Clinical Psychologist | Cognitive Behavioral Therapist"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 focus:border-primary-500 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-700 mb-1">
                  Clinic Location / City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. South Extension, New Delhi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 focus:border-primary-500 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-700 mb-1">
                  Years of Clinical Experience
                </label>
                <input
                  type="number"
                  name="experienceYears"
                  min={0}
                  value={formData.experienceYears}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 focus:border-primary-500 text-sm outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-700 mb-1">
                  Therapist Biography & Approach
                </label>
                <textarea
                  name="bio"
                  rows={4}
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Share your therapeutic approach, empathetic philosophy, and experience helping clients navigate mental health..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 focus:border-primary-500 text-sm outline-none resize-y"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Credentials & Tags */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-surface-900 border-b border-surface-100 pb-3">
              2. Credentials, Languages & Specializations
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-700 mb-1">
                  Specializations (comma separated)
                </label>
                <input
                  type="text"
                  name="specializationsStr"
                  value={formData.specializationsStr}
                  onChange={handleChange}
                  placeholder="Anxiety, CBT, Depression, Grief, Couples Counseling"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 focus:border-primary-500 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-700 mb-1">
                  Languages Spoken (comma separated)
                </label>
                <input
                  type="text"
                  name="languagesStr"
                  value={formData.languagesStr}
                  onChange={handleChange}
                  placeholder="English, Hindi, Bengali, Tamil"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 focus:border-primary-500 text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-700 mb-1">
                  Degrees & Certifications (comma separated)
                </label>
                <input
                  type="text"
                  name="qualificationsStr"
                  value={formData.qualificationsStr}
                  onChange={handleChange}
                  placeholder="M.Phil Clinical Psychology (NIMHANS), RCI Reg No. A12345, Certified EMDR Practitioner"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 focus:border-primary-500 text-sm outline-none"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Offered Services & Consultation Fees */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-surface-100 pb-3">
              <h2 className="text-base font-bold text-surface-900">
                3. Consultation Services & Pricing
              </h2>
              <button
                type="button"
                onClick={addService}
                className="text-xs font-semibold text-primary-600 hover:text-primary-800 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200 transition"
              >
                + Add Service
              </button>
            </div>

            <div className="space-y-4">
              {formData.services.map((service, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-surface-200 bg-surface-50/50 space-y-4 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-surface-500 uppercase tracking-wider">
                      Service #{idx + 1}
                    </span>
                    {formData.services.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeService(idx)}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-surface-700 mb-1">Service Title</label>
                      <input
                        type="text"
                        value={service.title}
                        onChange={(e) => handleServiceChange(idx, 'title', e.target.value)}
                        placeholder="e.g. Individual Psychotherapy"
                        className="w-full px-3 py-2 bg-white rounded-lg border border-surface-200 text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-surface-700 mb-1">Duration (Mins)</label>
                      <select
                        value={service.durationMinutes}
                        onChange={(e) => handleServiceChange(idx, 'durationMinutes', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-surface-200 text-sm outline-none"
                      >
                        <option value={30}>30 mins</option>
                        <option value={45}>45 mins</option>
                        <option value={60}>60 mins</option>
                        <option value={90}>90 mins</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-surface-700 mb-1">Price (₹ INR)</label>
                      <input
                        type="number"
                        min={0}
                        value={service.priceInr}
                        onChange={(e) => handleServiceChange(idx, 'priceInr', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white rounded-lg border border-surface-200 text-sm outline-none"
                      />
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-xs font-semibold text-surface-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={service.description}
                        onChange={(e) => handleServiceChange(idx, 'description', e.target.value)}
                        placeholder="Brief summary of what client can expect..."
                        className="w-full px-3 py-2 bg-white rounded-lg border border-surface-200 text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit button */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-600/20 transition disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving changes...</span>
                </>
              ) : (
                'Save Profile & Publish'
              )}
            </button>
          </div>
        </form>
      </div>
    </TherapistLayout>
  );
}
