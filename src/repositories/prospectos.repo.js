import { query } from "./db.js";
import { pool } from "../config/db.js";  
export async function createProspecto({
  id_usuarios,
  empresa,
  direccion,
  nombre,
  telefono,
  extension = null,
  celular,
  correo,
  tipo_contacto,
}) {
  const sql = `
    INSERT INTO prospectos
      (id_usuarios, empresa, direccion, nombre, telefono, extension, celular, correo, tipo_contacto)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING
      id, id_usuarios, empresa, direccion, nombre, telefono, extension, celular, correo, tipo_contacto, created_at, updated_at;
  `;

  const values = [
    id_usuarios,
    empresa,
    direccion,
    nombre,
    String(telefono),
    extension,
    String(celular),
    correo,
    tipo_contacto,
  ];

  const { rows } = await pool.query(sql, values);
  return rows[0];
}

export async function listProspectosByUsuario(id_usuarios) {
  const sql = `
    SELECT
      p.*,
      nc.id AS next_cita_id,
      nc.fecha_hora AS next_cita_fecha_hora,
      nc.nota AS next_cita_nota,
      nc.tipo AS next_cita_tipo,              -- ✅ NUEVO
      nc.estado_ui AS next_cita_estado_ui
    FROM prospectos p
    LEFT JOIN LATERAL (
      SELECT
        c.id,
        c.fecha_hora,
        c.nota,
        c.tipo,                               -- ✅ NUEVO
        c.estado,
        CASE
          WHEN c.estado = 'PROGRAMADA'
           AND c.fecha_hora < (NOW() - INTERVAL '1 day')
          THEN 'VENCIDA'
          ELSE c.estado
        END AS estado_ui
      FROM citas c
      WHERE c.id_prospectos = p.id
        AND c.id_usuarios = p.id_usuarios
        AND c.estado = 'PROGRAMADA'
      ORDER BY
        (c.fecha_hora >= NOW()) DESC,
        c.fecha_hora ASC
      LIMIT 1
    ) nc ON TRUE
    WHERE p.id_usuarios = $1
    ORDER BY p.id DESC;
  `;

  const result = await pool.query(sql, [Number(id_usuarios)]);
  return result?.rows ?? result ?? [];
}

export async function listProspectosAll() {
  const sql = `
    SELECT
      p.*,
      nc.id AS next_cita_id,
      nc.fecha_hora AS next_cita_fecha_hora,
      nc.nota AS next_cita_nota,
      nc.estado AS next_cita_estado
    FROM prospectos p
    LEFT JOIN LATERAL (
      SELECT c.id, c.fecha_hora, c.nota, c.estado
      FROM citas c
      WHERE c.id_prospectos = p.id
        AND c.id_usuarios = p.id_usuarios
        AND c.estado = 'PROGRAMADA'
      ORDER BY
        (c.fecha_hora >= NOW()) DESC,                 -- primero futuras
        CASE WHEN c.fecha_hora >= NOW()
             THEN c.fecha_hora END ASC,              -- futura más próxima
        CASE WHEN c.fecha_hora < NOW()
             THEN c.fecha_hora END DESC              -- si no hay futura, la vencida más reciente
      LIMIT 1
    ) nc ON TRUE
    ORDER BY p.id DESC;
  `;

  const result = await pool.query(sql);
  return result?.rows ?? result ?? [];
}

export async function getProspectoByIdForUsuario(id, id_usuarios) {
  const sql = `
    SELECT id, id_usuarios, empresa, direccion, nombre, telefono, extension, celular, correo, tipo_contacto, tipo_proyecto, created_at, updated_at
    FROM prospectos
    WHERE id = $1 AND id_usuarios = $2;
  `;
  const { rows } = await pool.query(sql, [id, id_usuarios]);
  return rows[0] ?? null;
}

export async function getProspectoById(id) {
  const sql = `
    SELECT id, id_usuarios, empresa, direccion, nombre, telefono, extension, celular, correo, tipo_contacto, tipo_proyecto, created_at, updated_at
    FROM prospectos
    WHERE id = $1;
  `;
  const { rows } = await pool.query(sql, [id]);
  return rows[0] ?? null;
}

function isEmpty(v) {
  return v === null || v === undefined || String(v).trim() === "";
}

const ALLOWED_FIELDS = [
  "empresa",
  "direccion",
  "nombre",
  "telefono",
  "extension",
  "celular",
  "correo",
  "tipo_contacto",
  "tipo_proyecto",
];

export async function updateProspectoForUsuario(id, id_usuarios, p) {
  // 1) Traer registro actual
  const current = await getProspectoByIdForUsuario(Number(id), Number(id_usuarios));
  if (!current) return null;

  // 2) Construir SET dinámico solo con campos vacíos en BD
  const setParts = [];
  const values = [];
  let idx = 1;

  for (const field of ALLOWED_FIELDS) {
    const currentVal = current[field];
    const incomingVal = p?.[field];

    // solo permitir llenar si el actual está vacío y el incoming trae valor
    if (isEmpty(currentVal) && !isEmpty(incomingVal)) {
      setParts.push(`${field} = $${idx}`);
      values.push(incomingVal);
      idx++;
    }
  }

  // Si no hay nada que actualizar, regresa el registro actual
  if (setParts.length === 0) return current;

  // 3) updated_at
  setParts.push(`updated_at = NOW()`);

  // 4) WHERE
  values.push(Number(id), Number(id_usuarios));
  const whereId = `$${idx}`;
  const whereUser = `$${idx + 1}`;

  const sql = `
    UPDATE prospectos
    SET ${setParts.join(", ")}
    WHERE id = ${whereId} AND id_usuarios = ${whereUser}
    RETURNING id, id_usuarios, empresa, direccion, nombre, telefono, extension, celular, correo, tipo_contacto, tipo_proyecto, created_at, updated_at;
  `;

  const { rows } = await pool.query(sql, values);
  return rows?.[0] ?? null;
}

export async function deleteProspectoForUsuario(id, id_usuarios) {
  const sql = `DELETE FROM prospectos WHERE id = $1 AND id_usuarios = $2 RETURNING id;`;
  const { rows } = await pool.query(sql, [id, id_usuarios]);
  return rows[0] ?? null;
}

export async function deleteProspecto(id) {
  const sql = `DELETE FROM prospectos WHERE id = $1 RETURNING id;`;
  const { rows } = await pool.query(sql, [id]);
  return rows[0] ?? null;
}