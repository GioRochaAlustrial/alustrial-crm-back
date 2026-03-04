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
    const { rows } = await  pool.query(sql, [String(categoria).toUpperCase()]);
    return rows;
}

export async function listNotificacionesByUser({ id_usuario, only_unread = true, limit = 20 }) {
  const sql = `
    SELECT id, id_usuario, tipo, payload, leida, created_at
    FROM notificaciones
    WHERE id_usuario = $1
      AND ($2::bool = false OR leida = false)
    ORDER BY created_at DESC
    LIMIT $3;
  `;
  const { rows } = await  pool.query(sql, [Number(id_usuario), Boolean(only_unread), Number(limit)]);
  return rows;
}

export async function markNotificacionLeida({ id, id_usuario }) {
  const sql = `
    UPDATE notificaciones
    SET leida = true
    WHERE id = $1 AND id_usuario = $2
    RETURNING *;
  `;
  const { rows } = await  pool.query(sql, [Number(id), Number(id_usuario)]);
  return rows?.[0] ?? null;
}