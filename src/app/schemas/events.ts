import { z } from "zod";
import { Duration, IntervalSchema } from "./general";
import { Platform } from "@prisma/client"

const createEventSchema = z.object({
    title: z.string().min(4, {message: "Title must be at least 4 characters"}).max(50, {message: "Title must be at most 50 characters"}),
    description: z.string().min(10, {message: "Description must be at least 10 characters"}).max(500, {message: "Description must be at most 500 characters"}),
    duration: Duration,
    platform: z.nativeEnum(Platform),
    location: z.string().max(100, {message: "Location must be at most 100 characters"}).optional(),
    minNoticeMins: z.number().min(0).default(240),
    rollingWindowDays: z.number().min(0).default(60)
})



const availabilitySchema = z.object({
    dayOfWeek: z.number().min(0).max(6),
    intervals: z.array(IntervalSchema),
})

const weeklyAvailabilitySchema = z.array(availabilitySchema);

const updateEventSchema = z.object({
    title: z.string().min(4, {message: "Title must be at least 4 characters"}).max(50, {message: "Title must be at most 50 characters"}).optional(),
    description: z.string().min(10, {message: "Description must be at least 10 characters"}).max(500, {message: "Description must be at most 500 characters"}).optional(),
    duration: Duration.optional(),
    platform: z.nativeEnum(Platform),
    location: z.string().max(100, {message: "Location must be at most 100 characters"}).optional(),
    minNoticeMins: z.number().min(0).default(240).optional(),
    rollingWindowDays: z.number().min(0).default(60).optional()
})

const updateAvailabilitySchema = z.object({
    dayOfWeek: z.number().min(0).max(6).optional(),
    intervals: z.array(IntervalSchema).optional(),
})

export type CreateEventFormInput = z.input<typeof createEventSchema>;
export type CreateEventFormOutput = z.output<typeof createEventSchema>;
export type UpdateEventFormInput = z.input<typeof updateEventSchema>;
export type UpdateEventFormOutput = z.output<typeof updateEventSchema>;
export type WeeklyAvailabilityInput = z.input<typeof weeklyAvailabilitySchema>;
export type WeeklyAvailabilityOutput = z.output<typeof weeklyAvailabilitySchema>;

export { createEventSchema, availabilitySchema, weeklyAvailabilitySchema, updateEventSchema, updateAvailabilitySchema }