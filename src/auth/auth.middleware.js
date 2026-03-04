import jwt from "jsonwebtoken";

export function authMiddleware(req, res, next) {
  // 1) token por cookie (httpOnly) — recomendado
  const tokenCookie = req.cookies?.token;

  // 2) token por Authorization Bearer — compatibilidad
  const authHeader = req.headers.authorization || "";
  const tokenBearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const token = tokenCookie || tokenBearer;

  /* console.log("AUTH DEBUG", {
    cookieHeader: req.headers.cookie,
    tokenCookie: req.cookies?.token ? "present" : "missing",
    authHeader: req.headers.authorization ? "present" : "missing",
  }); */

  if (!token) {
    return res.status(401).json({ error: "TOKEN_REQUERIDO" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admins = (process.env.ADMIN_DEPARTAMENTOS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const isAdmin = admins.includes(decoded.departamento);

    req.user = { ...decoded, isAdmin, rol: decoded.rol };

    return next();
  } catch (err) {
    console.error("authMiddleware error:", err);
    return res.status(401).json({ error: "TOKEN_INVALIDO" });
  }
}