import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import { crearCita, actualizarEstadoCita, cancelarCita, reprogramarCita, listarCitas, listarAutorizaciones, resolverAutorizacion, autorizarCita, rechazarCita } from "../controllers/citas.controller.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = Router();

router.use(authMiddleware);

/**
 * - Crear cita: visita comercial o levantamiento (queda auth PENDIENTE)
 * - Reprogramar: solo levantamiento si NO está RECHAZADA
 */
router.post("/prospectos/:id/citas", requireRole("VENTAS", "ADMIN"), crearCita);
router.put("/:id/reprogramar", requireRole("VENTAS", "ADMIN"), reprogramarCita);

/**
 * Roles:
 * - GERENTE (operaciones/proyectos)
 * - DIRECTOR (si lo agregas)
 * - ADMIN
 */
router.get("/autorizaciones", requireRole("GERENTE", "DIRECTOR", "ADMIN"), listarAutorizaciones);
router.put("/:id/autorizacion", requireRole("GERENTE", "DIRECTOR", "ADMIN"), resolverAutorizacion);
router.put("/:id/autorizar", requireRole("GERENTE", "DIRECTOR", "ADMIN"), autorizarCita);
router.put("/:id/rechazar", requireRole("GERENTE", "DIRECTOR", "ADMIN"), rechazarCita);

/**
 * - Listar (visible por jerarquía)
 * - Cambiar estado (REALIZADA, etc.)
 */
router.get("/", requireRole("ESPECIALISTA", "GERENTE", "DIRECTOR", "ADMIN"), listarCitas);
router.put("/:id/estado", requireRole("VENTAS", "ESPECIALISTA", "ADMIN"), actualizarEstadoCita);

/**
 * Ventas NO puede cancelar.
 */
router.put("/:id/cancel", requireRole("ADMIN"), cancelarCita);

export default router;