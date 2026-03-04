import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import {
  listarProspectos,
  obtenerProspecto,
  crearProspecto,
  actualizarProspecto,
  eliminarProspecto,
} from "../controllers/prospectos.controller.js";

import { crearCita } from "../controllers/citas.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", listarProspectos);
router.get("/:id", obtenerProspecto);
router.post("/", crearProspecto);
router.put("/:id", actualizarProspecto);
router.delete("/:id", eliminarProspecto);
router.post("/:id/citas", crearCita);

export default router;