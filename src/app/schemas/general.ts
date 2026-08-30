import { z } from "zod";
import { Platform } from "@prisma/client"

const Duration = z.enum(["15", "30", "45", "60", "90", "120"])
const IntervalSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
})

const emailSchema = z.string().email({ message: "Please enter a valid email address" })
const passwordSchema = z.string().min(8, { message: "Password must be at least 8 characters" })

export { Duration, IntervalSchema, emailSchema, passwordSchema }