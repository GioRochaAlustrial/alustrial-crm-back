// src/middlewares/notfound.middleware.js
export function notFound(req, res, next) {
  res.status(404).json({
    error: "NOT_FOUND",
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}