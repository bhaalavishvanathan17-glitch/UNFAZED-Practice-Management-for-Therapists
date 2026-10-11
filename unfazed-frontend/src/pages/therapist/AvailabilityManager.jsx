import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import TherapistLayout from '../../components/profile/TherapistLayout';

const DAYS = [
  { index: 1, name: 'Monday' },
  { index: 2, name: 'Tuesday' },
  { index: 3, name: 'Wednesday' },
  { index: 4, name: 'Thursday' },
  { index: 5, name: 'Friday' },
  { index: 6, name: 'Saturday' },
  { index: 0, name: 'Sunday' },
];

export default function AvailabilityManager() {
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // New override form state
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideReason, setOverrideReason] = useState('Personal leave / off');

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/availability/me');
      setAvailability(res.data.data.availability);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to load availability settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (dayOfWeek) => {
    setAvailability((prev) => {
      const schedule = [...prev.weeklySchedule];
      const idx = schedule.findIndex((s) => s.dayOfWeek === dayOfWeek);
      if (idx !== -1) {
        schedule[idx] = { ...schedule[idx], isActive: !schedule[idx].isActive };
      } else {
        schedule.push({
          dayOfWeek,
          isActive: true,
          slots: [{ startTime: '09:00', endTime: '17:00' }],
        });
      }
      return { ...prev, weeklySchedule: schedule };
    });
    setSuccessMsg('');
  };

  const handleTimeChange = (dayOfWeek, field, value) => {
    setAvailability((prev) => {
      const schedule = [...prev.weeklySchedule];
      const idx = schedule.findIndex((s) => s.dayOfWeek === dayOfWeek);
      if (idx !== -1) {
        const slots = [...schedule[idx].slots];
        if (!slots.length) slots.push({ startTime: '09:00', endTime: '17:00' });
        slots[0] = { ...slots[0], [field]: value };
        schedule[idx] = { ...schedule[idx], slots };
      }
      return { ...prev, weeklySchedule: schedule };
    });
    setSuccessMsg('');
  };

  const handleAddOverride = () => {
    if (!overrideDate) return;
    setAvailability((prev) => ({
      ...prev,
      overrides: [
        ...(prev.overrides || []),
        { date: overrideDate, isBlocked: true, reason: overrideReason },
      ],
    }));
    setOverrideDate('');
    setOverrideReason('Personal leave / off');
  };

  const handleRemoveOverride = (dateToRemove) => {
    setAvailability((prev) => ({
      ...prev,
      overrides: prev.overrides.filter((o) => o.date !== dateToRemove),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await api.put('/api/availability/me', availability);
      setAvailability(res.data.data.availability);
      setSuccessMsg('Availability and scheduling buffer saved successfully!');
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'Failed to save availability.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <TherapistLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-surface-600">Loading schedule templates...</p>
        </div>
      </TherapistLayout>
    );
  }

  return (
    <TherapistLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-surface-200">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight">Availability & Scheduling</h1>
            <p className="text-sm text-surface-500 mt-1">
              Configure your working days, session hours, buffer times between clients, and vacation overrides.
            </p>
          </div>
        </div>

        {/* Feedback Alerts */}
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

        <form onSubmit={handleSave} className="space-y-8">
          {/* Card 1: Buffer & Global Policies */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-surface-900 border-b border-surface-100 pb-3 flex items-center gap-2">
              <span>⏱️</span> Scheduling Buffer & Timezone
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-700 mb-1">
                  Buffer Between Sessions
                </label>
                <select
                  value={availability.bufferMinutes}
                  onChange={(e) => setAvailability({ ...availability, bufferMinutes: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 bg-white text-sm outline-none"
                >
                  <option value={0}>0 minutes (Back-to-back)</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes (Recommended)</option>
                  <option value={30}>30 minutes</option>
                </select>
                <p className="text-[11px] text-surface-400 mt-1">Buffer rest period before client can book next slot.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-700 mb-1">
                  Notice Period Required
                </label>
                <select
                  value={availability.noticePeriodHours}
                  onChange={(e) => setAvailability({ ...availability, noticePeriodHours: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 bg-white text-sm outline-none"
                >
                  <option value={1}>1 hour in advance</option>
                  <option value={2}>2 hours in advance</option>
                  <option value={12}>12 hours in advance</option>
                  <option value={24}>24 hours in advance</option>
                </select>
                <p className="text-[11px] text-surface-400 mt-1">Prevents last-minute unexpected bookings.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-surface-700 mb-1">
                  Practice Time Zone
                </label>
                <input
                  type="text"
                  disabled
                  value={availability.timeZone || 'Asia/Kolkata (IST)'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 bg-surface-100 text-surface-500 text-sm cursor-not-allowed"
                />
                <p className="text-[11px] text-surface-400 mt-1">India Standard Time (IST - UTC+05:30).</p>
              </div>
            </div>
          </div>

          {/* Card 2: Weekly Schedule Template */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-surface-900 border-b border-surface-100 pb-3 flex items-center gap-2">
              <span>📅</span> Weekly Availability Hours
            </h2>

            <div className="space-y-3">
              {DAYS.map((day) => {
                const dayConfig = availability.weeklySchedule?.find((s) => s.dayOfWeek === day.index) || {
                  isActive: false,
                  slots: [{ startTime: '09:00', endTime: '17:00' }],
                };
                const slot = dayConfig.slots?.[0] || { startTime: '09:00', endTime: '17:00' };

                return (
                  <div
                    key={day.index}
                    className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      dayConfig.isActive ? 'bg-surface-50/50 border-surface-200' : 'bg-surface-100/40 border-surface-200/50 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-40">
                      <input
                        type="checkbox"
                        checked={dayConfig.isActive}
                        onChange={() => handleDayToggle(day.index)}
                        id={`day-${day.index}`}
                        className="w-4 h-4 text-primary-600 rounded border-surface-300 focus:ring-primary-500 cursor-pointer"
                      />
                      <label htmlFor={`day-${day.index}`} className="text-sm font-bold text-surface-900 cursor-pointer">
                        {day.name}
                      </label>
                    </div>

                    {dayConfig.isActive ? (
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs text-surface-500">From:</span>
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={(e) => handleTimeChange(day.index, 'startTime', e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-surface-200 text-sm bg-white"
                        />
                        <span className="text-xs text-surface-500">To:</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={(e) => handleTimeChange(day.index, 'endTime', e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-surface-200 text-sm bg-white"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 text-xs font-semibold text-surface-400">
                        Unavailable (Day Off)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Date Overrides (Blocked Dates / Holidays) */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-surface-900 border-b border-surface-100 pb-3 flex items-center gap-2">
              <span>🏖️</span> Blocked Dates & Overrides
            </h2>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-surface-200 text-sm outline-none w-full sm:w-auto"
              />
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Reason (e.g. Leave, Conference)"
                className="px-3.5 py-2.5 rounded-xl border border-surface-200 text-sm outline-none flex-1 w-full"
              />
              <button
                type="button"
                onClick={handleAddOverride}
                className="w-full sm:w-auto px-4 py-2.5 bg-surface-800 hover:bg-surface-900 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                + Block Date
              </button>
            </div>

            {availability.overrides?.length > 0 ? (
              <div className="space-y-2 pt-2">
                {availability.overrides.map((override) => (
                  <div
                    key={override.date}
                    className="p-3 bg-red-50 border border-red-200/70 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-red-800">{override.date}</span>
                      <span className="text-red-600">— {override.reason || 'Blocked'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveOverride(override.date)}
                      className="text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-surface-400">No specific dates currently blocked off.</p>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-600/20 transition disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving availability...</span>
                </>
              ) : (
                'Save Availability'
              )}
            </button>
          </div>
        </form>
      </div>
    </TherapistLayout>
  );
}
