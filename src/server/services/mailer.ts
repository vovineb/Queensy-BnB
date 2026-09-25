import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

export type Email = { to: string; subject: string; text: string; html?: string };
export type SendResult = { status: "sent" | "skipped" | "failed"; error?: string };

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  transporter = process.env.SMTP_URL ? nodemailer.createTransport(process.env.SMTP_URL) : null;
  return transporter;
}

export function emailConfigured() {
  return Boolean(process.env.SMTP_URL);
}

/**
 * Sends an email through the configured SMTP provider. Without SMTP the message
 * is logged in development and skipped in production (never silently faked).
 */
export async function sendEmail(email: Email): Promise<SendResult> {
  const t = getTransporter();
  if (!t) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[mailer] (SMTP not configured — logging instead)\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`);
    } else {
      console.warn(`[mailer] SMTP_URL not configured; email "${email.subject}" was not sent`);
    }
    return { status: "skipped", error: "SMTP not configured" };
  }
  try {
    await t.sendMail({ from: process.env.EMAIL_FROM, ...email });
    return { status: "sent" };
  } catch (error) {
    console.error("[mailer] send failed", error);
    return { status: "failed", error: error instanceof Error ? error.message : "unknown" };
  }
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Minimal, accessible HTML email layout. */
export function renderEmail({ heading, paragraphs, cta }: { heading: string; paragraphs: string[]; cta?: { label: string; url: string } }) {
  const text = [heading, "", ...paragraphs, ...(cta ? ["", `${cta.label}: ${cta.url}`] : [])].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f6f4f0;font-family:Arial,Helvetica,sans-serif;color:#13232a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td style="font-size:14px;font-weight:bold;letter-spacing:.04em;color:#0b5c57">QUEENSY BnB</td></tr>
<tr><td style="padding-top:16px;font-size:22px;font-weight:bold">${escape(heading)}</td></tr>
${paragraphs.map((p) => `<tr><td style="padding-top:12px;font-size:15px;line-height:1.6;color:#3b4a50">${escape(p)}</td></tr>`).join("")}
${cta ? `<tr><td style="padding-top:24px"><a href="${escape(cta.url)}" style="display:inline-block;background:#0b5c57;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold">${escape(cta.label)}</a></td></tr>` : ""}
</table></td></tr></table></body></html>`;
  return { text, html };
}
