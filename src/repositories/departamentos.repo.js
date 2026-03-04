import { query } from "./db.js";
import { pool } from "../config/db.js";  
export async function getGerenteIdByDepartamentoNombre(nombre) {
  const sql = `SELECT gerente_id FROM departamentos WHERE UPPER(nombre)=UPPER($1) LIMIT 1;`;
  const { rows } = await pool.query(sql, [String(nombre || "").trim()]);
  return rows?.[0]?.gerente_id ?? null;
}

export async function getDeptosByGerenteId(gerenteId) {
  const sql = `
    SELECT nombre
    FROM departamentos
    WHERE gerente_id = $1
    ORDER BY nombre;
  `;
  const { rows } = await pool.query(sql, [Number(gerenteId)]);
  return rows.map(r => r.nombre);
}