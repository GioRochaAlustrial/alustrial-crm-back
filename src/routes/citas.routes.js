import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import { crearCita, actualizarEstadoCita, cancelarCita, reprogramarCita, listarCitas, listarAutorizaciones, resolverAutorizacion } from "../controllers/citas.controller.js";
import { requireRole } from "../middlewares/requireRole.js";

const router = Router();

router.use(authMiddleware);

/**
 * =========================
 * Ventas (y Admin)
 * =========================
 * - Crear cita: visita comercial o levantamiento (queda auth PENDIENTE)
 * - Reprogramar: solo levantamiento si NO está RECHAZADA
 */
router.post("/prospectos/:id/citas", requireRole("VENTAS", "ADMIN"), crearCita);
router.put("/:id/reprogramar", requireRole("VENTAS", "ADMIN"), reprogramarCita);

/**
 * =========================
 * Autorizaciones (Gerencias)
 * =========================
 * - Bandeja: pendientes por categoria
 * - Resolver: autorizar o rechazar
 *
 * Roles:
 * - GERENTE (operaciones/proyectos)
 * - DIRECTOR (si lo agregas)
 * - ADMIN
 */
router.get("/autorizaciones", requireRole("GERENTE", "DIRECTOR", "ADMIN"), listarAutorizaciones);
router.put("/:id/autorizaciones", requireRole("GERENTE", "DIRECTOR", "ADMIN"), resolverAutorizacion);

/**
 * =========================
 * Operación especialistas
 * =========================
 * - Listar (visible por jerarquía)
 * - Cambiar estado (REALIZADA, etc.)
 */
router.get("/", requireRole("ESPECIALISTA", "GERENTE", "DIRECTOR", "ADMIN"), listarCitas);
router.put("/:id/estado", requireRole("ESPECIALISTA", "ADMIN"), actualizarEstadoCita);

/**
 * =========================
 * Cancelación
 * =========================
 * Ventas NO puede cancelar.
 * Si quieres mantener cancelación solo para ADMIN, se queda.
 */
router.put("/:id/cancel", requireRole("ADMIN"), cancelarCita);

export default router;