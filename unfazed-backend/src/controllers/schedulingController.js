const Availability = require('../models/Availability');
const Session = require('../models/Session');
const Therapist = require('../models/Therapist');
const { generateAvailableSlots } = require('../utils/slotCalculator');
const { addMinutes, isBefore, isAfter } = require('date-fns');
const {
  sendBookingConfirmation,
  createInAppNotification,
  sendWhatsAppNotificationStub,
} = require('../services/notificationService');
const { emitAnalytics } = require('../utils/analytics');

/**
 * Helper to ensure a therapist has an availability document,
 * creating a sensible default if one doesn't exist yet.
 */
const getOrCreateAvailability = async (therapistId) => {
  let availability = await Availability.findOne({ therapistId });
  if (!availability) {
    availability = await Availability.create({
      therapistId,
      timeZone: 'Asia/Kolkata',
      bufferMinutes: 15,
      noticePeriodHours: 2,
    });
  }
  return availability;
};

/**
 * @desc    Get therapist's configured availability template
 * @route   GET /api/availability/me
 * @access  Private (Therapist)
 */
const getMyAvailability = async (req, res) => {
  try {
    const availability = await getOrCreateAvailability(req.therapist._id);
    return res.status(200).json({
      status: 'success',
      data: { availability },
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve availability settings.',
    });
  }
};

/**
 * @desc    Update therapist's availability settings, weekly template, overrides & buffer
 * @route   PUT /api/availability/me
 * @access  Private (Therapist)
 */
const updateMyAvailability = async (req, res) => {
  try {
    const { weeklySchedule, overrides, bufferMinutes, timeZone, noticePeriodHours } = req.body;

    const availability = await getOrCreateAvailability(req.therapist._id);

    if (weeklySchedule) availability.weeklySchedule = weeklySchedule;
    if (overrides) availability.overrides = overrides;
    if (bufferMinutes !== undefined) availability.bufferMinutes = Number(bufferMinutes);
    if (timeZone) availability.timeZone = timeZone;
    if (noticePeriodHours !== undefined) availability.noticePeriodHours = Number(noticePeriodHours);

    await availability.save();

    return res.status(200).json({
      status: 'success',
      message: 'Availability updated successfully.',
      data: { availability },
    });
  } catch (error) {
    console.error('Error updating availability:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update availability.',
    });
  }
};

/**
 * @desc    Get public bookable time slots for a therapist on a specific date
 * @route   GET /api/availability/slots/:slug?date=YYYY-MM-DD&duration=60
 * @access  Public
 */
const getPublicAvailableSlots = async (req, res) => {
  try {
    const { slug } = req.params;
    const { date, duration = 60, timeZone = 'Asia/Kolkata' } = req.query;

    if (!date) {
      return res.status(400).json({
        status: 'error',
        message: 'Date parameter (YYYY-MM-DD) is required.',
      });
    }

    const therapist = await Therapist.findOne({ slug, isActive: true });
    if (!therapist) {
      return res.status(404).json({
        status: 'error',
        message: 'Therapist not found.',
      });
    }

    const availability = await getOrCreateAvailability(therapist._id);

    // Fetch existing booked sessions for this therapist
    const existingSessions = await Session.find({
      therapistId: therapist._id,
      status: { $in: ['confirmed', 'completed'] },
    });

    const slots = generateAvailableSlots({
      targetDateStr: date,
      availability,
      existingSessions,
      durationMinutes: Number(duration),
      clientTimeZone: timeZone,
    });

    return res.status(200).json({
      status: 'success',
      data: {
        date,
        therapistId: therapist._id,
        timeZone: availability.timeZone,
        durationMinutes: Number(duration),
        slots,
      },
    });
  } catch (error) {
    console.error('Error computing slots:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to calculate available appointment slots.',
    });
  }
};

/**
 * @desc    Client books an appointment slot (Strict double-booking prevention)
 * @route   POST /api/sessions/book
 * @access  Public
 */
const bookSession = async (req, res) => {
  try {
    const {
      therapistSlug,
      clientName,
      clientEmail,
      clientPhone,
      startDateTimeUTC,
      durationMinutes = 60,
      serviceTitle = 'Individual Therapy',
      priceInr = 1500,
      mode = 'video',
      intakeNotes = '',
    } = req.body;

    if (!therapistSlug || !clientName || !clientEmail || !startDateTimeUTC) {
      return res.status(400).json({
        status: 'error',
        message: 'Therapist, client name, client email, and start time are required.',
      });
    }

    const therapist = await Therapist.findOne({ slug: therapistSlug, isActive: true });
    if (!therapist) {
      return res.status(404).json({
        status: 'error',
        message: 'Therapist profile not found.',
      });
    }

    const availability = await getOrCreateAvailability(therapist._id);
    const bufferMinutes = availability.bufferMinutes || 15;

    const slotStart = new Date(startDateTimeUTC);
    const slotEnd = addMinutes(slotStart, Number(durationMinutes));

    // STRICT RE-VALIDATION: Check for overlapping bookings
    // Conflict rule: (newStart < existingEnd + buffer) && (newEnd > existingStart - buffer)
    const conflictingSession = await Session.findOne({
      therapistId: therapist._id,
      status: { $in: ['confirmed', 'completed'] },
      $or: [
        {
          startDateTime: { $lt: addMinutes(slotEnd, bufferMinutes) },
          endDateTime: { $gt: addMinutes(slotStart, -bufferMinutes) },
        },
      ],
    });

    if (conflictingSession) {
      return res.status(409).json({
        status: 'error',
        message: 'This time slot was just booked by another client. Please select another slot.',
      });
    }

    // ─── Module 3 Link: Find or auto-create client in therapist CRM ──────
    const Client = require('../models/Client');
    let client = await Client.findOne({
      therapistId: therapist._id,
      email: clientEmail.trim().toLowerCase(),
    });

    if (!client) {
      client = await Client.create({
        therapistId: therapist._id,
        name: clientName.trim(),
        email: clientEmail.trim().toLowerCase(),
        phone: clientPhone?.trim() || '',
        status: 'active',
        tags: [serviceTitle.includes('Couple') ? 'Couples' : 'Individual'],
        consentRecord: {
          agreed: true,
          agreedAt: new Date(),
          ipAddress: req.ip || '127.0.0.1',
          consentVersion: 'v1.0-standard-telehealth-consent',
          consentText: 'I agree to the practice terms and understand this session is governed by client confidentiality and ethical counseling standards.',
        },
      });
    }

    // Create and save confirmed session
    const newSession = await Session.create({
      therapistId: therapist._id,
      clientId: client._id,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim().toLowerCase(),
      clientPhone: clientPhone?.trim() || '',
      serviceTitle,
      durationMinutes: Number(durationMinutes),
      priceInr: Number(priceInr),
      startDateTime: slotStart,
      endDateTime: slotEnd,
      timeZone: availability.timeZone,
      mode,
      intakeNotes,
      status: 'confirmed',
    });

    // Send transactional booking confirmation and in-app alert (Module 6)
    try {
      await sendBookingConfirmation({
        clientEmail: newSession.clientEmail,
        clientName: newSession.clientName,
        therapistName: therapist.name,
        sessionDate: new Date(newSession.startDateTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        meetingLink: newSession.meetingLink,
        serviceTitle: newSession.serviceTitle,
      });

      await createInAppNotification({
        therapistId: therapist._id,
        type: 'booking_confirmed',
        title: 'New Appointment Booked',
        message: `${newSession.clientName} booked ${newSession.serviceTitle}`,
        link: '/dashboard/appointments',
        metadata: { sessionId: newSession._id, clientId: client._id },
      });

      sendWhatsAppNotificationStub({
        toPhone: newSession.clientPhone || 'Not provided',
        message: `Your session with ${therapist.name} is confirmed for ${new Date(newSession.startDateTime).toLocaleDateString()}. Room: ${newSession.meetingLink}`,
        templateName: 'booking_confirmation_v1',
      });
    } catch (notifErr) {
      console.warn('Booking notification delivery warning:', notifErr.message);
    }

    // ─── Module 7: Increment subscription usage counter ─────────────
    try {
      if (req._entitlement && req._entitlement.subscription) {
        const Subscription = require('../models/Subscription');
        await Subscription.findByIdAndUpdate(
          req._entitlement.subscription._id,
          { $inc: { sessionsUsed: 1 } }
        );
      }
    } catch (usageErr) {
      console.warn('Usage counter increment warning:', usageErr.message);
    }

    // ─── Module 7: Analytics event ──────────────────────────────────
    emitAnalytics('session', 'session_booked', therapist._id, req._entitlement?.tier || 'starter', {
      sessionId: newSession._id,
      serviceTitle: newSession.serviceTitle,
      durationMinutes: newSession.durationMinutes,
      priceInr: newSession.priceInr,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Appointment booked and confirmed successfully!',
      data: {
        session: newSession,
      },
    });
  } catch (error) {
    console.error('Booking error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to book appointment session.',
    });
  }
};

/**
 * @desc    Get all sessions for authenticated therapist (calendar feed)
 * @route   GET /api/sessions/me
 * @access  Private (Therapist)
 */
const getMySessions = async (req, res) => {
  try {
    const sessions = await Session.find({ therapistId: req.therapist._id }).sort({ startDateTime: 1 });
    return res.status(200).json({
      status: 'success',
      data: { sessions },
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve booked sessions.',
    });
  }
};

/**
 * @desc    Update session status (e.g. cancel, mark completed)
 * @route   PATCH /api/sessions/:id/status
 * @access  Private (Therapist)
 */
const updateSessionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancellationReason } = req.body;

    const session = await Session.findOne({ _id: id, therapistId: req.therapist._id });
    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Appointment not found or not owned by you.',
      });
    }

    if (status) session.status = status;
    if (cancellationReason) session.cancellationReason = cancellationReason;

    await session.save();

    return res.status(200).json({
      status: 'success',
      message: 'Session status updated.',
      data: { session },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update session.',
    });
  }
};

module.exports = {
  getMyAvailability,
  updateMyAvailability,
  getPublicAvailableSlots,
  bookSession,
  getMySessions,
  updateSessionStatus,
};
