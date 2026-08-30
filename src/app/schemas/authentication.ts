import { z } from "zod";
import { emailSchema, passwordSchema } from "./general";


const registerSchema = z.object({
    username: z.string().min(4, {message: "Username must be at least 4 characters"}).max(20, {message: "Username must be at most 20 characters"}),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
})

const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    remember: z.boolean(),
})

export { loginSchema, registerSchema }