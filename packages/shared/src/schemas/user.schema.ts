import { z } from "zod";
import { ROLES } from "../constants/claim-stages.js";

export const roleSchema = z.enum(ROLES);

export const userPublicSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  fullName: z.string().min(1),
  role: roleSchema,
  locale: z.enum(["en", "ne"]),
  createdAt: z.coerce.date(),
});

export type UserPublic = z.infer<typeof userPublicSchema>;
