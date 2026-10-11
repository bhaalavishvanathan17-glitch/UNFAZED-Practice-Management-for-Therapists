const mongoose = require('mongoose');

/**
 * Time slot template inside a day
 * Example: startTime: "09:00", endTime: "17:00"
 */
const timeSlotSchema = new mongoose.Schema({
  startTime: {
    type: String, // "09:00" in 24h format
    required: true,
  },
  endTime: {
    type: String, // "17:00" in 24h format
    required: true,
  },
}, { _id: false });

/**
 * Weekly schedule day template
 * dayOfWeek: 0 (Sunday) to 6 (Saturday)
 */
const weeklyScheduleSchema = new mongoose.Schema({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  slots: {
    type: [timeSlotSchema],
    default: [{ startTime: '09:00', endTime: '17:00' }],
  },
}, { _id: false });

/**
 * Specific date override
 * Example: Taking a specific date off, or working special hours
 */
const overrideSchema = new mongoose.Schema({
  date: {
    type: String, // "YYYY-MM-DD"
    required: true,
  },
  isBlocked: {
    type: Boolean,
    default: true, // true means completely blocked off
  },
  reason: {
    type: String,
    default: 'Unavailable',
  },
  customSlots: {
    type: [timeSlotSchema],
    default: [],
  },
}, { _id: true });

const availabilitySchema = new mongoose.Schema({
  therapistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Therapist',
    required: true,
    unique: true, // One availability document per therapist
    index: true,
  },
  timeZone: {
    type: String,
    default: 'Asia/Kolkata',
  },
  bufferMinutes: {
    type: Number,
    default: 15, // 15 mins gap between consecutive sessions
    min: 0,
    max: 60,
  },
  noticePeriodHours: {
    type: Number,
    default: 2, // minimum 2 hours advance booking notice
    min: 0,
  },
  maxDaysInAdvance: {
    type: Number,
    default: 30, // booking window open for next 30 days
    min: 1,
    max: 180,
  },
  weeklySchedule: {
    type: [weeklyScheduleSchema],
    default: [
      { dayOfWeek: 1, isActive: true, slots: [{ startTime: '10:00', endTime: '18:00' }] }, // Monday
      { dayOfWeek: 2, isActive: true, slots: [{ startTime: '10:00', endTime: '18:00' }] }, // Tuesday
      { dayOfWeek: 3, isActive: true, slots: [{ startTime: '10:00', endTime: '18:00' }] }, // Wednesday
      { dayOfWeek: 4, isActive: true, slots: [{ startTime: '10:00', endTime: '18:00' }] }, // Thursday
      { dayOfWeek: 5, isActive: true, slots: [{ startTime: '10:00', endTime: '18:00' }] }, // Friday
      { dayOfWeek: 6, isActive: true, slots: [{ startTime: '11:00', endTime: '16:00' }] }, // Saturday
      { dayOfWeek: 0, isActive: false, slots: [] }, // Sunday off
    ],
  },
  overrides: {
    type: [overrideSchema],
    default: [],
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Availability', availabilitySchema);
