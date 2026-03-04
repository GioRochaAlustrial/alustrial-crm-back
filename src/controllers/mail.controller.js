import { sendMail } from "../services/mail.service.js";

export async function enviarCorreo(req, res, next) {
  try {
    // 🔒 Recomendado para empresa: solo admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "NO_AUTORIZADO" });
    }

    const { to, subject, text, html } = req.body;

    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({
        error: "CAMPOS_REQUERIDOS",
        message: "to, subject y text o html son requeridos",
      });
    }

    const result = await sendMail({ to, subject, text, html });
    return res.json({ ok: true, ...result });
  } catch (err) {
    return next(err);
  }
}