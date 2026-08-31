'use server';

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Platform } from "@prisma/client"
import { getCurrentUser } from "./authentication";
import { weeklyAvailabilitySchema, createEventSchema } from "@/app/schemas/events";

function generateSlug(title: string) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

type Response = {
    success: boolean;
    message?: string;
}

type EventsResponse = {
    success: boolean;
    events: EventDao[];
}

export async function createEvent(data: z.infer<typeof createEventSchema>) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return { success: false, message: "You must be logged in to create an event type." };
        }

        const availabilitiesCount = await prisma.availability.count({
            where: { userId: parseInt(currentUser.id) }
        });
        if (availabilitiesCount === 0) {
            return { success: false, message: "You must set your availability schedule first before creating an event type." };
        }

        const validation = createEventSchema.safeParse(data);
        if (!validation.success) {
            const formattedErrors = validation.error.flatten().fieldErrors;
            const firstErrorMsg = Object.values(formattedErrors).flat().find(Boolean);
            return { 
                success: false, 
                message: firstErrorMsg || "Invalid event data provided.",
                errors: formattedErrors
            };
        }
        let { title, description, duration, platform, location, minNoticeMins, rollingWindowDays } = validation.data;

        if (platform === 'zoom') {
            const zoomAccount = await prisma.oauthAccount.findUnique({
                where: {
                    userId_provider: {
                        userId: parseInt(currentUser.id),
                        provider: 'zoom',
                    },
                },
            });
            if (!zoomAccount) {
                return {
                    success: false,
                    message: "You must connect a Zoom account in Profile Settings before creating a Zoom event.",
                };
            }
        }
        const slug = generateSlug(title);
        const fullSlug = `${currentUser.username}/${slug}`;
        const existingEvent = await prisma.event.findFirst({
            where: {
                slug: fullSlug,
            },
        });
        if (existingEvent) {
            return { success: false, message: `An event type named "${title}" already exists on your account. Please choose a different title.` };
        }
        const eventType = await prisma.event.create({
            data: {
                title,
                slug: fullSlug,
                description,
                durationMins: parseInt(duration),
                platform,
                location,
                minNoticeMins,
                rollingWindowDays,
                hostId: parseInt(currentUser.id),
            }
        });
        return { success: true, eventType };
    } catch (error) {
        console.error("Error creating event type:", error);
        return { success: false, message: "An unexpected error occurred while creating the event type." };
    }
}

export async function updateEvent(eventId: number, data: z.infer<typeof createEventSchema>) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return { success: false, message: "You must be logged in to update an event type." };
        }

        const availabilitiesCount = await prisma.availability.count({
            where: { userId: parseInt(currentUser.id) }
        });
        if (availabilitiesCount === 0) {
            return { success: false, message: "You must set your availability schedule first before updating an event type." };
        }
        const validation = createEventSchema.safeParse(data);
        if (!validation.success) {
            const formattedErrors = validation.error.flatten().fieldErrors;
            const firstErrorMsg = Object.values(formattedErrors).flat().find(Boolean);
            return { 
                success: false, 
                message: firstErrorMsg || "Invalid event data provided.",
                errors: formattedErrors
            };
        }
        let { title, description, duration, platform, location, minNoticeMins, rollingWindowDays } = validation.data;

        if (platform === 'zoom') {
            const zoomAccount = await prisma.oauthAccount.findUnique({
                where: {
                    userId_provider: {
                        userId: parseInt(currentUser.id),
                        provider: 'zoom',
                    },
                },
            });
            if (!zoomAccount) {
                return {
                    success: false,
                    message: "You must connect a Zoom account in Profile Settings before setting the platform to Zoom.",
                };
            }
        }
        const slug = generateSlug(title);
        const fullSlug = `${currentUser.username}/${slug}`;
        
        const existingEvent = await prisma.event.findUnique({
            where: {
                eventId: eventId,
            },
        });
        if (!existingEvent) {
            return { success: false, message: "Event type not found." };
        }
        if (existingEvent.hostId !== parseInt(currentUser.id)) {
            return { success: false, message: "You are not authorized to update this event type." };
        }

        // Check if updating the title results in a duplicate slug for another event of this user
        const duplicateEvent = await prisma.event.findFirst({
            where: {
                slug: fullSlug,
                NOT: {
                    eventId: eventId,
                },
            },
        });
        if (duplicateEvent) {
            return { success: false, message: `An event type named "${title}" already exists on your account. Please choose a different title.` };
        }

        const updatedEvent = await prisma.event.update({
            where: {
                eventId: eventId,
            },
            data: {
                title,
                slug: fullSlug,
                description,
                durationMins: parseInt(duration),
                platform,
                location,
                minNoticeMins,
                rollingWindowDays,
            }
        });
        return { success: true, eventType: updatedEvent };
    } catch (error: any) {
        console.error("Error updating event type:", error);
        if (error?.code === 'P2002') {
            return { success: false, message: `An event type with a similar name already exists on your account.` };
        }
        return { success: false, message: "An unexpected error occurred while updating the event type." };
    }
}

export async function deleteEvent(eventId: number) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return { success: false, message: "Not authorized" };
        }
        const existingEvent = await prisma.event.findUnique({
            where: {
                eventId: eventId,
            },
        });
        if (!existingEvent) {
            return { success: false, message: "Event type not found" };
        }
        if (existingEvent.hostId !== parseInt(currentUser.id)) {
            return { success: false, message: "Not authorized" };
        }
        await prisma.event.delete({
            where: {
                eventId: eventId,
            },
        });
        return { success: true, message: "Event type deleted successfully." };
    } catch (error: any) {
        console.error("Error deleting event type:", error);
        if (error?.code === 'P2003' || error?.code === 'P2014') {
            return { 
                success: false, 
                message: "Cannot delete this event type because it has existing bookings. Please cancel or delete all bookings first." 
            };
        }
        return { success: false, message: "An unexpected error occurred while deleting the event type." };
    }
}

type EventDao = {
    eventId: number;
    title: string;
    description: string | null;
    durationMins: number;
    platform: Platform;
    location: string | null;
    minNoticeMins: number;
    rollingWindowDays: number;
    bookingCount?: number;
}

type EventDaoResponse = {
    success: boolean;
    message?: string;
    event?: EventDao;
}

export async function getEventById(eventId: number): Promise<EventDaoResponse> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return { success: false, message: "Not authorized" };
        }
        const existingEvent = await prisma.event.findUnique({
            where: {
                eventId: eventId,
            },
        });
        if (!existingEvent) {
            return { success: false, message: "Event not found" };
        }
        if (existingEvent.hostId !== parseInt(currentUser.id)) {
            return { success: false, message: "Not authorized" };
        }
        const toReturn: EventDao = {
            eventId: existingEvent.eventId,
            title: existingEvent.title,
            description: existingEvent.description,
            durationMins: existingEvent.durationMins,
            platform: existingEvent.platform,
            location: existingEvent.location,
            minNoticeMins: existingEvent.minNoticeMins,
            rollingWindowDays: existingEvent.rollingWindowDays,
        }
        return { success: true, event: toReturn };
    } catch (error) {
        console.error("Error getting event:", error);
        return { success: false, message: "An unexpected error occurred" };
    }
}

export async function getMyEvents(): Promise<EventsResponse | Response> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return { success: false, message: "Not authorized" } as Response;
        }
        const events = await prisma.event.findMany({
            where: {
                hostId: parseInt(currentUser.id),
            },
            include: {
                _count: {
                    select: { bookings: true }
                }
            }
        });
        const toReturn: EventDao[] = [];
        for (let i = 0; i < events.length; ++i) {
            toReturn.push({
                eventId: events[i].eventId,
                title: events[i].title,
                description: events[i].description,
                durationMins: events[i].durationMins,
                platform: events[i].platform,
                location: events[i].location,
                minNoticeMins: events[i].minNoticeMins,
                rollingWindowDays: events[i].rollingWindowDays,
                bookingCount: events[i]._count.bookings,
            })
        }
        return { success: true, events: toReturn } as EventsResponse;
    } catch (error) {
        console.error("Error getting events:", error);
        return { success: false, message: "An unexpected error occurred" } as Response;
    }
}

export async function getAvailablity(userId?: number) {
    try {
        const currentUser = await getCurrentUser();
        const targetUserId = userId || (currentUser ? parseInt(currentUser.id) : null);
        if (!targetUserId) {
            return { success: false, message: "Not authorized", availability: [] };
        }
        const availability = await prisma.availability.findMany({
            where: {
                userId: targetUserId,
            },
            orderBy: {
                dayOfWeek: 'asc',
            },
        });
        return { success: true, availability };
    } catch (error) {
        console.error("Error getting availability:", error);
        return { success: false, message: "An unexpected error occurred", availability: [] };
    }
}

export async function updateAvailability(data: z.infer<typeof weeklyAvailabilitySchema>): Promise<Response> {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return { success: false, message: "You must be logged in to update your availability schedule." };
        }

        const parseResult = weeklyAvailabilitySchema.safeParse(data);
        if (!parseResult.success) {
            const formattedErrors = parseResult.error.flatten().fieldErrors;
            const firstErrorMsg = Object.values(formattedErrors).flat().find(Boolean);
            return { success: false, message: firstErrorMsg || "Invalid availability schedule data provided." };
        }

        const userId = parseInt(currentUser.id);
        const validData = parseResult.data;

        const recordsToInsert: { userId: number; dayOfWeek: number; startTime: Date; endTime: Date }[] = [];

        for (const dayItem of validData) {
            for (const interval of dayItem.intervals) {
                const [startH, startM] = interval.startTime.split(':').map(Number);
                const [endH, endM] = interval.endTime.split(':').map(Number);

                const startTotalMins = startH * 60 + startM;
                const endTotalMins = endH * 60 + endM;

                if (startTotalMins >= endTotalMins) {
                    return { 
                        success: false, 
                        message: `Invalid time slot (${interval.startTime} - ${interval.endTime}): Start time must be before end time.` 
                    };
                }

                const startDate = new Date(Date.UTC(1970, 0, 1, startH, startM, 0));
                const endDate = new Date(Date.UTC(1970, 0, 1, endH, endM, 0));

                recordsToInsert.push({
                    userId,
                    dayOfWeek: dayItem.dayOfWeek,
                    startTime: startDate,
                    endTime: endDate,
                });
            }
        }

        await prisma.$transaction([
            prisma.availability.deleteMany({
                where: { userId },
            }),
            prisma.availability.createMany({
                data: recordsToInsert,
            }),
        ]);

        return { success: true, message: "Availability updated successfully" };
    } catch (error) {
        console.error("Error updating availability:", error);
        return { success: false, message: "An unexpected error occurred" };
    }
}

export async function getMyBookings() {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return { success: false, message: "Not authorized", bookings: [] };
        }
        const bookings = await prisma.booking.findMany({
            where: {
                hostId: parseInt(currentUser.id),
            },
            include: {
                event: true,
            },
            orderBy: {
                startsAt: 'asc',
            },
        });

        const formattedBookings = bookings.map((b) => ({
            id: String(b.bookingId),
            eventTypeId: String(b.eventId),
            eventTitle: b.event.title,
            guestName: b.guestName,
            guestEmail: b.guestEmail,
            guestTimezone: b.guestTimezone,
            startsAt: b.startsAt.toISOString(),
            endsAt: b.endsAt.toISOString(),
            status: b.status as 'confirmed' | 'cancelled' | 'completed',
            platform: b.event.platform as any,
            meetingUrl: b.meetingUrl || '',
            syncedWithGoogle: b.synced,
            notes: b.notes || '',
            cancelReason: b.cancelReason || '',
        }));

        return { success: true, bookings: formattedBookings };
    } catch (error) {
        console.error("Error getting bookings:", error);
        return { success: false, message: "An unexpected error occurred", bookings: [] };
    }
}

export type PublicEvent = {
    eventId: number;
    title: string;
    description: string | null;
    durationMins: number;
    platform: Platform;
    location: string | null;
    slug: string;
};

export type PublicHostInfo = {
    username: string;
};

export async function getHostEventsByUsername(username: string): Promise<{
    success: boolean;
    message?: string;
    host?: PublicHostInfo;
    events?: PublicEvent[];
}> {
    try {
        const host = await prisma.user.findUnique({
            where: { username },
            select: {
                userId: true,
                username: true,
                events: {
                    select: {
                        eventId: true,
                        title: true,
                        description: true,
                        durationMins: true,
                        platform: true,
                        location: true,
                        slug: true,
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!host) {
            return { success: false, message: "User not found." };
        }

        return {
            success: true,
            host: { username: host.username },
            events: host.events as PublicEvent[],
        };
    } catch (error) {
        console.error("Error fetching host events:", error);
        return { success: false, message: "An unexpected error occurred." };
    }
}

export type PublicEventDetail = {
    eventId: number;
    hostId: number;
    hostUsername: string;
    title: string;
    description: string | null;
    durationMins: number;
    platform: Platform;
    location: string | null;
    slug: string;
    minNoticeMins: number;
    rollingWindowDays: number;
    timezone: string;
};

export async function getEventBySlug(slug: string, username?: string): Promise<{
    success: boolean;
    message?: string;
    event?: PublicEventDetail;
}> {
    try {
        const possibleSlugs = Array.from(new Set([
            slug,
            username ? `${username}/${slug}` : null,
        ].filter(Boolean) as string[]));

        let event = null;

        if (username) {
            event = await prisma.event.findFirst({
                where: {
                    OR: [
                        ...possibleSlugs.map(s => ({ slug: { equals: s, mode: 'insensitive' as const } })),
                        { slug: { endsWith: `/${slug}`, mode: 'insensitive' as const } },
                    ],
                    host: {
                        username: { equals: username, mode: 'insensitive' as const },
                    },
                },
                include: {
                    host: {
                        select: { username: true },
                    },
                },
            });
        }

        if (!event) {
            event = await prisma.event.findFirst({
                where: {
                    OR: [
                        ...possibleSlugs.map(s => ({ slug: { equals: s, mode: 'insensitive' as const } })),
                        { slug: { endsWith: `/${slug}`, mode: 'insensitive' as const } },
                    ],
                },
                include: {
                    host: {
                        select: { username: true },
                    },
                },
            });
        }

        if (!event) {
            return { success: false, message: "Event not found." };
        }

        return {
            success: true,
            event: {
                eventId: event.eventId,
                hostId: event.hostId,
                hostUsername: event.host.username,
                title: event.title,
                description: event.description,
                durationMins: event.durationMins,
                platform: event.platform,
                location: event.location,
                slug: event.slug,
                minNoticeMins: event.minNoticeMins,
                rollingWindowDays: event.rollingWindowDays,
                timezone: event.timezone,
            },
        };
    } catch (error) {
        console.error("Error fetching event by slug:", error);
        return { success: false, message: "An unexpected error occurred." };
    }
}