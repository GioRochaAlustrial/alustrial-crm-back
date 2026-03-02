import nodemailer from "nodemailer";

let cachedTransporter = null;

function transporter() {
  if (cachedTransporter) return cachedTransporter;

  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = (process.env.SMTP_SECURE ?? "false") === "true";

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP config incompleta. Revisa SMTP_HOST/SMTP_USER/SMTP_PASS en .env");
  }

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure, // false para 587
    requireTLS: (process.env.SMTP_REQUIRE_TLS ?? "true") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      // evita problemas con algunos entornos; normalmente no hace falta tocarlo
      servername: process.env.SMTP_HOST,
    },
  });

  return cachedTransporter;
}

export async function sendMail({ to, subject, text, html }) {
  const info = await transporter().sendMail({
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });

  return { messageId: info.messageId };
}