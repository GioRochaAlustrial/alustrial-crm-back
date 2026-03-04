import { query } from "./db.js";
import { pool } from "../config/db.js";  
export async function existeCitaActiva(id_prospectos) {
  const sql = `
    SELECT *
    FROM citas
    WHERE id_prospectos = $1
      AND estado IN ('PROGRAMADA')
      AND fecha_hora >= NOW()
    LIMIT 1;
  `;

  const result = await pool.query(sql, [Number(id_prospectos)]);
  const rows = result?.rows ?? result;
  return rows?.[0] ?? null;
}

export async function createCita({
  id_prospectos,
  id_usuarios,
  fecha_hora,
  nota = "",
  tipo = null,
  estado = "PROGRAMADA",
  categoria = "LEVANTAMIENTO",
  departamento_id = null,
}) {
  const cat = String(categoria).toUpperCase();
  const auth_estado = cat === "VISITA_COMERCIAL" ? "PENDIENTE" : null;

  const sql = `
    INSERT INTO citas (
      id_prospectos, id_usuarios, fecha_hora, nota, tipo, estado,
      realizada_por,
      categoria, auth_estado, auth_by, auth_at, auth_motivo,
      departamento_id,
      created_at
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,
      NULL,
      $7,$8,NULL,NULL,NULL,
      $9,
      NOW()
    )
    RETURNING *;
  `;

  const values = [
    Number(id_prospectos),
    Number(id_usuarios),
    fecha_hora,
    nota,
    tipo,
    estado,
    cat,
    auth_estado,
    departamento_id === null ? null : Number(departamento_id),
  ];

  const result = await pool.query(sql, values);
  const rows = result?.rows ?? result;
  return rows?.[0] ?? null;
}

export async function marcarCitaRealizada(id, especialistaId) {
  const sql = `
    UPDATE citas
    SET 
      estado = 'REALIZADA',
      realizada_por = $1,
      updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `;

  const result = await pool.query(sql, [Number(especialistaId), Number(id)]);
  const rows = result?.rows ?? result;
  return rows?.[0] ?? null;
}

export async function getCitaAbiertaByProspecto(id_prospectos, id_usuarios) {
  const sql = `
    SELECT id, fecha_hora
    FROM citas
    WHERE id_prospectos = $1
      AND id_usuarios = $2
      AND estado = 'PROGRAMADA'
      AND fecha_hora >= (NOW() - INTERVAL '1 day')
    ORDER BY fecha_hora ASC
    LIMIT 1;
  `;

  const result = await pool.query(sql, [Number(id_prospectos), Number(id_usuarios)]);
  const rows = result?.rows ?? result;
  return rows?.[0] ?? null;
}

export async function updateCitaEstadoForUsuario(id_cita, id_usuarios, estado) {
  const sql = `
    UPDATE citas
    SET estado = $1, updated_at = NOW()
    WHERE id = $2
      AND id_usuarios = $3
      AND estado = 'PROGRAMADA'
    RETURNING *;
  `;
  const result = await pool.query(sql, [estado, Number(id_cita), Number(id_usuarios)]);
  const rows = result?.rows ?? result;
  return rows?.[0] ?? null;
}

export async function cancelCitaForUsuario(id_cita, id_usuarios) {
  const sql = `
    UPDATE citas
    SET estado = 'CANCELADA', updated_at = NOW()
    WHERE id = $1
      AND id_usuarios = $2
      AND estado = 'PROGRAMADA'
    RETURNING *;
  `;

  const result = await pool.query(sql, [Number(id_cita), Number(id_usuarios)]);
  const rows = result?.rows ?? result;
  return rows?.[0] ?? null;
}

export async function getCitaByIdForUsuario(id_cita, id_usuarios) {
  const sql = `
    SELECT *
    FROM citas
    WHERE id = $1 AND id_usuarios = $2
    LIMIT 1;
  `;
  const result = await pool.query(sql, [Number(id_cita), Number(id_usuarios)]);
  const rows = result?.rows ?? result;
  return rows?.[0] ?? null;
}

export async function reprogramarCitaForUsuario(id_cita, id_usuarios, fecha_hora, nota = "", tipo) {
  const sql = `
    UPDATE citas
    SET
      fecha_hora = $1,
      nota = $2,
      tipo = $3,
      updated_at = NOW()
    WHERE id = $4
      AND id_usuarios = $5
      AND estado = 'PROGRAMADA'
    RETURNING *;
  `;

  const result = await pool.query(sql, [
    fecha_hora,
    nota,
    tipo,
    Number(id_cita),
    Number(id_usuarios),
  ]);

  const rows = result?.rows ?? result;
  return rows?.[0] ?? null;
}

export async function listCitasForEspecialista({ tipo = null, estado = null }) {
  const filters = [];
  const values = [];
  let i = 1;

  if (tipo) {
    filters.push(`c.tipo = $${i++}`);
    values.push(tipo);
  }

  if (estado) {
    filters.push(`c.estado = $${i++}`);
    values.push(estado);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const sql = `
    SELECT c.id, c.id_prospectos, c.fecha_hora, c.nota, c.tipo, c.estado, c.realizada_por, p.empresa, p.nombre, p.telefono, p.celular, p.correo
    FROM citas c
    JOIN prospectos p ON p.id = c.id_prospectos
    ${where}
    ORDER BY c.fecha_hora ASC;
  `;

  const { rows } = await pool.query(sql, values);
  return rows;
}

export async function getCitasForUsuario(user) {
  const baseQuery = `
    SELECT c.*, p.nombre AS prospecto_nombre, p.empresa, d.nombre AS departamento_nombre
    FROM citas c
    JOIN prospectos p ON p.id = c.id_prospectos
    LEFT JOIN departamentos d ON d.nombre = c.tipo
  `;

  if (user.rol === "DIRECTOR") {
    const { rows } = await pool.query(baseQuery);
    return rows;
  }

  if (user.rol === "GERENTE") {
    const sql = `
      ${baseQuery}
      WHERE d.gerente_id = $1
    `;
    const { rows } = await pool.query(sql, [user.id]);
    return rows;
  }

  if (user.cargo === "JEFE_DEPARTAMENTO") {
    const sql = `
      ${baseQuery}
      WHERE c.tipo = $1
    `;
    const { rows } = await pool.query(sql, [user.departamento_nombre]);
    return rows;
  }

  // técnico
  const sql = `
    ${baseQuery}
    JOIN citas_asignaciones ca ON ca.id_cita = c.id
    WHERE ca.id_usuario = $1
  `;
  const { rows } = await pool.query(sql, [user.id]);
  return rows;
}

export async function listCitasVisiblesForUsuario({
  userId,
  rol,
  cargo,
  departamentoNombre,
  estado = "PROGRAMADA",
}) {
  const sql = `
    SELECT c.id, c.id_prospectos, c.id_usuarios, c.fecha_hora, c.nota, c.tipo, c.estado, c.realizada_por, p.empresa, p.nombre, p.correo, p.telefono, p.celular,
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object('id', u.id, 'nombre', u.nombre)
        ) FILTER (WHERE u.id IS NOT NULL),
        '[]'
      ) AS asignados
    FROM citas c
    JOIN prospectos p ON p.id = c.id_prospectos
    LEFT JOIN citas_asignaciones ca ON ca.id_cita = c.id
    LEFT JOIN usuarios u ON u.id = ca.id_usuario
    WHERE
      (
        -- Director / Admin: ve todo
        ($1::text IN ('DIRECTOR','ADMIN'))

        OR
        -- Gerente: ve citas cuyo tipo (departamento) está bajo su gerencia
        (
          $1::text = 'GERENTE'
          AND EXISTS (
            SELECT 1
            FROM departamentos dep
            WHERE dep.gerente_id = $2
              AND UPPER(dep.nombre) = UPPER(c.tipo)
          )
        )

        OR
        -- Jefe: ve todas las del departamento
        (
          $1::text = 'ESPECIALISTA'
          AND $3::text = 'JEFE_DEPARTAMENTO'
          AND UPPER(c.tipo) = UPPER($4)
        )

        OR
        -- Técnico: ve solo asignadas
        (
          $1::text = 'ESPECIALISTA'
          AND $3::text = 'TECNICO'
          AND EXISTS (
            SELECT 1
            FROM citas_asignaciones ca2
            WHERE ca2.id_cita = c.id
              AND ca2.id_usuario = $2
          )
        )
      )
      AND ($5::text IS NULL OR c.estado = $5)
    GROUP BY c.id, p.id
    ORDER BY c.fecha_hora ASC;
  `;

  const values = [
    String(rol || "").toUpperCase(),          // $1
    Number(userId),                           // $2
    String(cargo || "").toUpperCase(),        // $3
    String(departamentoNombre || "").trim(),  // $4
    estado ? String(estado).toUpperCase() : null, // $5
  ];

  const { rows } = await pool.query(sql, values);
  return rows;
}

export async function assignCitaUsuarios({ citaId, usuariosIds, assignedBy }) {
  const sql = `
    INSERT INTO citas_asignaciones (id_cita, id_usuario, assigned_by)
    SELECT $1, unnest($2::int[]), $3
    ON CONFLICT (id_cita, id_usuario) DO NOTHING
    RETURNING id_cita, id_usuario, assigned_by, assigned_at;
  `;
  const { rows } = await pool.query(sql, [Number(citaId), usuariosIds.map(Number), Number(assignedBy)]);
  return rows;
}

export async function reprogramarCitaVentasReseteandoAuth(id_cita, id_usuarios, fecha_hora, nota, tipo) {
  const sql = `
    UPDATE citas
    SET
      fecha_hora = $1,
      nota = $2,
      tipo = $3,
      auth_estado = 'PENDIENTE',
      auth_by = NULL,
      auth_at = NULL,
      auth_motivo = NULL,
      updated_at = NOW()
    WHERE id = $4
      AND id_usuarios = $5
      AND estado = 'PROGRAMADA'
    RETURNING *;
  `;
  const { rows } = await pool.query(sql, [fecha_hora, nota, tipo, Number(id_cita), Number(id_usuarios)]);
  return rows?.[0] ?? null;
}

export async function getCitaById(id_cita) {
  const sql = `SELECT * FROM citas WHERE id = $1 LIMIT 1;`;
  const { rows } = await pool.query(sql, [Number(id_cita)]);
  return rows?.[0] ?? null;
}

export async function listAutorizacionesPendientesByDeptos({ deptos, categoria }) {
  const values = [];
  let i = 1;
  const filters = [`c.auth_estado = 'PENDIENTE'`];

  if (categoria) {
    filters.push(`c.categoria = $${i++}`);
    values.push(String(categoria).toUpperCase());
  }

  // ✅ filtro por deptos via departamento_id
  // deptos = ['VENTAS','HVAC',...]
  const joinDepto = deptos?.length
    ? `JOIN departamentos d ON d.id = c.departamento_id`
    : `LEFT JOIN departamentos d ON d.id = c.departamento_id`;

  if (deptos?.length) {
    filters.push(`UPPER(d.nombre) = ANY($${i++}::text[])`);
    values.push(deptos.map((d) => String(d).toUpperCase()));
  }

  const where = `WHERE ${filters.join(" AND ")}`;

  const sql = `
    SELECT
      c.id, c.id_prospectos, c.fecha_hora, c.nota, c.tipo, c.estado,
      c.categoria, c.auth_estado, c.auth_by, c.auth_at, c.auth_motivo,
      c.departamento_id,
      d.nombre AS departamento,
      p.empresa, p.nombre, p.correo, p.telefono, p.celular
    FROM citas c
    JOIN prospectos p ON p.id = c.id_prospectos
    ${joinDepto}
    ${where}
    ORDER BY c.fecha_hora ASC;
  `;

  const { rows } = await pool.query(sql, values);
  return rows;
}

export async function resolverAutorizacionCita({ id_cita, accion, auth_by, motivo = null }) {
  const auth_estado = accion === "AUTORIZAR" ? "AUTORIZADA" : "RECHAZADA";

  const sql = `
    UPDATE citas
    SET
      auth_estado = $1,
      auth_by = $2,
      auth_at = NOW(),
      auth_motivo = $3,
      updated_at = NOW()
    WHERE id = $4
      AND auth_estado = 'PENDIENTE'
    RETURNING *;
  `;

  const { rows } = await pool.query(sql, [
    auth_estado,
    Number(auth_by),
    motivo,
    Number(id_cita),
  ]);

  return rows?.[0] ?? null;
}

export async function getCitaAbiertaByProspectoCategoria(id_prospectos, id_usuarios, categoria) {
  const sql = `
    SELECT id, fecha_hora, categoria
    FROM citas
    WHERE id_prospectos = $1
      AND id_usuarios = $2
      AND categoria = $3
      AND estado = 'PROGRAMADA'
      AND fecha_hora >= (NOW() - INTERVAL '1 day')
    ORDER BY fecha_hora ASC
    LIMIT 1;
  `;

  const result = await pool.query(sql, [Number(id_prospectos), Number(id_usuarios), String(categoria).toUpperCase()]);
  const rows = result?.rows ?? result;
  return rows?.[0] ?? null;
}

export async function listAutorizacionesPendientesByCategoria({ categoria }) {
  const sql = `
    SELECT
      c.id, c.id_prospectos, c.fecha_hora, c.nota, c.tipo, c.estado,
      c.categoria, c.auth_estado, c.auth_by, c.auth_at, c.auth_motivo,
      p.empresa, p.nombre, p.correo, p.telefono, p.celular
    FROM citas c
    JOIN prospectos p ON p.id = c.id_prospectos
    WHERE c.auth_estado = 'PENDIENTE'
      AND c.categoria = $1
    ORDER BY c.fecha_hora ASC;
  `;
  const { rows } = await pool.query(sql, [String(categoria).toUpperCase()]);
  return rows;
}