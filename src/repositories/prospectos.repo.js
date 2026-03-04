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


      /* =========================
         VISITA COMERCIAL (por auth)
         ========================= */
      vc.id         AS next_comercial_id,
      vc.fecha_hora AS next_comercial_fecha_hora,
      vc.nota       AS next_comercial_nota,
      vc.auth_estado AS next_comercial_auth_estado,
      vc.auth_motivo AS next_comercial_auth_motivo,

      /* =========================
         LEVANTAMIENTO (por estado + vencida)
         ========================= */
      lv.id         AS next_levantamiento_id,
      lv.fecha_hora AS next_levantamiento_fecha_hora,
      lv.nota       AS next_levantamiento_nota,
      lv.tipo       AS next_levantamiento_tipo,
      lv.estado_ui  AS next_levantamiento_estado_ui

    FROM prospectos p

    /* ------- Comercial ------- */

    LEFT JOIN LATERAL (
      SELECT
        c.id,
        c.fecha_hora,
        c.nota,

        c.auth_estado,
        c.auth_motivo
      FROM citas c
      WHERE c.id_prospectos = p.id
        AND c.id_usuarios = p.id_usuarios
        AND c.categoria = 'VISITA_COMERCIAL'
        AND c.estado = 'PROGRAMADA'
      ORDER BY
        (c.fecha_hora >= NOW()) DESC,
        c.fecha_hora ASC
      LIMIT 1
    ) vc ON TRUE

    /* ------- Levantamiento ------- */
    LEFT JOIN LATERAL (
      SELECT
        c.id,
        c.fecha_hora,
        c.nota,
        c.tipo,

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

        AND c.categoria = 'LEVANTAMIENTO'

        AND c.estado = 'PROGRAMADA'
      ORDER BY
        (c.fecha_hora >= NOW()) DESC,
        c.fecha_hora ASC
      LIMIT 1
    ) lv ON TRUE


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


      -- CITA COMERCIAL
      nc_comercial.id AS comercial_cita_id,
      nc_comercial.fecha_hora AS comercial_fecha_hora,
      nc_comercial.nota AS comercial_nota,
      nc_comercial.estado AS comercial_estado,
      nc_comercial.auth_estado AS comercial_auth_estado,

      -- CITA LEVANTAMIENTO
      nc_lev.id AS levantamiento_cita_id,
      nc_lev.fecha_hora AS levantamiento_fecha_hora,
      nc_lev.estado AS levantamiento_estado

    FROM prospectos p

    -- =========================
    -- COMERCIAL
    -- =========================
    LEFT JOIN LATERAL (
      SELECT c.id, c.fecha_hora, c.nota, c.estado, c.auth_estado
      FROM citas c
      WHERE c.id_prospectos = p.id
        AND c.id_usuarios = p.id_usuarios
        AND c.categoria = 'VISITA_COMERCIAL'

        -- ❗ no bloquear si ya fue realizada o rechazada
        AND COALESCE(UPPER(c.estado),'') <> 'REALIZADA'
        AND COALESCE(UPPER(c.auth_estado),'') <> 'RECHAZADA'

      ORDER BY
        (c.fecha_hora >= NOW()) DESC,
        CASE WHEN c.fecha_hora >= NOW() THEN c.fecha_hora END ASC,
        CASE WHEN c.fecha_hora < NOW() THEN c.fecha_hora END DESC
      LIMIT 1
    ) nc_comercial ON TRUE

    -- =========================
    -- LEVANTAMIENTO
    -- =========================
    LEFT JOIN LATERAL (
      SELECT c.id, c.fecha_hora, c.estado
      FROM citas c
      WHERE c.id_prospectos = p.id
        AND c.categoria = 'LEVANTAMIENTO'
        AND c.estado = 'PROGRAMADA'
      ORDER BY
        (c.fecha_hora >= NOW()) DESC,
        CASE WHEN c.fecha_hora >= NOW() THEN c.fecha_hora END ASC,
        CASE WHEN c.fecha_hora < NOW() THEN c.fecha_hora END DESC
      LIMIT 1
    ) nc_lev ON TRUE

    ORDER BY p.id DESC;
  `;



  const result = await pool.query(sql);
  return result?.rows ?? result ?? [];
}

export async function getProspectoByIdForUsuario(id, id_usuarios) {
  const sql = `

    SELECT id, id_usuarios, empresa, direccion, nombre, telefono, extension, celular, correo, tipo_contacto, created_at, updated_at
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

    RETURNING id, id_usuarios, empresa, direccion, nombre, telefono, extension, celular, correo, tipo_contacto, created_at, updated_at;
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