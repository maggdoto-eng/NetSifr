import 'server-only';
import { Resend } from 'resend';

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Password-reset and invitation links are never console-logged outside
 * development — a missing/misconfigured provider in production hard-fails
 * the caller instead of silently leaking a live credential-bearing link into
 * server logs (see docs/plan.md).
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'RESEND_API_KEY is not configured — refusing to send email in production rather than degrade silently.',
      );
    }
    console.log(`[dev email] to=${payload.to} subject="${payload.subject}"\n${payload.text}`);
    return;
  }

  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM ?? 'NetSifr <no-reply@netsifr.org>';
  const { error } = await resend.emails.send({ from, ...payload });
  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
