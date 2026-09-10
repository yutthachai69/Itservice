import nodemailer, { type Transporter } from "nodemailer";

// Pluggable mail transport.
//   MAIL_TRANSPORT=log  (default) -> write to console, no SMTP needed
//   MAIL_TRANSPORT=smtp           -> real send via SMTP_* env
export interface Mail {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

const FROM = process.env.MAIL_FROM || "IT Service <no-reply@tsmgroup.local>";

let cached: Transporter | null = null;
function smtp() {
  if (!cached) {
    cached = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 25),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return cached;
}

export async function sendMail(mail: Mail): Promise<void> {
  const to = Array.isArray(mail.to) ? mail.to.filter(Boolean) : mail.to ? [mail.to] : [];
  if (to.length === 0) return;

  const mode = process.env.MAIL_TRANSPORT === "smtp" ? "smtp" : "log";
  if (mode === "log") {
    console.log(
      `\n[mail:log] → ${to.join(", ")}\n         ${mail.subject}\n${mail.text ?? stripHtml(mail.html)}\n`,
    );
    return;
  }

  try {
    await smtp().sendMail({
      from: FROM,
      to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text ?? stripHtml(mail.html),
    });
  } catch (e) {
    console.error("[mail:smtp] send failed", e);
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
}
