// src/controllers/health.controller.js
export function healthCheck(req, res) {
  return res.status(200).json({
    ok: true,
    service: "crm",
    timestamp: new Date().toISOString(),
  });
}
