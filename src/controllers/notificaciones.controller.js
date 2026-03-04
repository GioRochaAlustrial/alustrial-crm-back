import { listNotificacionesByUser, markNotificacionLeida } from "../repositories/notificaciones.repo.js";

export async function listarNotificaciones(req, res) {
    try {
        const id_usuario = req.user?.id || req.usuario?.id || req.userId;

        if (!id_usuario) {
            return res.status(401).json({ error: "NO_AUTH" });
        }

        const only_unread = String(req.query.only_unread ?? "true") !== "false";
        const limit = Number(req.query.limit ?? 20);

        const rows = await listNotificacionesByUser({
            id_usuario,
            only_unread,
            limit,
        });

        return res.json(rows);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
}

export async function leerNotificacion(req, res) {
    try {
        const id_usuario = getUserId(req);
        if (!id_usuario) return res.status(401).json({ error: "NO_AUTH" });

        const { id } = req.params;
        const updated = await markNotificacionLeida({ id, id_usuario });
        if (!updated) return res.status(404).json({ error: "NOT_FOUND" });

        return res.json(updated);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
}