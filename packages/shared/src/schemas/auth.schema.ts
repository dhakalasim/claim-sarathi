import { z } from "zod";
import { roleSchema } from "./user.schema.js";

export const loginSchema = z.object({
  identifier: z.string().min(3).describe("email or phone"),
  password: z.string().min(8),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, "invalid phone number")
    .optional(),
  password: z.string().min(8).max(128),
  role: roleSchema.default("POLICYHOLDER"),
  locale: z.enum(["en", "ne"]).default("en"),
}).refine((data) => Boolean(data.email) || Boolean(data.phone), {
  message: "email or phone is required",
  path: ["email"],
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const authResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string().uuid(),
    fullName: z.string(),
    role: roleSchema,
    locale: z.enum(["en", "ne"]),
  }),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
