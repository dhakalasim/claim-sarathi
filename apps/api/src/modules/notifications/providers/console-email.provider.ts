import type { EmailMessage, EmailProvider } from "./email-provider.interface.js";

/** No-op provider for local dev: logs instead of calling a real mail gateway. */
export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<{ success: boolean }> {
    console.log(`[email:console] to=${message.toEmail} subject="${message.subject}" body=${message.body}`);
    return { success: true };
  }
}
