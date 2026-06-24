/**
 * WhatsApp notification layer.
 *
 * The product will eventually coordinate with customers over WhatsApp (e.g.
 * confirming a paid booking or telling them the motorcycle is ready). No
 * provider is integrated yet, so this module ships a no-op implementation and a
 * single interface. Plugging in Twilio / the WhatsApp Business API later means
 * adding one more implementation and selecting it in `createWhatsAppNotifier`
 * via the WHATSAPP_PROVIDER env var — no call sites change.
 */

export interface WhatsAppMessage {
  /** Destination in E.164 (e.g. +56912345678). */
  to: string;
  /** Plain-text body to deliver. */
  body: string;
  /** Optional tag for logging/metrics (e.g. 'payment_confirmed'). */
  kind?: string;
}

export interface WhatsAppNotifier {
  /**
   * Best-effort delivery. Implementations must never throw into business flows:
   * a notification failure should not roll back a payment or status change.
   */
  send(message: WhatsAppMessage): Promise<void>;
}

interface NotifierLogger {
  info: (object: unknown, message?: string) => void;
}

/** Logs the message instead of sending it. Used until a provider is wired up. */
export class NoopWhatsAppNotifier implements WhatsAppNotifier {
  constructor(private readonly logger?: NotifierLogger) {}

  async send(message: WhatsAppMessage): Promise<void> {
    this.logger?.info(
      { kind: message.kind, to: message.to },
      'whatsapp notification skipped (no provider configured)',
    );
  }
}

/**
 * Selects a notifier implementation. Today only 'noop' exists; future providers
 * (twilio, meta) are added here and chosen with the WHATSAPP_PROVIDER env var.
 */
export function createWhatsAppNotifier(
  provider: string | undefined,
  logger?: NotifierLogger,
): WhatsAppNotifier {
  switch (provider) {
    // case 'twilio':
    //   return new TwilioWhatsAppNotifier(...);
    case undefined:
    case '':
    case 'noop':
      return new NoopWhatsAppNotifier(logger);
    default:
      return new NoopWhatsAppNotifier(logger);
  }
}
