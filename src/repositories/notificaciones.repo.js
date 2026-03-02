import { query } from "./db.js";
import { pool } from "../config/db.js";  
export async function createNotificacion({ id_usuario, tipo, payload = {} }) {
    const sql = `
    INSERT INTO notificaciones (id_usuario, tipo, payload, leida, created_at)
    VALUES ($1, $2, $3::jsonb, false, NOW())
    RETURNING *;
  `;
    const { rows } = await pool.query(sql, [Number(id_usuario), String(tipo), JSON.stringify(payload)]);
    return rows?.[0] ?? null;
}

export async function listCitasPendientesAutorizacion({ categoria }) {
    const sql = `
    SELECT c.*, p.empresa, p.nombre, p.correo, p.telefono, p.celular
    FROM citas c
    JOIN prospectos p ON p.id = c.id_prospectos
    WHERE c.categoria = $1
      AND c.auth_estado = 'PENDIENTE'
    ORDER BY c.fecha_hora ASC;
  `;
    const { rows } = await pool.query(sql, [String(categoria).toUpperCase()]);
    return rows;
}