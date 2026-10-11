const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');

let transporter = null;

// Initialize Nodemailer transporter if valid credentials exist
if (
  process.env.EMAIL_HOST &&
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASS &&
  !process.env.EMAIL_USER.includes('your_email')
) {
  try {
    transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    console.log('✉️  Nodemailer SMTP transporter initialized.');
  } catch (err) {
    console.warn('Nodemailer configuration error (using test mode logger):', err.message);
  }
}

/**
 * Send transactional email (or log in development)
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"UNFAZED Practice" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html,
      });
      return { success: true, messageId: info.messageId, isSimulated: false };
    } catch (error) {
      console.error('SMTP email sending failed, logging to test console:', error.message);
    }
  }

  // Development/Test simulated email delivery
  console.log(`\n📨 [SIMULATED EMAIL - DEV SANDBOX]`);
  console.log(`   To: ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Content: ${text || html?.replace(/<[^>]+>/g, '').slice(0, 150)}...\n`);

  return {
    success: true,
    messageId: `sim_email_${Date.now()}`,
    isSimulated: true,
  };
};

/**
 * Send Booking Confirmation Email
 */
const sendBookingConfirmation = async ({ clientEmail, clientName, therapistName, sessionDate, meetingLink, serviceTitle }) => {
  const subject = `Appointment Confirmed with ${therapistName} — UNFAZED`;
  const text = `Hi ${clientName},\n\nYour consultation "${serviceTitle}" with ${therapistName} on ${sessionDate} is confirmed.\nJoin via Google Meet: ${meetingLink}\n\nWarm regards,\nUNFAZED Practice Team`;
  const html = `
    <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #0f172a; margin-top: 0;">Appointment Confirmed</h2>
      <p style="color: #475569; font-size: 14px;">Hi <strong>${clientName}</strong>,</p>
      <p style="color: #475569; font-size: 14px;">Your appointment with <strong>${therapistName}</strong> has been scheduled and confirmed.</p>
      <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px;">
        <p style="margin: 4px 0;"><strong>Service:</strong> ${serviceTitle}</p>
        <p style="margin: 4px 0;"><strong>Date & Time:</strong> ${sessionDate}</p>
        <p style="margin: 4px 0;"><strong>Meeting Room:</strong> <a href="${meetingLink}" style="color: #0284c7; font-weight: bold;">Join Video Room</a></p>
      </div>
      <p style="font-size: 12px; color: #94a3b8;">Confidential clinical consultation managed through UNFAZED.</p>
    </div>
  `;
  return sendEmail({ to: clientEmail, subject, html, text });
};

/**
 * Send Intake Questionnaire Reminder Email
 */
const sendIntakeReminder = async ({ clientEmail, clientName, therapistName, intakeUrl }) => {
  const subject = `Action Required: Clinical Intake Form for your session with ${therapistName}`;
  const text = `Hi ${clientName},\n\nPlease complete your brief clinical intake form prior to your session with ${therapistName}.\nIntake Link: ${intakeUrl}\n\nWarm regards,\nUNFAZED Practice`;
  const html = `
    <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #0f172a; margin-top: 0;">Clinical Intake Reminder</h2>
      <p style="color: #475569; font-size: 14px;">Hi <strong>${clientName}</strong>,</p>
      <p style="color: #475569; font-size: 14px;">Before your session with <strong>${therapistName}</strong>, please complete your confidential demographic and intake questions.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${intakeUrl}" style="background: #0284c7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px;">Complete Intake Form</a>
      </div>
      <p style="font-size: 12px; color: #94a3b8;">All information is protected by client-therapist confidentiality standards.</p>
    </div>
  `;
  return sendEmail({ to: clientEmail, subject, html, text });
};

/**
 * Create In-App Notification in MongoDB and push to socket if connected
 */
const createInAppNotification = async ({ therapistId, type, title, message, link = '', metadata = null, io = null }) => {
  try {
    const notification = await Notification.create({
      therapistId,
      type,
      title,
      message,
      link,
      metadata,
    });

    // Real-time Socket.IO emission to therapist's room
    if (io) {
      io.to(`user:therapist_${therapistId}`).emit('new_notification', notification);
    }

    return notification;
  } catch (error) {
    console.error('Error creating in-app notification:', error.message);
  }
};

/**
 * WhatsApp Notification Interface (Clearly labeled Sandbox Stub)
 * Note: Mandatory specification requires no false claims of live SMS/WhatsApp delivery.
 */
const sendWhatsAppNotificationStub = ({ toPhone, message, templateName }) => {
  const logEntry = {
    provider: 'WhatsApp Business API (Sandbox Stub)',
    isStub: true,
    status: 'simulated_delivery',
    timestamp: new Date().toISOString(),
    recipient: toPhone,
    template: templateName || 'appointment_reminder',
    bodyPreview: message?.slice(0, 100),
  };

  console.log(`\n💬 [SIMULATED WHATSAPP NOTIFICATION - SANDBOX STUB]`);
  console.log(`   To: ${toPhone}`);
  console.log(`   Template: ${templateName}`);
  console.log(`   Message: ${message}\n`);

  return logEntry;
};

module.exports = {
  sendEmail,
  sendBookingConfirmation,
  sendIntakeReminder,
  createInAppNotification,
  sendWhatsAppNotificationStub,
};
