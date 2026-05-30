import axios from 'axios';
import { env } from '../config/env';

const FONNTE_URL = 'https://api.fonnte.com/send';

export interface WaMessage {
  target: string;
  message: string;
}

/**
 * Send a WhatsApp message via Fonnte.
 * Returns false (no throw) when Fonnte is not configured — caller decides
 * whether to log or ignore.
 */
export async function sendWhatsApp(msg: WaMessage): Promise<boolean> {
  if (!env.FONNTE_API_KEY || !env.FONNTE_SENDER_NUMBER) {
    return false;
  }

  await axios.post(
    FONNTE_URL,
    {
      target: msg.target,
      message: msg.message,
      sender: env.FONNTE_SENDER_NUMBER,
    },
    {
      headers: { Authorization: env.FONNTE_API_KEY },
      timeout: 10_000,
    },
  );

  return true;
}

/**
 * Send to multiple targets sequentially with a small delay between each
 * to avoid Fonnte rate limits.
 */
export async function sendWhatsAppBulk(
  messages: WaMessage[],
  delayMs = 500,
): Promise<{ sent: number; skipped: number; failed: number }> {
  if (!env.FONNTE_API_KEY || !env.FONNTE_SENDER_NUMBER) {
    return { sent: 0, skipped: messages.length, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const msg of messages) {
    try {
      await sendWhatsApp(msg);
      sent++;
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    } catch {
      failed++;
    }
  }

  return { sent, skipped: 0, failed };
}
