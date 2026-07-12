export interface SmsMessage {
  toPhone: string;
  body: string;
}

/**
 * Abstraction over the outbound SMS gateway. A Nepali provider such as
 * Sparrow SMS plugs in by implementing this interface — see
 * docs/roadmap.md for the integration task. Nothing outside this module
 * should import a concrete provider directly.
 */
export interface SmsProvider {
  send(message: SmsMessage): Promise<{ success: boolean; error?: string }>;
}
