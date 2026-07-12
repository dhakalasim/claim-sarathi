import { z } from "zod";

export const notificationChannelSchema = z.enum(["SMS", "EMAIL"]);
export const notificationStatusSchema = z.enum(["PENDING", "SENT", "FAILED"]);

export const notificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  claimId: z.string().uuid().nullable(),
  channel: notificationChannelSchema,
  status: notificationStatusSchema,
  subject: z.string().nullable(),
  body: z.string(),
  sentAt: z.coerce.date().nullable(),
  error: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type NotificationDto = z.infer<typeof notificationSchema>;
