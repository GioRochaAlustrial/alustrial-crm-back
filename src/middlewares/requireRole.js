// src/middlewares/requireRole.js
export function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    const rol = String(req.user?.rol || "").toUpperCase();

    if (!rol) {
      return res.status(401).json({ error: "NO_AUTH" });
    }

    const permitidos = rolesPermitidos.map(r => String(r).toUpperCase());

    if (!permitidos.includes(rol)) {
      return res.status(403).json({ error: "FORBIDDEN_ROLE" });
    }

    return next();
  };
}

export function requireAuth(req, res, next) {
  if (!req.user && !req.usuario && !req.userId) {
    return res.status(401).json({ error: "NO_AUTH" });
  }
  next();
}