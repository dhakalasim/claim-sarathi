import type { PrismaClient } from "@prisma/client";
import { ConsoleEmailProvider } from "./providers/console-email.provider.js";
import { ConsoleSmsProvider } from "./providers/console-sms.provider.js";
import type { EmailProvider } from "./providers/email-provider.interface.js";
import type { SmsProvider } from "./providers/sms-provider.interface.js";

export class NotificationsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly smsProvider: SmsProvider = new ConsoleSmsProvider(),
    private readonly emailProvider: EmailProvider = new ConsoleEmailProvider(),
  ) {}

  /**
   * Fires SMS + email for a claim stage change. Failures are recorded on the
   * Notification row rather than thrown — a notification failure must never
   * roll back the stage transition that triggered it.
   */
  async notifyStageChange(params: {
    userId: string;
    claimId: string;
    claimNumber: string;
    toStage: string;
    phone: string | null;
    email: string | null;
  }): Promise<void> {
    const body = `ClaimSarathi: your claim ${params.claimNumber} is now "${params.toStage}".`;

    if (params.phone) {
      await this.send({
        userId: params.userId,
        claimId: params.claimId,
        channel: "SMS",
        body,
        send: () => this.smsProvider.send({ toPhone: params.phone as string, body }),
      });
    }

    if (params.email) {
      const subject = `Claim ${params.claimNumber} status update`;
      await this.send({
        userId: params.userId,
        claimId: params.claimId,
        channel: "EMAIL",
        subject,
        body,
        send: () => this.emailProvider.send({ toEmail: params.email as string, subject, body }),
      });
    }
  }

  private async send(params: {
    userId: string;
    claimId: string;
    channel: "SMS" | "EMAIL";
    subject?: string;
    body: string;
    send: () => Promise<{ success: boolean; error?: string }>;
  }): Promise<void> {
    const result = await params.send();

    await this.prisma.notification.create({
      data: {
        userId: params.userId,
        claimId: params.claimId,
        channel: params.channel,
        subject: params.subject,
        body: params.body,
        status: result.success ? "SENT" : "FAILED",
        sentAt: result.success ? new Date() : null,
        error: result.error,
      },
    });
  }
}
