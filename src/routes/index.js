// src/routes/index.js
import { Router } from "express";
import { healthCheck } from "../controllers/health.controller.js";
import usuariosRoutes from "./usuarios.routes.js";
import authRoutes from "./auth.routes.js";
import prospectosRoutes from "./prospectos.routes.js";
import mailRoutes from "./mail.routes.js";
import citasRoutes from "./citas.routes.js";


const router = Router();

router.get("/health", healthCheck);
router.use("/usuarios", usuariosRoutes);
router.use("/auth", authRoutes);
router.use("/prospectos", prospectosRoutes);
router.use("/mail", mailRoutes);
router.use("/citas", citasRoutes);

export default router;