import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.AUTO_EMAIL,
    pass: process.env.AUTO_EMAIL_PASSWORD,
  },
});

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    if (!process.env.AUTO_EMAIL || !process.env.AUTO_EMAIL_PASSWORD) {
      console.warn('SMTP credentials missing. Email skipped for:', to);
      return;
    }
    await transporter.sendMail({
      from: `"CalFlow" <${process.env.AUTO_EMAIL}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
  }
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────

function appUrl() {
  return process.env.MAIN_APP_URL ?? 'http://localhost:3000';
}

function manageLinks(bookingId: number) {
  const base = appUrl();
  return {
    reschedule: `${base}/booking/${bookingId}/reschedule`,
    cancel: `${base}/booking/${bookingId}/cancel`,
  };
}

function formatDate(d: Date, timeZone?: string) {
  try {
    return d.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
      ...(timeZone ? { timeZone } : {}),
    });
  } catch (err) {
    return d.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  }
}

// ─── HTML Templates ───────────────────────────────────────────────────────────

function baseTemplate(title: string, accentColor: string, bodyContent: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:${accentColor};padding:28px 36px;">
            <p style="margin:0;color:#ffffff;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">CalFlow</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${title}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            ${bodyContent}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.6;">
              This is an automated notification from CalFlow. Please do not reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function detailRow(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;color:#64748b;font-size:13px;font-weight:600;width:140px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;color:#0f172a;font-size:13px;vertical-align:top;">${value}</td>
  </tr>`;
}

function actionButton(label: string, href: string, bg: string) {
  return `<a href="${href}" style="display:inline-block;padding:10px 20px;background:${bg};color:#fff;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;margin-right:10px;">${label}</a>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface BookingDetails {
  bookingId: number;
  eventTitle: string;
  hostName: string;
  hostEmail: string;
  guestName: string;
  guestEmail: string;
  guestTimezone?: string;
  startsAt: Date;
  endsAt: Date;
  locationLabel: string;
  notes?: string | null;
  meetingUrl?: string | null;
}

export async function sendBookingCreatedEmails(booking: BookingDetails): Promise<void> {
  try {
    const links = manageLinks(booking.bookingId);

    const makeTable = (tz?: string) => `
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${detailRow('Event', booking.eventTitle)}
        ${detailRow('Date & Time', formatDate(booking.startsAt, tz))}
        ${detailRow('Duration', `Until ${formatDate(booking.endsAt, tz)}`)}
        ${detailRow(booking.meetingUrl ? 'Meeting Link' : 'Location', booking.locationLabel)}
        ${booking.notes ? detailRow('Notes', booking.notes) : ''}
        ${detailRow('Reschedule', `<a href="${links.reschedule}" style="color:#2563eb;font-weight:600;word-break:break-all;">${links.reschedule}</a>`)}
        ${detailRow('Cancel', `<a href="${links.cancel}" style="color:#dc2626;font-weight:600;word-break:break-all;">${links.cancel}</a>`)}
      </table>`;

    const zoomButton = booking.meetingUrl 
      ? actionButton('Join Zoom Meeting', booking.meetingUrl, '#2563eb')
      : '';

    const guestHtml = baseTemplate(
      `Your booking is confirmed!`,
      '#2563eb',
      `<p style="margin:0 0 16px;color:#334155;font-size:15px;">Hi <strong>${booking.guestName}</strong>,</p>
       <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
         Your appointment with <strong>${booking.hostName}</strong> has been confirmed.
       </p>
       <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
         ${makeTable(booking.guestTimezone)}
       </div>
       ${zoomButton}
       <p style="margin:16px 0 12px;color:#475569;font-size:13px;font-weight:600;">Need to make changes?</p>
       ${actionButton('Reschedule', links.reschedule, '#2563eb')}
       ${actionButton('Cancel', links.cancel, '#dc2626')}`
    );

    const hostHtml = baseTemplate(
      `New booking: ${booking.eventTitle}`,
      '#7c3aed',
      `<p style="margin:0 0 16px;color:#334155;font-size:15px;">Hi <strong>${booking.hostName}</strong>,</p>
       <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
         <strong>${booking.guestName}</strong> (${booking.guestEmail}) has booked a slot with you.
       </p>
       <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
         ${makeTable()}
       </div>
       ${zoomButton}
       <p style="margin:16px 0 12px;color:#475569;font-size:13px;font-weight:600;">Manage Booking</p>
       ${actionButton('Reschedule', links.reschedule, '#7c3aed')}
       ${actionButton('Cancel', links.cancel, '#dc2626')}`
    );

    await Promise.all([
      sendEmail(booking.guestEmail, `Confirmed: ${booking.eventTitle} with ${booking.hostName}`, guestHtml),
      sendEmail(booking.hostEmail, `New Booking: ${booking.eventTitle} with ${booking.guestName}`, hostHtml),
    ]);
  } catch (error) {
    console.error('Error building/sending booking created emails:', error);
  }
}

export async function sendBookingRescheduledEmails(booking: BookingDetails, oldStartsAt: Date): Promise<void> {
  try {
    const links = manageLinks(booking.bookingId);

    const makeTable = (tz?: string) => `
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${detailRow('Event', booking.eventTitle)}
        ${detailRow('Previous Time', `<s style="color:#94a3b8;">${formatDate(oldStartsAt, tz)}</s>`)}
        ${detailRow('New Time', `<strong style="color:#16a34a;">${formatDate(booking.startsAt, tz)}</strong>`)}
        ${detailRow(booking.meetingUrl ? 'Meeting Link' : 'Location', booking.locationLabel)}
        ${detailRow('Manage Booking', `<a href="${links.reschedule}" style="color:#0891b2;font-weight:600;word-break:break-all;">${links.reschedule}</a>`)}
      </table>`;

    const zoomButton = booking.meetingUrl 
      ? actionButton('Join Zoom Meeting', booking.meetingUrl, '#0891b2')
      : '';

    const body = (recipientName: string, tz?: string) => baseTemplate(
      `Booking rescheduled`,
      '#0891b2',
      `<p style="margin:0 0 16px;color:#334155;font-size:15px;">Hi <strong>${recipientName}</strong>,</p>
       <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
         The booking for <strong>${booking.eventTitle}</strong> has been rescheduled.
       </p>
       <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
         ${makeTable(tz)}
       </div>
       ${zoomButton}
       ${actionButton('Reschedule Again', links.reschedule, '#0891b2')}
       ${actionButton('Cancel', links.cancel, '#dc2626')}`
    );

    await Promise.all([
      sendEmail(booking.guestEmail, `Rescheduled: ${booking.eventTitle} with ${booking.hostName}`, body(booking.guestName, booking.guestTimezone)),
      sendEmail(booking.hostEmail, `Rescheduled: ${booking.eventTitle} with ${booking.guestName}`, body(booking.hostName)),
    ]);
  } catch (error) {
    console.error('Error building/sending booking rescheduled emails:', error);
  }
}

export async function sendBookingCancelledEmails(booking: BookingDetails, reason: string): Promise<void> {
  try {
    const body = (recipientName: string, tz?: string) => baseTemplate(
      `Booking cancelled`,
      '#dc2626',
      `<p style="margin:0 0 16px;color:#334155;font-size:15px;">Hi <strong>${recipientName}</strong>,</p>
       <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
         The following booking has been <strong style="color:#dc2626;">cancelled</strong>.
       </p>
       <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:24px;">
         <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
           ${detailRow('Event', booking.eventTitle)}
           ${detailRow('Was Scheduled', formatDate(booking.startsAt, tz))}
           ${detailRow('Reason', reason || 'No reason provided')}
         </table>
       </div>
       <p style="margin:0;color:#64748b;font-size:13px;">If this was a mistake, please book a new appointment.</p>`
    );

    await Promise.all([
      sendEmail(booking.guestEmail, `Cancelled: ${booking.eventTitle} with ${booking.hostName}`, body(booking.guestName, booking.guestTimezone)),
      sendEmail(booking.hostEmail, `Cancelled: ${booking.eventTitle} with ${booking.guestName}`, body(booking.hostName)),
    ]);
  } catch (error) {
    console.error('Error building/sending booking cancelled emails:', error);
  }
}

export async function sendBookingReminderEmails(booking: BookingDetails): Promise<void> {
  try {
    const links = manageLinks(booking.bookingId);

    const makeTable = (tz?: string) => `
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${detailRow('Event', booking.eventTitle)}
        ${detailRow('Date & Time', formatDate(booking.startsAt, tz))}
        ${detailRow('Duration', `Until ${formatDate(booking.endsAt, tz)}`)}
        ${detailRow(booking.meetingUrl ? 'Meeting Link' : 'Location', booking.locationLabel)}
        ${booking.notes ? detailRow('Notes', booking.notes) : ''}
        ${detailRow('Reschedule', `<a href="${links.reschedule}" style="color:#2563eb;font-weight:600;word-break:break-all;">${links.reschedule}</a>`)}
        ${detailRow('Cancel', `<a href="${links.cancel}" style="color:#dc2626;font-weight:600;word-break:break-all;">${links.cancel}</a>`)}
      </table>`;

    const zoomButton = booking.meetingUrl 
      ? actionButton('Join Zoom Meeting', booking.meetingUrl, '#2563eb')
      : '';

    const guestHtml = baseTemplate(
      `Reminder: Upcoming meeting`,
      '#2563eb',
      `<p style="margin:0 0 16px;color:#334155;font-size:15px;">Hi <strong>${booking.guestName}</strong>,</p>
       <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
         This is a reminder for your upcoming appointment with <strong>${booking.hostName}</strong> in the next 24 hours.
       </p>
       <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
         ${makeTable(booking.guestTimezone)}
       </div>
       ${zoomButton}
       <p style="margin:16px 0 12px;color:#475569;font-size:13px;font-weight:600;">Need to make changes?</p>
       ${actionButton('Reschedule', links.reschedule, '#2563eb')}
       ${actionButton('Cancel', links.cancel, '#dc2626')}`
    );

    const hostHtml = baseTemplate(
      `Reminder: Upcoming meeting`,
      '#7c3aed',
      `<p style="margin:0 0 16px;color:#334155;font-size:15px;">Hi <strong>${booking.hostName}</strong>,</p>
       <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
         This is a reminder for your upcoming appointment with <strong>${booking.guestName}</strong> in the next 24 hours.
       </p>
       <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
         ${makeTable()}
       </div>
       ${zoomButton}
       <p style="margin:16px 0 12px;color:#475569;font-size:13px;font-weight:600;">Manage Booking</p>
       ${actionButton('Reschedule', links.reschedule, '#7c3aed')}
       ${actionButton('Cancel', links.cancel, '#dc2626')}`
    );

    await Promise.all([
      sendEmail(booking.guestEmail, `Reminder: ${booking.eventTitle} with ${booking.hostName}`, guestHtml),
      sendEmail(booking.hostEmail, `Reminder: ${booking.eventTitle} with ${booking.guestName}`, hostHtml),
    ]);
  } catch (error) {
    console.error('Error building/sending booking reminder emails:', error);
  }
}

