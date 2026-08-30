import { z } from "zod";

export const createBookingSchema = z.object({
    eventId: z.number().int().positive(),
    hostId: z.number().int().positive(),
    guestName: z.string().min(4).max(100),
    guestEmail: z.string().email().max(254),
    guestTimezone: z.string().min(1),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    notes: z.string().max(2000).optional(),
});

export const cancelBookingSchema = z.object({
    bookingId: z.number().int().positive(),
    reason: z.string().max(1000).optional(),
});

export const rescheduleBookingSchema = z.object({
    bookingId: z.number().int().positive(),
    newStartsAt: z.string().datetime(),
    newEndsAt: z.string().datetime(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
