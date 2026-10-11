const PDFDocument = require('pdfkit');

/**
 * Generate a clean, branded PDF invoice using PDFKit and stream to response or buffer.
 *
 * @param {Object} payment - Populated Payment document with therapist details
 * @param {Object} [client] - Optional client details
 * @param {Stream} stream - Writable stream (e.g. Express res)
 */
const generateInvoicePdf = (payment, stream) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice ${payment.invoiceNumber}`,
          Author: 'UNFAZED Practice Management',
          Subject: `Clinical Service Invoice for ${payment.clientName}`,
        },
      });

      doc.pipe(stream);

      const therapistName = payment.therapistId?.name || 'Practicing Therapist';
      const therapistEmail = payment.therapistId?.email || '';
      const therapistCity = payment.therapistId?.city || 'India';
      const therapistSpecialization = payment.therapistId?.specialization || 'Clinical Mental Health Professional';

      const amountInr = (payment.amountPaise / 100).toFixed(2);
      const platformFeeInr = (payment.platformFeePaise / 100).toFixed(2);
      const netAmountInr = (payment.netAmountPaise / 100).toFixed(2);

      // ─── HEADER / BANNER ──────────────────────────────────────────
      doc
        .rect(0, 0, 595.28, 80)
        .fill('#0f172a'); // Slate-900

      doc
        .fillColor('#ffffff')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('UNFAZED', 50, 25);

      doc
        .fillColor('#94a3b8')
        .fontSize(10)
        .font('Helvetica')
        .text('Private Practice Clinical Invoicing', 50, 50);

      doc
        .fillColor('#ffffff')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('TAX INVOICE', 400, 25, { align: 'right' });

      doc
        .fillColor('#38bdf8') // Sky-400
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(payment.invoiceNumber, 400, 48, { align: 'right' });

      // ─── TEST MODE WATERMARK BANNER ───────────────────────────────
      if (payment.isTestMode) {
        doc
          .rect(50, 95, 495.28, 26)
          .fill('#fef3c7'); // Amber-100

        doc
          .rect(50, 95, 495.28, 26)
          .stroke('#f59e0b');

        doc
          .fillColor('#b45309')
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('⚠️  TEST TRANSACTION — PROCESSED IN RAZORPAY TEST MODE FOR PRACTICE SIMULATION', 50, 103, {
            align: 'center',
            width: 495.28,
          });
      }

      // ─── THERAPIST & CLIENT DETAILS SECTION ───────────────────────
      const detailsTop = payment.isTestMode ? 140 : 110;

      // Left Column: Practice Info
      doc
        .fillColor('#64748b')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('ISSUED BY:', 50, detailsTop);

      doc
        .fillColor('#0f172a')
        .fontSize(13)
        .font('Helvetica-Bold')
        .text(therapistName, 50, detailsTop + 14);

      doc
        .fillColor('#475569')
        .fontSize(9.5)
        .font('Helvetica')
        .text(therapistSpecialization, 50, detailsTop + 30)
        .text(therapistEmail, 50, detailsTop + 44)
        .text(therapistCity, 50, detailsTop + 58);

      // Right Column: Client & Payment Info
      doc
        .fillColor('#64748b')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('BILLED TO:', 340, detailsTop);

      doc
        .fillColor('#0f172a')
        .fontSize(13)
        .font('Helvetica-Bold')
        .text(payment.clientName, 340, detailsTop + 14);

      doc
        .fillColor('#475569')
        .fontSize(9.5)
        .font('Helvetica')
        .text(`Email: ${payment.clientEmail}`, 340, detailsTop + 30)
        .text(`Phone: ${payment.clientPhone || 'Not provided'}`, 340, detailsTop + 44)
        .text(`Date: ${new Date(payment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`, 340, detailsTop + 58);

      // ─── TRANSACTION AUDIT RECORD ─────────────────────────────────
      const auditTop = detailsTop + 85;

      doc
        .rect(50, auditTop, 495.28, 48)
        .fill('#f8fafc');

      doc
        .rect(50, auditTop, 495.28, 48)
        .stroke('#e2e8f0');

      doc
        .fillColor('#64748b')
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('GATEWAY ORDER ID', 65, auditTop + 10)
        .text('PAYMENT TRANSACTION ID', 225, auditTop + 10)
        .text('PAYMENT STATUS', 420, auditTop + 10);

      doc
        .fillColor('#0f172a')
        .fontSize(9)
        .font('Helvetica')
        .text(payment.razorpayOrderId, 65, auditTop + 24)
        .text(payment.razorpayPaymentId || 'Pending Authorization', 225, auditTop + 24);

      const statusColor = payment.status === 'captured' ? '#16a34a' : (payment.status === 'failed' ? '#dc2626' : '#d97706');
      doc
        .fillColor(statusColor)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(payment.status.toUpperCase(), 420, auditTop + 24);

      // ─── ITEMS TABLE ──────────────────────────────────────────────
      const tableTop = auditTop + 70;

      // Table Header
      doc
        .rect(50, tableTop, 495.28, 25)
        .fill('#0f172a');

      doc
        .fillColor('#ffffff')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('DESCRIPTION', 65, tableTop + 8)
        .text('QTY', 330, tableTop + 8, { width: 40, align: 'center' })
        .text('UNIT PRICE', 380, tableTop + 8, { width: 70, align: 'right' })
        .text('TOTAL (INR)', 460, tableTop + 8, { width: 75, align: 'right' });

      // Table Row
      const rowTop = tableTop + 25;
      doc
        .rect(50, rowTop, 495.28, 36)
        .fill('#ffffff');

      doc
        .rect(50, rowTop, 495.28, 36)
        .stroke('#e2e8f0');

      doc
        .fillColor('#0f172a')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(payment.itemTitle, 65, rowTop + 8);

      doc
        .fillColor('#64748b')
        .fontSize(8.5)
        .font('Helvetica')
        .text(payment.itemType === 'package' ? 'Clinical Package Allocation' : 'Telehealth Consultation Session', 65, rowTop + 22);

      doc
        .fillColor('#0f172a')
        .fontSize(9.5)
        .font('Helvetica')
        .text('1', 330, rowTop + 12, { width: 40, align: 'center' })
        .text(`Rs. ${amountInr}`, 380, rowTop + 12, { width: 70, align: 'right' })
        .text(`Rs. ${amountInr}`, 460, rowTop + 12, { width: 75, align: 'right' });

      // ─── TOTALS BREAKDOWN ─────────────────────────────────────────
      const summaryTop = rowTop + 50;

      doc
        .fontSize(9.5)
        .font('Helvetica')
        .fillColor('#475569')
        .text('Subtotal:', 340, summaryTop, { width: 100, align: 'right' })
        .fillColor('#0f172a')
        .text(`Rs. ${amountInr}`, 450, summaryTop, { width: 85, align: 'right' });

      doc
        .fillColor('#475569')
        .text('Platform Processing Fee:', 340, summaryTop + 18, { width: 100, align: 'right' })
        .fillColor('#64748b')
        .text(`Rs. ${platformFeeInr}`, 450, summaryTop + 18, { width: 85, align: 'right' });

      doc
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .moveTo(340, summaryTop + 36)
        .lineTo(545, summaryTop + 36)
        .stroke();

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text('Net Total Paid:', 340, summaryTop + 44, { width: 100, align: 'right' })
        .fillColor('#0284c7') // Sky-600
        .text(`Rs. ${amountInr}`, 450, summaryTop + 44, { width: 85, align: 'right' });

      // ─── FOOTER ───────────────────────────────────────────────────
      const footerTop = 720;

      doc
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .moveTo(50, footerTop)
        .lineTo(545.28, footerTop)
        .stroke();

      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('Confidentiality Notice: Clinical mental health services provided under professional ethics standards.', 50, footerTop + 12, {
          align: 'center',
          width: 495.28,
        });

      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .text('Powered by UNFAZED — Practice Management Platform for Independent Therapists in India', 50, footerTop + 26, {
          align: 'center',
          width: 495.28,
        });

      doc.end();
      doc.on('finish', resolve);
      doc.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateInvoicePdf,
};
