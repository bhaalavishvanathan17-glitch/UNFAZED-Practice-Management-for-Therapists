import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    city: 'New Delhi, India',
    headline: 'Licensed Clinical Psychologist & Counselor',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/api/auth/register', formData);
      const { therapist, token } = res.data.data;
      login(therapist, token);
      navigate('/dashboard/profile');
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-lg">U</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-surface-900">UNFAZED</span>
        </Link>
        <h2 className="text-3xl font-extrabold text-surface-900 tracking-tight">
          Create your therapist practice
        </h2>
        <p className="mt-2 text-sm text-surface-600">
          Get your custom branded link, practice portal, and scheduling.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl shadow-surface-200/50 rounded-2xl border border-surface-200 sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <span className="font-bold text-base leading-none">⚠️</span>
              <div>{error}</div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-surface-800 mb-1">
                Full Name with Title
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="e.g. Dr. Ananya Sharma"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition text-surface-900 text-sm"
              />
              <p className="mt-1 text-xs text-surface-400">
                Your public URL will automatically be generated from this (e.g. /dr-ananya-sharma).
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-800 mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                placeholder="dr.ananya@example.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition text-surface-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-800 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition text-surface-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-800 mb-1">
                Practice City
              </label>
              <input
                type="text"
                name="city"
                placeholder="e.g. New Delhi, Bengaluru, Mumbai"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition text-surface-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-800 mb-1">
                Professional Headline
              </label>
              <input
                type="text"
                name="headline"
                placeholder="e.g. Clinical Psychologist & CBT Specialist"
                value={formData.headline}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition text-surface-900 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-600/25 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Creating your practice...</span>
                </>
              ) : (
                'Create Practice Account'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-surface-500">
            Already have a practice account?{' '}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
              Log in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
