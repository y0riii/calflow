import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBookingReminderEmails } from '@/lib/email';

export async function GET(req: Request) {
  try {
    const now = new Date();
    // 25 hours from now to safely catch bookings in the next 24 hours if the cron runs once a day
    const twentyFiveHoursFromNow = new Date(now.getTime() + (25 * 60 * 60 * 1000));
    
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        status: 'confirmed',
        reminderSent: false,
        startsAt: {
          lte: twentyFiveHoursFromNow,
          gt: now, // don't send if it's already in the past
        }
      },
      include: {
        event: true,
        host: true,
      }
    });

    if (upcomingBookings.length === 0) {
      return NextResponse.json({ success: true, message: 'No reminders to send.' });
    }

    const bookingIdsToUpdate: number[] = [];

    for (const booking of upcomingBookings) {
      const locationLabel = booking.meetingUrl 
        ? `<a href="${booking.meetingUrl}" style="color:#2563eb;word-break:break-all;">${booking.meetingUrl}</a>`
        : booking.event.platform === 'zoom' ? 'Zoom Video'
        : booking.event.location || 'In-Person Meeting';

      await sendBookingReminderEmails({
        bookingId: booking.bookingId,
        eventTitle: booking.event.title,
        hostName: `@${booking.host.username}`,
        hostEmail: booking.host.email,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestTimezone: booking.guestTimezone,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        locationLabel,
        notes: booking.notes,
        meetingUrl: booking.meetingUrl,
      });

      bookingIdsToUpdate.push(booking.bookingId);
    }

    // Mark as sent
    await prisma.booking.updateMany({
      where: {
        bookingId: {
          in: bookingIdsToUpdate
        }
      },
      data: {
        reminderSent: true
      }
    });

    return NextResponse.json({ success: true, message: `Reminders sent for ${bookingIdsToUpdate.length} bookings.` });
  } catch (error) {
    console.error('Error processing cron reminders:', error);
    return NextResponse.json({ success: false, message: 'Failed to process reminders' }, { status: 500 });
  }
}
