import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import { requireRole } from "../middlewares/requireRole.js";
import { listarNotificaciones, leerNotificacion } from "../controllers/notificaciones.controller.js";

const router = Router();

// esto setea req.user
router.use(authMiddleware);

// roles que pueden ver sus notificaciones
router.get("/", requireRole("VENTAS", "GERENTE", "DIRECTOR", "ADMIN"), listarNotificaciones);
router.put("/:id/leida", requireRole("VENTAS", "GERENTE", "DIRECTOR", "ADMIN"), leerNotificacion);

export default router;