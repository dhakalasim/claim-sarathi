export interface EmailMessage {
  toEmail: string;
  subject: string;
  body: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<{ success: boolean; error?: string }>;
}
