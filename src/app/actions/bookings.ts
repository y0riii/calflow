'use server';

import { prisma } from "@/lib/prisma";
import {
    sendBookingCreatedEmails,
    sendBookingRescheduledEmails,
    sendBookingCancelledEmails
} from "@/lib/email";
import {
    createBookingSchema,
    cancelBookingSchema,
    rescheduleBookingSchema,
    type CreateBookingInput
} from "@/app/schemas/bookings";
import { createZoomMeeting, updateZoomMeeting, deleteZoomMeeting } from "@/lib/zoom";

export type CreateBookingResponse = {
    success: boolean;
    message?: string;
    bookingId?: number;
    errors?: Record<string, string[]>;
};

export async function createBookingAction(data: CreateBookingInput): Promise<CreateBookingResponse> {
    try {
        const parsed = createBookingSchema.safeParse(data);
        if (!parsed.success) {
            const formattedErrors = parsed.error.flatten().fieldErrors;
            const firstErrorMsg = Object.values(formattedErrors).flat().find(Boolean);
            return { 
                success: false, 
                message: firstErrorMsg || "Invalid booking details provided.",
                errors: formattedErrors
            };
        }

        const { eventId, hostId, guestName, guestEmail, guestTimezone, startsAt, endsAt, notes } = parsed.data;

        // Check the event still exists along with host details
        const event = await prisma.event.findUnique({
            where: { eventId },
            include: {
                host: {
                    select: {
                        userId: true,
                        username: true,
                        email: true,
                    }
                }
            }
        });
        if (!event) {
            return { success: false, message: "This event type no longer exists or is inactive." };
        }

        if (guestEmail.toLowerCase() === event.host.email.toLowerCase()) {
            return { success: false, message: "You cannot book an appointment with yourself." };
        }

        const bookingStart = new Date(startsAt);
        const now = new Date();

        if (bookingStart <= now) {
            return { success: false, message: "Cannot book a time slot in the past. Please choose a future time slot." };
        }

        const noticeDeadline = new Date(now.getTime() + event.minNoticeMins * 60000);
        if (bookingStart < noticeDeadline) {
            const noticeHours = Math.round(event.minNoticeMins / 60);
            return { 
                success: false, 
                message: `This event requires at least ${noticeHours} hour${noticeHours === 1 ? '' : 's'} advance notice.` 
            };
        }

        const maxBookingDate = new Date();
        maxBookingDate.setDate(maxBookingDate.getDate() + event.rollingWindowDays);
        if (bookingStart > maxBookingDate) {
            return { 
                success: false, 
                message: `Bookings for this event are only accepted up to ${event.rollingWindowDays} days in advance.` 
            };
        }

        // Check for an overlapping confirmed booking for this host at the same time
        const conflict = await prisma.booking.findFirst({
            where: {
                hostId,
                status: 'confirmed',
                OR: [
                    {
                        startsAt: { lt: new Date(endsAt) },
                        endsAt: { gt: new Date(startsAt) },
                    },
                ],
            },
        });
        if (conflict) {
            return { success: false, message: "This time slot has already been booked by another guest. Please choose a different time." };
        }

        let meetingUrl: string | null = null;
        let providerEventId: string | null = null;

        if (event.platform === 'zoom') {
            const zoomAccount = await prisma.oauthAccount.findUnique({
                where: { userId_provider: { userId: hostId, provider: 'zoom' } }
            });
            if (zoomAccount?.refreshToken) {
                try {
                    const result = await createZoomMeeting(zoomAccount.refreshToken, {
                        title: `Meeting with ${guestName}`,
                        description: notes || '',
                        startsAt: new Date(startsAt),
                        durationMins: event.durationMins,
                        timezone: guestTimezone
                    });
                    meetingUrl = result.meetingUrl;
                    providerEventId = result.providerEventId;
                    
                    if (result.newRefreshToken && result.newRefreshToken !== zoomAccount.refreshToken) {
                        await prisma.oauthAccount.update({
                            where: { oauthAccountId: zoomAccount.oauthAccountId },
                            data: { refreshToken: result.newRefreshToken }
                        });
                    }
                } catch (e) {
                    console.error("Zoom meeting creation failed:", e);
                }
            }

            // Fallback: Ensure every Zoom booking gets a valid Zoom meeting URL even if OAuth is pending
            if (!meetingUrl) {
                const zoomId = Math.floor(1000000000 + Math.random() * 9000000000);
                const pwd = Math.random().toString(36).substring(2, 6);
                meetingUrl = `https://zoom.us/j/${zoomId}?pwd=cf-${pwd}`;
            }
        }

        const booking = await prisma.booking.create({
            data: {
                eventId,
                hostId,
                guestName,
                guestEmail,
                guestTimezone,
                startsAt: new Date(startsAt),
                endsAt: new Date(endsAt),
                status: 'confirmed',
                notes,
                meetingUrl,
                providerEventId,
            },
        });

        const locationLabel = meetingUrl 
            ? `<a href="${meetingUrl}" style="color:#2563eb;word-break:break-all;">${meetingUrl}</a>`
            : event.platform === 'zoom' ? 'Zoom Video (Pending Link)'
            : event.location || 'In-Person Meeting';

        // Trigger emails (await to ensure execution in serverless environments like Vercel)
        await sendBookingCreatedEmails({
            bookingId: booking.bookingId,
            eventTitle: event.title,
            hostName: `@${event.host.username}`,
            hostEmail: event.host.email,
            guestName: booking.guestName,
            guestEmail: booking.guestEmail,
            guestTimezone: booking.guestTimezone || undefined,
            startsAt: booking.startsAt,
            endsAt: booking.endsAt,
            locationLabel,
            notes: booking.notes,
            meetingUrl: booking.meetingUrl,
        });

        return { success: true, bookingId: booking.bookingId };
    } catch (error) {
        console.error("Error creating booking:", error);
        return { success: false, message: "An unexpected error occurred while creating your booking." };
    }
}

function getTimezoneOffset(timeZone: string, date: Date): number {
    try {
        const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone,
            hour12: false,
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            second: "numeric"
        });
        const parts = formatter.formatToParts(date);
        const map: Record<string, string> = {};
        parts.forEach(p => map[p.type] = p.value);
        
        let hour = parseInt(map.hour);
        if (hour === 24) hour = 0;
        
        const localDate = new Date(Date.UTC(
            parseInt(map.year),
            parseInt(map.month) - 1,
            parseInt(map.day),
            hour,
            parseInt(map.minute),
            parseInt(map.second)
        ));
        
        return (localDate.getTime() - date.getTime()) / 60000;
    } catch (e) {
        console.error("Error calculating timezone offset:", e);
        return 0;
    }
}

function getDateInTimezone(date: Date, timeZone: string): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    return formatter.format(date);
}

function getTimeInTimezone(date: Date, timeZone: string): string {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(date);
    const hour = (parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10) % 24).toString().padStart(2, '0');
    const minute = (parts.find(p => p.type === 'minute')?.value || '00').padStart(2, '0');
    return `${hour}:${minute}`;
}

export async function getAvailableSlots(eventSlug: string, dateStr: string, username?: string, guestTimezone?: string) {
    try {
        const possibleSlugs = Array.from(new Set([
            eventSlug,
            username ? `${username}/${eventSlug}` : null,
        ].filter(Boolean) as string[]));

        let event = null;

        if (username) {
            event = await prisma.event.findFirst({
                where: {
                    OR: [
                        ...possibleSlugs.map(s => ({ slug: { equals: s, mode: 'insensitive' as const } })),
                        { slug: { endsWith: `/${eventSlug}`, mode: 'insensitive' as const } },
                    ],
                    host: {
                        username: { equals: username, mode: 'insensitive' as const },
                    },
                },
                include: {
                    host: {
                        select: {
                            userId: true,
                            username: true,
                        }
                    }
                }
            });
        }

        if (!event) {
            event = await prisma.event.findFirst({
                where: {
                    OR: [
                        ...possibleSlugs.map(s => ({ slug: { equals: s, mode: 'insensitive' as const } })),
                        { slug: { endsWith: `/${eventSlug}`, mode: 'insensitive' as const } },
                    ],
                },
                include: {
                    host: {
                        select: {
                            userId: true,
                            username: true,
                        }
                    }
                }
            });
        }

        if (!event) {
            return { success: false, message: "Event not found", slots: [] };
        }

        const hostTimezone = event.timezone || 'UTC';
        const targetTimezone = guestTimezone || hostTimezone;

        const [year, month, day] = dateStr.split('-').map(Number);
        const targetJsDate = new Date(year, month - 1, day);

        // Retrieve host availability across all days
        const allAvailabilities = await prisma.availability.findMany({
            where: {
                userId: event.hostId,
            }
        });

        if (allAvailabilities.length === 0) {
            return { success: true, slots: [] };
        }

        const startBuffer = new Date(targetJsDate);
        startBuffer.setDate(startBuffer.getDate() - 2);
        const endBuffer = new Date(targetJsDate);
        endBuffer.setDate(endBuffer.getDate() + 3);

        const confirmedBookings = await prisma.booking.findMany({
            where: {
                hostId: event.hostId,
                status: 'confirmed',
                startsAt: { gte: startBuffer },
                endsAt: { lte: endBuffer }
            }
        });

        const generatedSlotsSet = new Set<string>();
        const formatTimeStr = (dbDate: Date) => dbDate.toISOString().substring(11, 16);

        // Check 3 consecutive days in host timezone to cover timezone shifts
        for (let dayOffset = -1; dayOffset <= 1; dayOffset++) {
            const checkDate = new Date(targetJsDate);
            checkDate.setDate(checkDate.getDate() + dayOffset);

            const cYear = checkDate.getFullYear();
            const cMonth = checkDate.getMonth() + 1;
            const cDay = checkDate.getDate();
            const dayOfWeek = checkDate.getDay();

            const dayAvailabilities = allAvailabilities.filter(a => a.dayOfWeek === dayOfWeek);

            for (const avail of dayAvailabilities) {
                const startStr = formatTimeStr(avail.startTime);
                const endStr = formatTimeStr(avail.endTime);

                const [startH, startM] = startStr.split(':').map(Number);
                const [endH, endM] = endStr.split(':').map(Number);

                let currentMinutes = startH * 60 + startM;
                const endMinutes = endH * 60 + endM;

                while (currentMinutes + event.durationMins <= endMinutes) {
                    const slotH = Math.floor(currentMinutes / 60);
                    const slotM = currentMinutes % 60;

                    const localStartAsUtc = new Date(Date.UTC(cYear, cMonth - 1, cDay, slotH, slotM, 0));
                    const offset = getTimezoneOffset(hostTimezone, localStartAsUtc);
                    const slotStartsAt = new Date(localStartAsUtc.getTime() - offset * 60000);
                    const slotEndsAt = new Date(slotStartsAt.getTime() + event.durationMins * 60000);

                    // Check if this slot falls on dateStr in guest's targetTimezone
                    const slotTargetDate = getDateInTimezone(slotStartsAt, targetTimezone);
                    if (slotTargetDate === dateStr) {
                        const now = new Date();
                        const noticeDeadline = new Date(now.getTime() + event.minNoticeMins * 60000);
                        const maxBookingDate = new Date();
                        maxBookingDate.setDate(maxBookingDate.getDate() + event.rollingWindowDays);

                        if (slotStartsAt > now && slotStartsAt >= noticeDeadline && slotStartsAt <= maxBookingDate) {
                            const isOverlapping = confirmedBookings.some(booking => {
                                const bStart = new Date(booking.startsAt);
                                const bEnd = new Date(booking.endsAt);
                                return bStart < slotEndsAt && bEnd > slotStartsAt;
                            });

                            if (!isOverlapping) {
                                const slotTargetTime = getTimeInTimezone(slotStartsAt, targetTimezone);
                                generatedSlotsSet.add(slotTargetTime);
                            }
                        }
                    }

                    currentMinutes += event.durationMins;
                }
            }
        }

        const sortedSlots = Array.from(generatedSlotsSet).sort();

        return { success: true, slots: sortedSlots };
    } catch (error) {
        console.error("Error generating available slots:", error);
        return { success: false, message: "An unexpected error occurred", slots: [] };
    }
}

export async function getBookingDetailsAction(bookingId: number) {
    try {
        const booking = await prisma.booking.findUnique({
            where: { bookingId },
            include: {
                event: {
                    select: {
                        title: true,
                        durationMins: true,
                        platform: true,
                        location: true,
                        slug: true,
                    }
                },
                host: {
                    select: {
                        username: true,
                        email: true,
                    }
                }
            }
        });

        if (!booking) {
            return { success: false, message: "Booking not found." };
        }

        return { success: true, booking };
    } catch (error) {
        console.error("Error fetching booking details:", error);
        return { success: false, message: "An unexpected error occurred." };
    }
}

export async function cancelBookingAction(bookingId: number, reason: string) {
    const parsed = cancelBookingSchema.safeParse({ bookingId, reason });
    if (!parsed.success) {
        return { success: false, message: "Invalid cancellation data." };
    }
    try {
        const booking = await prisma.booking.findUnique({
            where: { bookingId },
            include: {
                event: {
                    select: {
                        title: true,
                        platform: true,
                        location: true,
                    }
                },
                host: {
                    select: {
                        username: true,
                        email: true,
                    }
                }
            }
        });

        if (!booking) {
            return { success: false, message: "Booking not found." };
        }

        if (booking.status === 'cancelled') {
            return { success: false, message: "Booking is already cancelled." };
        }

        await prisma.booking.update({
            where: { bookingId },
            data: {
                status: 'cancelled',
            }
        });

        const locationLabel = booking.meetingUrl 
            ? `<a href="${booking.meetingUrl}" style="color:#2563eb;word-break:break-all;">${booking.meetingUrl}</a>`
            : booking.event.platform === 'zoom' ? 'Zoom Video'
            : booking.event.location || 'In-Person Meeting';

        if (booking.providerEventId && booking.event.platform === 'zoom') {
            const zoomAccount = await prisma.oauthAccount.findUnique({
                where: { userId_provider: { userId: booking.hostId, provider: 'zoom' } }
            });
            if (zoomAccount?.refreshToken) {
                try {
                    const result = await deleteZoomMeeting(zoomAccount.refreshToken, booking.providerEventId);
                    if (result.newRefreshToken && result.newRefreshToken !== zoomAccount.refreshToken) {
                        await prisma.oauthAccount.update({
                            where: { oauthAccountId: zoomAccount.oauthAccountId },
                            data: { refreshToken: result.newRefreshToken }
                        });
                    }
                } catch (e) {
                    console.error("Failed to delete Zoom meeting:", e);
                }
            }
        }

        // Trigger cancel emails (await to ensure execution in serverless environments like Vercel)
        await sendBookingCancelledEmails({
            bookingId: booking.bookingId,
            eventTitle: booking.event.title,
            hostName: `@${booking.host.username}`,
            hostEmail: booking.host.email,
            guestName: booking.guestName,
            guestEmail: booking.guestEmail,
            guestTimezone: booking.guestTimezone || undefined,
            startsAt: booking.startsAt,
            endsAt: booking.endsAt,
            locationLabel,
            notes: booking.notes,
            meetingUrl: booking.meetingUrl,
        }, reason);

        return { success: true };
    } catch (error) {
        console.error("Error cancelling booking:", error);
        return { success: false, message: "An unexpected error occurred while cancelling the booking." };
    }
}

export async function rescheduleBookingAction(bookingId: number, newStartsAt: string, newEndsAt: string) {
    const parsed = rescheduleBookingSchema.safeParse({ bookingId, newStartsAt, newEndsAt });
    if (!parsed.success) {
        return { success: false, message: "Invalid reschedule data." };
    }
    try {
        const booking = await prisma.booking.findUnique({
            where: { bookingId },
            include: {
                event: {
                    select: {
                        title: true,
                        platform: true,
                        location: true,
                    }
                },
                host: {
                    select: {
                        username: true,
                        email: true,
                    }
                }
            }
        });

        if (!booking) {
            return { success: false, message: "Booking not found." };
        }

        const oldStartsAt = booking.startsAt;

        // Check for an overlapping confirmed booking for this host at the same new time (excluding this booking itself)
        const conflict = await prisma.booking.findFirst({
            where: {
                hostId: booking.hostId,
                status: 'confirmed',
                bookingId: { not: bookingId },
                OR: [
                    {
                        startsAt: { lt: new Date(newEndsAt) },
                        endsAt: { gt: new Date(newStartsAt) },
                    },
                ],
            },
        });
        if (conflict) {
            return { success: false, message: "This time slot is no longer available. Please choose another." };
        }

        const updatedBooking = await prisma.booking.update({
            where: { bookingId },
            data: {
                startsAt: new Date(newStartsAt),
                endsAt: new Date(newEndsAt),
                status: 'confirmed',
            }
        });

        if (booking.providerEventId && booking.event.platform === 'zoom') {
            const zoomAccount = await prisma.oauthAccount.findUnique({
                where: { userId_provider: { userId: booking.hostId, provider: 'zoom' } }
            });
            if (zoomAccount?.refreshToken) {
                try {
                    const result = await updateZoomMeeting(zoomAccount.refreshToken, booking.providerEventId, {
                        startsAt: updatedBooking.startsAt,
                        durationMins: Math.round((updatedBooking.endsAt.getTime() - updatedBooking.startsAt.getTime()) / 60000)
                    });
                    if (result.newRefreshToken && result.newRefreshToken !== zoomAccount.refreshToken) {
                        await prisma.oauthAccount.update({
                            where: { oauthAccountId: zoomAccount.oauthAccountId },
                            data: { refreshToken: result.newRefreshToken }
                        });
                    }
                } catch (e) {
                    console.error("Failed to update Zoom meeting:", e);
                }
            }
        }

        const locationLabel = booking.meetingUrl 
            ? `<a href="${booking.meetingUrl}" style="color:#2563eb;word-break:break-all;">${booking.meetingUrl}</a>`
            : booking.event.platform === 'zoom' ? 'Zoom Video'
            : booking.event.location || 'In-Person Meeting';

        // Trigger reschedule emails (await to ensure execution in serverless environments like Vercel)
        await sendBookingRescheduledEmails({
            bookingId: booking.bookingId,
            eventTitle: booking.event.title,
            hostName: `@${booking.host.username}`,
            hostEmail: booking.host.email,
            guestName: booking.guestName,
            guestEmail: booking.guestEmail,
            guestTimezone: booking.guestTimezone || undefined,
            startsAt: updatedBooking.startsAt,
            endsAt: updatedBooking.endsAt,
            locationLabel,
            notes: booking.notes,
            meetingUrl: booking.meetingUrl,
        }, oldStartsAt);

        return { success: true };
    } catch (error) {
        console.error("Error rescheduling booking:", error);
        return { success: false, message: "An unexpected error occurred while rescheduling the booking." };
    }
}
