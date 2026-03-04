import { Router } from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import { enviarCorreo } from "../controllers/mail.controller.js";

const router = Router();

router.use(authMiddleware);
router.post("/", enviarCorreo);

export default router;