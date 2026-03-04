export function errorHandler(err, req, res, next) {
  console.error("ERROR:", err); // ✅ debug real
  res.status(500).json({ error: "INTERNAL_ERROR" });
}