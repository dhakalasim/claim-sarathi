import type { SmsMessage, SmsProvider } from "./sms-provider.interface.js";

/** No-op provider for local dev: logs instead of calling a real gateway. */
export class ConsoleSmsProvider implements SmsProvider {
  async send(message: SmsMessage): Promise<{ success: boolean }> {
    console.log(`[sms:console] to=${message.toPhone} body=${message.body}`);
    return { success: true };
  }
}
