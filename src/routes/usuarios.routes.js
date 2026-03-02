import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import {
  actualizarUsuario,
  crearUsuario,
  eliminarUsuario,
  listarUsuarios,
  obtenerUsuario,
} from "../controllers/usuarios.controller.js";

const router = Router();

router.post("/", crearUsuario);

router.use(authMiddleware);
router.get("/", listarUsuarios);
router.get("/:id", obtenerUsuario);
router.put("/:id", actualizarUsuario);
router.delete("/:id", eliminarUsuario);

export default router;