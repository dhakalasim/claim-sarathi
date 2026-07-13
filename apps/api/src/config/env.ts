import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  API_PORT: z.coerce.number().int().positive().default(4000),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_LOCAL_ROOT: z.string().default("./uploads"),
  SMS_PROVIDER: z.enum(["console"]).default("console"),
  EMAIL_PROVIDER: z.enum(["console"]).default("console"),
  /** Optional — the AI claims assistant (POST /assistant/chat) responds with a clear "not configured" error when this is unset, rather than the API failing to start. */
  ANTHROPIC_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
