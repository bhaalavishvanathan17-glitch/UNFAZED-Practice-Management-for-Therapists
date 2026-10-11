const { parseISO, addMinutes, format, isBefore, isAfter, startOfDay, endOfDay } = require('date-fns');
const { toZonedTime, fromZonedTime } = require('date-fns-tz');

/**
 * Generates available bookable slots for a therapist on a given date (YYYY-MM-DD),
 * taking into account:
 * 1. Weekly schedule for that day of week
 * 2. Overrides (blocked days or custom slots)
 * 3. Configured session duration (30, 45, 60, 90 mins)
 * 4. Buffer times between consecutive sessions
 * 5. Existing booked sessions (preventing overlaps)
 * 6. Minimum advance notice period
 */
const generateAvailableSlots = ({
  targetDateStr, // "YYYY-MM-DD"
  availability,
  existingSessions,
  durationMinutes = 60,
  clientTimeZone = 'Asia/Kolkata',
}) => {
  const timeZone = availability.timeZone || 'Asia/Kolkata';
  const bufferMinutes = availability.bufferMinutes || 15;
  const noticeHours = availability.noticePeriodHours || 2;

  // 1. Check if there is a specific date override
  const override = availability.overrides?.find((o) => o.date === targetDateStr);
  if (override && override.isBlocked) {
    return []; // Entire day is blocked
  }

  // Parse target date in therapist's timezone
  const [year, month, day] = targetDateStr.split('-').map(Number);
  // Date in local therapist timezone (0-indexed month for JS Date)
  const targetDayObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const dayOfWeek = toZonedTime(targetDayObj, timeZone).getDay();

  let activeTimeWindows = [];

  if (override && override.customSlots?.length > 0) {
    activeTimeWindows = override.customSlots;
  } else {
    const daySchedule = availability.weeklySchedule?.find((s) => s.dayOfWeek === dayOfWeek);
    if (!daySchedule || !daySchedule.isActive || !daySchedule.slots?.length) {
      return []; // Day not working
    }
    activeTimeWindows = daySchedule.slots;
  }

  const nowUTC = new Date();
  const minBookableTime = addMinutes(nowUTC, noticeHours * 60);

  const availableSlots = [];

  // 2. Iterate each working window (e.g. 10:00 to 18:00)
  for (const window of activeTimeWindows) {
    const [startH, startM] = window.startTime.split(':').map(Number);
    const [endH, endM] = window.endTime.split(':').map(Number);

    // Construct local ISO strings in therapist timezone
    const windowStartLocalStr = `${targetDateStr}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`;
    const windowEndLocalStr = `${targetDateStr}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`;

    // Convert local window boundaries to UTC Dates
    let currentSlotStartUTC = fromZonedTime(windowStartLocalStr, timeZone);
    const windowEndUTC = fromZonedTime(windowEndLocalStr, timeZone);

    while (true) {
      const currentSlotEndUTC = addMinutes(currentSlotStartUTC, durationMinutes);

      // Check if slot exceeds window boundary
      if (isAfter(currentSlotEndUTC, windowEndUTC)) {
        break;
      }

      // Check if slot satisfies advance notice period
      const isPastOrTooSoon = isBefore(currentSlotStartUTC, minBookableTime);

      if (!isPastOrTooSoon) {
        // Check for conflicts with existing sessions (including buffer)
        const hasConflict = existingSessions.some((session) => {
          if (['cancelled', 'rescheduled'].includes(session.status)) return false;

          const sessionStart = new Date(session.startDateTime);
          const sessionEnd = new Date(session.endDateTime);

          // Conflict if newSlotStart < existingSessionEnd + buffer && newSlotEnd > existingSessionStart - buffer
          const sessionEndWithBuffer = addMinutes(sessionEnd, bufferMinutes);
          const sessionStartMinusBuffer = addMinutes(sessionStart, -bufferMinutes);

          return (
            isBefore(currentSlotStartUTC, sessionEndWithBuffer) &&
            isAfter(currentSlotEndUTC, sessionStartMinusBuffer)
          );
        });

        if (!hasConflict) {
          // Format slot in local therapist and client formats
          const slotZoned = toZonedTime(currentSlotStartUTC, clientTimeZone);
          availableSlots.push({
            startDateTimeUTC: currentSlotStartUTC.toISOString(),
            endDateTimeUTC: currentSlotEndUTC.toISOString(),
            formattedTime: format(slotZoned, 'hh:mm a'),
            displayDate: targetDateStr,
            durationMinutes,
          });
        }
      }

      // Next slot begins after current slot + configured buffer time
      currentSlotStartUTC = addMinutes(currentSlotEndUTC, bufferMinutes);
    }
  }

  return availableSlots;
};

module.exports = {
  generateAvailableSlots,
};
