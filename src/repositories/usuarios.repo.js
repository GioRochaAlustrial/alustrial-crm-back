import { query } from "./db.js";
import { pool } from "../config/db.js";  
export async function createUsuario({
  nombre,
  correo,
  telefono,
  departamento = null,
  departamento_id = null,
  contrasena,
  activo = true,
  rol = "VENTAS",
  cargo = null,
  supervisor_id = null,
  es_jefe = false,
  foto_url = null,
}) {
  const sql = `
    INSERT INTO usuarios (
      nombre, correo, telefono, departamento, departamento_id,
      contrasena, activo, rol, cargo, supervisor_id, es_jefe, foto_url
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    RETURNING
      id, nombre, correo, telefono, departamento, departamento_id,
      activo, rol, cargo, supervisor_id, es_jefe, foto_url, created_at, updated_at;
  `;

  const values = [
    nombre,
    correo,
    telefono,
    departamento,
    departamento_id,
    contrasena,
    activo,
    String(rol).toUpperCase(),
    cargo ? String(cargo).toUpperCase() : null,
    supervisor_id ? Number(supervisor_id) : null,
    !!es_jefe,
    foto_url,
  ];

  const { rows } = await pool.query(sql, values);
  return rows[0];
}

export async function getUsuarioById(id) {
  const sql = `
    SELECT u.id, u.nombre, u.correo, u.rol, u.cargo, u.departamento, u.departamento_id, u.es_jefe, u.supervisor_id, u.foto_url, d.nombre AS departamento_nombre
    FROM usuarios u
    LEFT JOIN departamentos d ON d.id = u.departamento_id
    WHERE u.id = $1;
  `;
  const { rows } = await pool.query(sql, [id]);
  return rows[0] ?? null;
}

export async function getUsuarioByCorreo(correo) {
  const sql = `
    SELECT id, nombre, correo, cargo,telefono, departamento, contrasena, activo, rol, foto_url, created_at, updated_at
    FROM usuarios
    WHERE correo = $1;
  `;
  const { rows } = await pool.query(sql, [correo]);
  console.log(rows[0])
  return rows[0] ?? null;
}

export async function listUsuarios() {
  const sql = `
    SELECT id, nombre, correo, telefono, departamento, activo, created_at, updated_at
    FROM usuarios
    ORDER BY id DESC;
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

export async function updateUsuario(id, fields) {
  // Campos permitidos
  const allowed = [
    "nombre", "correo", "telefono", "departamento", "departamento_id",
    "contrasena", "activo", "rol", "cargo", "supervisor_id", "es_jefe", "foto_url"
  ];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));

  if (keys.length === 0) return await getUsuarioById(id);

  // SET dinámico seguro
  const setClauses = keys.map((k, i) => `"${k}" = $${i + 1}`);
  const values = keys.map((k) => fields[k]);

  const sql = `
    UPDATE usuarios
    SET ${setClauses.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${keys.length + 1}
    RETURNING id, nombre, correo, telefono, departamento, activo, created_at, updated_at;
  `;

  const { rows } = await pool.query(sql, [...values, id]);
  return rows[0] ?? null;
}

export async function deleteUsuario(id) {
  const sql = `DELETE FROM usuarios WHERE id = $1 RETURNING id;`;
  const { rows } = await pool.query(sql, [id]);
  return rows[0] ?? null;
}