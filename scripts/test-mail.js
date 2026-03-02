import "dotenv/config";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: (process.env.SMTP_SECURE ?? "false") === "true",
  requireTLS: (process.env.SMTP_REQUIRE_TLS ?? "true") === "true",
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

await transporter.verify();
console.log("✅ SMTP Relay OK");