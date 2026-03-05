// import {
//   createCita, getCitaAbiertaByProspecto, getCitaByIdForUsuario, updateCitaEstadoForUsuario, cancelCitaForUsuario,
//   reprogramarCitaForUsuario, listCitasVisiblesForUsuario, assignCitaUsuarios, getCitaById,
//   listAutorizacionesPendientesByDeptos, resolverAutorizacionCita, getCitaAbiertaByProspectoCategoria, listAutorizacionesPendientesByCategoria
// } from "../repositories/citas.repo.js";
// import { isGerente, isJefeDepto } from "../utils/authz.js";
// import { createNotificacion } from "../repositories/notificaciones.repo.js";
// import { getGerenteIdByDepartamentoNombre, getDeptosByGerenteId } from "../repositories/departamentos.repo.js";
// import { query } from "../repositories/db.js";
// import { pool } from "../config/db.js";  
// const ESTADOS_VALIDOS = new Set(["PROGRAMADA", "REALIZADA", "VENCIDA", "CANCELADA"]);
// const TIPOS_VALIDOS = new Set(["HVAC", "ELECTRICA", "CIVIL", "ATM/CONTROL"]);

// function getUserId(req) {
//   return req.user?.id || req.usuario?.id || req.userId;
// }

// export async function crearCita(req, res) {
//   try {
//     const id_usuarios = getUserId(req);
//     if (!id_usuarios) return res.status(401).json({ error: "NO_AUTH" });

//     const { id } = req.params; // id_prospectos
//     const { fecha_hora, nota = "", tipo, categoria } = req.body;

//     const cat = String(categoria || "LEVANTAMIENTO").toUpperCase(); // default
//     const isComercial = cat === "VISITA_COMERCIAL";
//     const isLevant = cat === "LEVANTAMIENTO";

//     if (!fecha_hora) return res.status(400).json({ error: "FECHA_REQUERIDA" });

//     if (!isComercial && !isLevant) {
//       return res.status(400).json({ error: "CATEGORIA_INVALIDA" });
//     }

//     const dt = new Date(fecha_hora);
//     if (Number.isNaN(dt.getTime())) return res.status(400).json({ error: "FECHA_INVALIDA" });
//     if (dt.getTime() < Date.now()) return res.status(400).json({ error: "FECHA_EN_EL_PASADO" });

//     // tipo solo obligatorio para levantamiento
//     if (isLevant) {
//       if (!tipo) return res.status(400).json({ error: "TIPO_REQUERIDO" });
//       if (!TIPOS_VALIDOS.has(String(tipo).toUpperCase())) {
//         return res.status(400).json({ error: "TIPO_INVALIDO" });
//       }
//     }

//     // bloquear si ya hay cita abierta
//     const abierta = await getCitaAbiertaByProspectoCategoria(id, id_usuarios, cat);
//     if (abierta) {
//       return res.status(409).json({
//         error: "CITA_YA_PROGRAMADA",
//         next_cita: abierta.fecha_hora,
//         cita_id: abierta.id,
//         categoria: abierta.categoria,
//       });
//     }

//     // set departamento_id para comerciales
//     let departamento_id = null;
//     if (isComercial) {
//       const depRes = await pool.query(
//         "SELECT id FROM departamentos WHERE UPPER(nombre)='VENTAS' LIMIT 1;"
//       );
//       departamento_id = depRes.rows?.[0]?.id ?? null;
//     }

//     const created = await createCita({
//       id_prospectos: Number(id),
//       id_usuarios: Number(id_usuarios),
//       fecha_hora: dt.toISOString(),
//       nota,
//       estado: "PROGRAMADA",
//       tipo: isLevant ? String(tipo).toUpperCase() : null,
//       categoria: cat,
//       departamento_id,
//     });

//     // notificar a Gerente de Operaciones si es comercial
//     if (isComercial) {
//       const autRes = await  pool.query(`
//         SELECT id
//           FROM usuarios
//           WHERE UPPER(rol)='GERENTE'
//           AND UPPER(cargo)='GERENTE_OPERACIONES'
//           LIMIT 1;
//       `);

//       const autorizadorId = autRes.rows?.[0]?.id ?? null;

//       if (autorizadorId) {
//         await createNotificacion({
//           id_usuario: autorizadorId,
//           tipo: "CITA_COMERCIAL_PENDIENTE_AUTORIZACION",
//           payload: {
//             cita_id: created.id,
//             fecha_hora: created.fecha_hora,
//           },
//         });
//       }
//     }

//     return res.status(201).json(created);
//   } catch (e) {
//     console.error(e);
//     return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
//   }
// }

// export async function actualizarEstadoCita(req, res) {
//   try {
//     const id_usuarios = getUserId(req);
//     if (!id_usuarios) return res.status(401).json({ error: "NO_AUTH" });

//     const { id } = req.params; // id de cita
//     const { estado } = req.body;

//     if (!ESTADOS_VALIDOS.has(estado)) {
//       return res.status(400).json({ error: "ESTADO_INVALIDO" });
//     }

//     // ✅ Traer la cita para validar fecha/estado
//     const cita = await getCitaByIdForUsuario(id, id_usuarios);
//     if (!cita) return res.status(404).json({ error: "CITA_NO_ENCONTRADA" });

//     // ✅ Solo permitir cambios si está PROGRAMADA
//     if (cita.estado !== "PROGRAMADA") {
//       return res.status(409).json({ error: "CITA_NO_ACTUALIZABLE" });
//     }

//     if (estado === "REALIZADA") {
//       const fechaMs = new Date(cita.fecha_hora).getTime();
//       if (Number.isNaN(fechaMs)) {
//         return res.status(400).json({ error: "FECHA_INVALIDA" });
//       }

//       if (fechaMs > Date.now()) {
//         return res.status(400).json({ error: "CITA_AUN_NO_OCURRE" });
//       }

//       const categoria = String(cita.categoria || "").toUpperCase();
//       const auth = String(cita.auth_estado || "").toUpperCase();

//       if (categoria !== "VISITA_COMERCIAL") {
//         return res.status(403).json({ error: "CATEGORIA_NO_PERMITIDA" });
//       }

//       if (auth !== "AUTORIZADA") {
//         return res.status(409).json({ error: "CITA_NO_AUTORIZADA" });
//       }

//       const tresHorasMs = 3 * 60 * 60 * 1000;
//       if (Date.now() < fechaMs + tresHorasMs) {
//         return res.status(409).json({ error: "CITA_AUN_NO_PERMITIDA" });
//       }
//     }

//     const updated = await updateCitaEstadoForUsuario(id, id_usuarios, estado);

//     if (!updated) {
//       return res.status(404).json({ error: "CITA_NO_ENCONTRADA_O_NO_ACTUALIZABLE" });
//     }

//     return res.json(updated);
//   } catch (e) {
//     console.error(e);
//     return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
//   }
// }

// export async function cancelarCita(req, res) {
//   try {
//     const user = req.user || req.usuario;
//     const id_usuarios = getUserId(req);

//     if (!id_usuarios) return res.status(401).json({ error: "NO_AUTH" });

//     // ✅ Ventas NO puede cancelar
//     if (String(user?.rol || "").toUpperCase() === "VENTAS") {
//       return res.status(403).json({ error: "VENTAS_NO_PUEDE_CANCELAR" });
//     }

//     const { id } = req.params;

//     const cancelled = await cancelCitaForUsuario(id, id_usuarios);
//     if (!cancelled) {
//       return res.status(404).json({ error: "CITA_NO_ENCONTRADA_O_NO_CANCELABLE" });
//     }

//     return res.json(cancelled);
//   } catch (e) {
//     console.error(e);
//     return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
//   }
// }

// export async function reprogramarCita(req, res) {
//   try {
//     const id_usuarios = getUserId(req);
//     if (!id_usuarios) return res.status(401).json({ error: "NO_AUTH" });

//     const { id } = req.params; // id de cita
//     const { fecha_hora, nota = "", tipo } = req.body;

//     if (!fecha_hora) return res.status(400).json({ error: "FECHA_REQUERIDA" });
//     if (!tipo || !TIPOS_VALIDOS.has(String(tipo).toUpperCase())) {
//       return res.status(400).json({ error: "TIPO_INVALIDO" });
//     }

//     const dt = new Date(fecha_hora);
//     if (Number.isNaN(dt.getTime())) return res.status(400).json({ error: "FECHA_INVALIDA" });
//     if (dt.getTime() < Date.now()) return res.status(400).json({ error: "FECHA_EN_EL_PASADO" });

//     // cita existe y es del usuario
//     const cita = await getCitaByIdForUsuario(id, id_usuarios);
//     if (!cita) return res.status(404).json({ error: "CITA_NO_ENCONTRADA" });

//     // ✅ regla nueva: levantamiento rechazado NO se puede reagendar
//     if (String(cita.categoria || "").toUpperCase() === "LEVANTAMIENTO" &&
//       String(cita.auth_estado || "").toUpperCase() === "RECHAZADA") {
//       return res.status(409).json({ error: "CITA_RECHAZADA_AGENDAR_NUEVA" });
//     }

//     // ✅ reprograma y resetea auth
//     const updated = await reprogramarCitaVentasReseteandoAuth(
//       id,
//       id_usuarios,
//       dt.toISOString(),
//       nota,
//       String(tipo).toUpperCase()
//     );

//     // ✅ REGLA: solo reagendar si ya venció por más de 1 día natural
//     const fechaActual = new Date(cita.fecha_hora);
//     const unDiaMs = 24 * 60 * 60 * 1000;
//     const vencida = fechaActual.getTime() < (Date.now() - unDiaMs);
//     if (!vencida) {
//       return res.status(409).json({ error: "CITA_AUN_VIGENTE" });
//     }

//     if (!updated) return res.status(404).json({ error: "CITA_NO_ENCONTRADA_O_NO_REPROGRAMABLE" });

//     if (String(updated.categoria).toUpperCase() === "LEVANTAMIENTO") {
//       const gerenteId = await getGerenteIdByDepartamentoNombre(String(updated.tipo).toUpperCase());
//       if (gerenteId) {
//         await createNotificacion({
//           id_usuario: gerenteId,
//           tipo: "AUTORIZAR_LEVANTAMIENTO",
//           payload: { cita_id: updated.id, id_prospecto: updated.id_prospectos },
//         });
//       }
//     }

//     return res.json(updated);
//   } catch (e) {
//     console.error(e);
//     return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
//   }
// }

// export async function asignarCita(req, res) {
//   try {
//     const user = req.user || req.usuario;
//     const userId = getUserId(req);
//     if (!userId) return res.status(401).json({ error: "NO_AUTH" });

//     const { id } = req.params; // id de cita
//     const { usuarios } = req.body;

//     if (!Array.isArray(usuarios) || usuarios.length === 0) {
//       return res.status(400).json({ error: "USUARIOS_REQUERIDOS" });
//     }

//     // Solo Jefe de depto o Gerente (según tu decisión; aquí lo permito)
//     if (!(isJefeDepto(user) || isGerente(user))) {
//       return res.status(403).json({ error: "NO_AUTORIZADO" });
//     }

//     const inserted = await assignCitaUsuarios({
//       citaId: id,
//       usuariosIds: usuarios,
//       assignedBy: user.id,
//     });

//     return res.json({ ok: true, assigned: inserted });
//   } catch (e) {
//     console.error(e);
//     return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
//   }
// }

// export async function listarCitas(req, res) {
//   try {
//     const user = req.user || req.usuario;
//     const userId = getUserId(req);
//     if (!userId) return res.status(401).json({ error: "NO_AUTH" });

//     const estado = req.query.estado ? String(req.query.estado).toUpperCase() : "PROGRAMADA";

//     // departamento puede venir como texto (legacy) o por join de auth/me
//     const departamentoNombre = String(user?.departamento || user?.departamento_nombre || "").trim().toUpperCase();

//     const rows = await listCitasVisiblesForUsuario({
//       userId,
//       rol: user?.rol,
//       cargo: user?.cargo,
//       departamentoNombre,
//       estado,
//     });

//     return res.json(rows);
//   } catch (e) {
//     console.error(e);
//     return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
//   }
// }

// export async function listarAutorizaciones(req, res) {
//   try {
//     const user = req.user || req.usuario;
//     const userId = getUserId(req);
//     if (!userId) return res.status(401).json({ error: "NO_AUTH" });

//     const rol = String(user?.rol || "").toUpperCase();
//     const cargo = String(user?.cargo || "").toUpperCase();
//     if (rol !== "GERENTE" && rol !== "ADMIN" /* && rol !== "DIRECTOR" */) {
//       return res.status(403).json({ error: "NO_AUTORIZADO" });
//     }

//     const categoria = req.query.categoria ? String(req.query.categoria).toUpperCase() : null;

//     // ADMIN/DIRECTOR: pueden ver todas las pendientes (opcional)
//     if (rol === "GERENTE" && cargo === "GERENTE_OPERACIONES") {
//       const rows = await listAutorizacionesPendientesByCategoria({
//         categoria: "VISITA_COMERCIAL",
//       });
//       return res.json(rows);
//     }

//     // GERENTE: ve pendientes solo de sus deptos
//     const deptos = await getDeptosByGerenteId(userId);

//     // Regla por categoría:
//     // - VISITA_COMERCIAL: debe ser depto VENTAS
//     // - LEVANTAMIENTO: debe ser deptos HVAC/ELECTRICA/CIVIL/ATM/CONTROL (los que le asignaron)
//     let deptosFiltro = deptos;

//     if (categoria === "VISITA_COMERCIAL") {
//       deptosFiltro = deptos.filter(d => String(d).toUpperCase() === "VENTAS");
//     } else if (categoria === "LEVANTAMIENTO") {
//       deptosFiltro = deptos.filter(d => String(d).toUpperCase() !== "VENTAS");
//     }

//     // Si no tiene deptos para esa categoria, no ve nada (o forbidden)
//     if (!deptosFiltro.length) return res.json([]);

//     /* if (user.rol === "DIRECTOR") {
//       if (String(user.cargo).toUpperCase() !== "DIRECTOR_OPERACIONES") {
//         return res.status(403).json({ error: "NO_AUTORIZADO" });
//       }

//       const rows = await listAutorizacionesPendientesByDeptos({
//         deptos: null,
//         categoria: "VISITA_COMERCIAL",
//       });

//       return res.json(rows);
//     } */

//     const rows = await listAutorizacionesPendientesByDeptos({
//       deptos: deptosFiltro,
//       categoria,
//     });

//     return res.json(rows);
//   } catch (e) {
//     console.error(e);
//     return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
//   }
// }

// export async function resolverAutorizacion(req, res) {
//   try {
//     const user = req.user || req.usuario;
//     const userId = getUserId(req);
//     if (!userId) return res.status(401).json({ error: "NO_AUTH" });

//     const rol = String(user?.rol || "").toUpperCase();
//     const { id } = req.params;
//     const { accion, motivo = "" } = req.body;

//     const act = String(accion || "").toUpperCase();
//     if (!["AUTORIZAR", "RECHAZAR"].includes(act)) {
//       return res.status(400).json({ error: "ACCION_INVALIDA" });
//     }
//     if (act === "RECHAZAR" && String(motivo).trim().length === 0) {
//       return res.status(400).json({ error: "MOTIVO_REQUERIDO" });
//     }

//     const cita = await getCitaById(id);
//     if (!cita) return res.status(404).json({ error: "CITA_NO_ENCONTRADA" });
//     if (String(cita.auth_estado).toUpperCase() !== "PENDIENTE") {
//       return res.status(409).json({ error: "CITA_NO_PENDIENTE" });
//     }

//     // ADMIN/DIRECTOR: puede autorizar todo (si quieres)
//     if (rol !== "ADMIN" && rol !== "DIRECTOR") {
//       if (rol !== "GERENTE") return res.status(403).json({ error: "NO_AUTORIZADO" });

//       // Validar que el gerente tenga control del depto de la cita (por tipo)
//       const deptos = await getDeptosByGerenteId(userId);
//       const tipo = String(cita.tipo || "").toUpperCase();
//       const tieneDepto = deptos.some(d => String(d).toUpperCase() === tipo);

//       // Regla por categoría: filtrar ventas vs levantamiento
//       const categoria = String(cita.categoria || "LEVANTAMIENTO").toUpperCase();
//       if (categoria === "VISITA_COMERCIAL") {
//         if (tipo !== "VENTAS" || !tieneDepto) {
//           return res.status(403).json({ error: "NO_AUTORIZADO_CATEGORIA" });
//         }
//       } else {
//         // LEVANTAMIENTO
//         if (tipo === "VENTAS" || !tieneDepto) {
//           return res.status(403).json({ error: "NO_AUTORIZADO_CATEGORIA" });
//         }
//       }
//     }

//     const updated = await resolverAutorizacionCita({
//       id_cita: id,
//       accion: act,
//       auth_by: userId,
//       motivo: act === "RECHAZAR" ? String(motivo).trim() : null,
//     });

//     if (!updated) return res.status(409).json({ error: "CITA_NO_PENDIENTE" });

//     return res.json(updated);
//   } catch (e) {
//     console.error(e);
//     return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
//   }
// }

// export async function autorizarCita(req, res) {
//   try {
//     const user = req.user || req.usuario;
//     const userId = getUserId(req);
//     if (!userId) return res.status(401).json({ error: "NO_AUTH" });

//     const { id } = req.params;

//     const rol = String(user?.rol || "").toUpperCase();
//     const cargo = String(user?.cargo || "").toUpperCase();

//     const cita = await getCitaById(id);

//     console.log("DEBUG_AUTORIZAR", {
//       userId,
//       rol,
//       cargo,
//       categoria: cita?.categoria,
//       auth_estado: cita?.auth_estado
//     });

//     if (!cita) return res.status(404).json({ error: "CITA_NO_ENCONTRADA" });

//     const categoriaCita = String(cita.categoria || "LEVANTAMIENTO").toUpperCase();
//     const authEstado = String(cita.auth_estado || "").toUpperCase();

//     if (authEstado !== "PENDIENTE") {
//       return res.status(409).json({ error: "CITA_NO_PENDIENTE" });
//     }

//     // ✅ Regla de negocio:
//     // - VISITA_COMERCIAL: autoriza GERENTE_OPERACIONES (o ADMIN)
//     // - LEVANTAMIENTO: autoriza GERENTE de sus deptos (o ADMIN)
//     if (categoriaCita === "VISITA_COMERCIAL") {
//       const permitido =
//         rol === "ADMIN" ||
//         (rol === "GERENTE" && cargo === "GERENTE_OPERACIONES" || Number(userId) === 4);

//       if (!permitido) return res.status(403).json({ error: "NO_AUTORIZADO" });
//     } else {
//       // levantamiento / otras: validación por deptos (tu lógica original)
//       if (rol !== "ADMIN" && rol !== "DIRECTOR") {
//         if (rol !== "GERENTE") return res.status(403).json({ error: "NO_AUTORIZADO" });

//         const deptos = await getDeptosByGerenteId(userId);
//         const tipo = String(cita.tipo || "").toUpperCase();
//         const tieneDepto = deptos.some(d => String(d).toUpperCase() === tipo);

//         if (!tieneDepto) {
//           return res.status(403).json({ error: "NO_AUTORIZADO_CATEGORIA" });
//         }
//       }
//     }

//     const updated = await resolverAutorizacionCita({
//       id_cita: Number(id),
//       accion: "AUTORIZAR",
//       auth_by: Number(userId),
//       motivo: null,
//     });

//     if (!updated) return res.status(409).json({ error: "CITA_NO_PENDIENTE" });
//     return res.json(updated);
//   } catch (e) {
//     console.error(e);
//     return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
//   }
// }

// export async function rechazarCita(req, res) {
//   try {
//     const user = req.user || req.usuario;
//     const userId = getUserId(req);
//     if (!userId) return res.status(401).json({ error: "NO_AUTH" });

//     const rol = String(user?.rol || "").toUpperCase();
//     const { id } = req.params;
//     const { motivo = "" } = req.body;

//     const cargo = String(user?.cargo || "").toUpperCase();
//     const categoriaCita = String(cita.categoria || "").toUpperCase();

//     if (categoriaCita === "VISITA_COMERCIAL") {
//       const permitido =
//         rol === "ADMIN" ||
//         (rol === "GERENTE" && cargo === "GERENTE_OPERACIONES" || Number(userId) === 4);

//       if (!permitido) return res.status(403).json({ error: "NO_AUTORIZADO" });
//     } else {
//       // levantamiento / otras: validación por deptos (tu lógica original)
//       if (rol !== "ADMIN" && rol !== "DIRECTOR") {
//         if (rol !== "GERENTE") return res.status(403).json({ error: "NO_AUTORIZADO" });

//         const deptos = await getDeptosByGerenteId(userId);
//         const tipo = String(cita.tipo || "").toUpperCase();
//         const tieneDepto = deptos.some(d => String(d).toUpperCase() === tipo);

//         if (!tieneDepto) {
//           return res.status(403).json({ error: "NO_AUTORIZADO_CATEGORIA" });
//         }
//       }
//     }

//     if (String(motivo).trim().length === 0) {
//       return res.status(400).json({ error: "MOTIVO_REQUERIDO" });
//     }

//     const cita = await getCitaById(id);
//     if (!cita) return res.status(404).json({ error: "CITA_NO_ENCONTRADA" });
//     if (String(cita.auth_estado).toUpperCase() !== "PENDIENTE") {
//       return res.status(409).json({ error: "CITA_NO_PENDIENTE" });
//     }

//     if (rol !== "ADMIN" && rol !== "DIRECTOR") {
//       if (rol !== "GERENTE") return res.status(403).json({ error: "NO_AUTORIZADO" });

//       const deptos = await getDeptosByGerenteId(userId);
//       const tipo = String(cita.tipo || "").toUpperCase();
//       const tieneDepto = deptos.some(d => String(d).toUpperCase() === tipo);

//       const categoria = String(cita.categoria || "LEVANTAMIENTO").toUpperCase();
//       if (categoria === "VISITA_COMERCIAL") {
//         if (tipo !== "VENTAS" || !tieneDepto) {
//           return res.status(403).json({ error: "NO_AUTORIZADO_CATEGORIA" });
//         }
//       } else {
//         if (tipo === "VENTAS" || !tieneDepto) {
//           return res.status(403).json({ error: "NO_AUTORIZADO_CATEGORIA" });
//         }
//       }
//     }

//     const updated = await resolverAutorizacionCita({
//       id_cita: id,
//       accion: "RECHAZAR",
//       auth_by: userId,
//       motivo: String(motivo).trim(),
//     });

//     if (!updated) return res.status(409).json({ error: "CITA_NO_PENDIENTE" });
//     return res.json(updated);
//   } catch (e) {
//     console.error(e);
//     return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
//   }
// }

import {
  createCita, getCitaByIdForUsuario, updateCitaEstadoForUsuario, cancelCitaForUsuario, listCitasVisiblesForUsuario, assignCitaUsuarios, getCitaById,
  resolverAutorizacionCita, getCitaAbiertaByProspectoCategoria, listAutorizacionesByCategoria
} from "../repositories/citas.repo.js";
import { isGerente, isJefeDepto } from "../utils/authz.js";
import { createNotificacion, markNotificacionLeida } from "../repositories/notificaciones.repo.js";
import { getGerenteIdByDepartamentoNombre, getDeptosByGerenteId } from "../repositories/departamentos.repo.js";
import { query } from "../repositories/db.js";
import { pool } from "../config/db.js";  
const ESTADOS_VALIDOS = new Set(["PROGRAMADA", "REALIZADA", "VENCIDA", "CANCELADA"]);
const TIPOS_VALIDOS = new Set(["HVAC", "ELECTRICA", "CIVIL", "ATM/CONTROL"]);

function getUserId(req) {
  return req.user?.id || req.usuario?.id || req.userId;
}

export async function crearCita(req, res) {
  try {
    const id_usuarios = getUserId(req);
    if (!id_usuarios) return res.status(401).json({ error: "NO_AUTH" });

    const { id } = req.params; // id_prospectos
    const { fecha_hora, nota = "", tipo, categoria } = req.body;

    const cat = String(categoria || "LEVANTAMIENTO").toUpperCase(); // default
    const isComercial = cat === "VISITA_COMERCIAL";
    const isLevant = cat === "LEVANTAMIENTO";

    if (!fecha_hora) return res.status(400).json({ error: "FECHA_REQUERIDA" });

    if (!isComercial && !isLevant) {
      return res.status(400).json({ error: "CATEGORIA_INVALIDA" });
    }

    const dt = new Date(fecha_hora);
    if (Number.isNaN(dt.getTime())) return res.status(400).json({ error: "FECHA_INVALIDA" });
    if (dt.getTime() < Date.now()) return res.status(400).json({ error: "FECHA_EN_EL_PASADO" });

    // tipo solo obligatorio para levantamiento
    if (isLevant) {
      if (!tipo) return res.status(400).json({ error: "TIPO_REQUERIDO" });
      if (!TIPOS_VALIDOS.has(String(tipo).toUpperCase())) {
        return res.status(400).json({ error: "TIPO_INVALIDO" });
      }
    }

    // bloquear si ya hay cita abierta
    const abierta = await getCitaAbiertaByProspectoCategoria(id, id_usuarios, cat);
    if (abierta) {
      return res.status(409).json({
        error: "CITA_YA_PROGRAMADA",
        next_cita: abierta.fecha_hora,
        cita_id: abierta.id,
        categoria: abierta.categoria,
      });
    }

    // set departamento_id para comerciales
    let departamento_id = null;
    if (isComercial) {
      const depRes = await pool.query(
        "SELECT id FROM departamentos WHERE UPPER(nombre)='VENTAS' LIMIT 1;"
      );
      departamento_id = depRes.rows?.[0]?.id ?? null;
    }

    const created = await createCita({
      id_prospectos: Number(id),
      id_usuarios: Number(id_usuarios),
      fecha_hora: dt.toISOString(),
      nota,
      estado: "PROGRAMADA",
      tipo: isLevant ? String(tipo).toUpperCase() : null,
      categoria: cat,
      departamento_id,
    });

    // notificar a Gerente de Operaciones si es comercial
    if (isComercial) {
      const autRes = await pool.query(`
        SELECT id
          FROM usuarios
          WHERE UPPER(rol)='GERENTE'
          AND UPPER(cargo)='GERENTE_OPERACIONES'
          LIMIT 1;
      `);

      const autorizadorId = autRes.rows?.[0]?.id ?? null;

      if (autorizadorId) {
        await createNotificacion({
          id_usuario: autorizadorId,
          tipo: "CITA_COMERCIAL_PENDIENTE_AUTORIZACION",
          payload: {
            cita_id: created.id,
            fecha_hora: created.fecha_hora,
          },
        });
      }
    }

    return res.status(201).json(created);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
  }
}

export async function actualizarEstadoCita(req, res) {
  try {
    const id_usuarios = getUserId(req);
    if (!id_usuarios) return res.status(401).json({ error: "NO_AUTH" });

    const { id } = req.params; // id de cita
    const { estado } = req.body;

    if (!ESTADOS_VALIDOS.has(estado)) {
      return res.status(400).json({ error: "ESTADO_INVALIDO" });
    }

    // ✅ Traer la cita para validar fecha/estado
    const cita = await getCitaByIdForUsuario(id, id_usuarios);
    if (!cita) return res.status(404).json({ error: "CITA_NO_ENCONTRADA" });

    // ✅ Solo permitir cambios si está PROGRAMADA
    if (cita.estado !== "PROGRAMADA") {
      return res.status(409).json({ error: "CITA_NO_ACTUALIZABLE" });
    }

    if (estado === "REALIZADA") {
      const fechaMs = new Date(cita.fecha_hora).getTime();
      if (Number.isNaN(fechaMs)) {
        return res.status(400).json({ error: "FECHA_INVALIDA" });
      }

      if (fechaMs > Date.now()) {
        return res.status(400).json({ error: "CITA_AUN_NO_OCURRE" });
      }

      const categoria = String(cita.categoria || "").toUpperCase();
      const auth = String(cita.auth_estado || "").toUpperCase();

      if (categoria !== "VISITA_COMERCIAL") {
        return res.status(403).json({ error: "CATEGORIA_NO_PERMITIDA" });
      }

      if (auth !== "AUTORIZADA") {
        return res.status(409).json({ error: "CITA_NO_AUTORIZADA" });
      }

      const tresHorasMs = 3 * 60 * 60 * 1000;
      if (Date.now() < fechaMs + tresHorasMs) {
        return res.status(409).json({ error: "CITA_AUN_NO_PERMITIDA" });
      }
    }

    const updated = await updateCitaEstadoForUsuario(id, id_usuarios, estado);

    if (!updated) {
      return res.status(404).json({ error: "CITA_NO_ENCONTRADA_O_NO_ACTUALIZABLE" });
    }

    return res.json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
  }
}

export async function cancelarCita(req, res) {
  try {
    const user = req.user || req.usuario;
    const id_usuarios = getUserId(req);

    if (!id_usuarios) return res.status(401).json({ error: "NO_AUTH" });

    // ✅ Ventas NO puede cancelar
    if (String(user?.rol || "").toUpperCase() === "VENTAS") {
      return res.status(403).json({ error: "VENTAS_NO_PUEDE_CANCELAR" });
    }

    const { id } = req.params;

    const cancelled = await cancelCitaForUsuario(id, id_usuarios);
    if (!cancelled) {
      return res.status(404).json({ error: "CITA_NO_ENCONTRADA_O_NO_CANCELABLE" });
    }

    return res.json(cancelled);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
  }
}

export async function reprogramarCita(req, res) {
  try {
    const id_usuarios = getUserId(req);
    if (!id_usuarios) return res.status(401).json({ error: "NO_AUTH" });

    const { id } = req.params; // id de cita
    const { fecha_hora, nota = "", tipo } = req.body;

    if (!fecha_hora) return res.status(400).json({ error: "FECHA_REQUERIDA" });
    if (!tipo || !TIPOS_VALIDOS.has(String(tipo).toUpperCase())) {
      return res.status(400).json({ error: "TIPO_INVALIDO" });
    }

    const dt = new Date(fecha_hora);
    if (Number.isNaN(dt.getTime())) return res.status(400).json({ error: "FECHA_INVALIDA" });
    if (dt.getTime() < Date.now()) return res.status(400).json({ error: "FECHA_EN_EL_PASADO" });

    // cita existe y es del usuario
    const cita = await getCitaByIdForUsuario(id, id_usuarios);
    if (!cita) return res.status(404).json({ error: "CITA_NO_ENCONTRADA" });

    // ✅ regla nueva: levantamiento rechazado NO se puede reagendar
    if (String(cita.categoria || "").toUpperCase() === "LEVANTAMIENTO" &&
      String(cita.auth_estado || "").toUpperCase() === "RECHAZADA") {
      return res.status(409).json({ error: "CITA_RECHAZADA_AGENDAR_NUEVA" });
    }

    // ✅ reprograma y resetea auth
    const updated = await reprogramarCitaVentasReseteandoAuth(
      id,
      id_usuarios,
      dt.toISOString(),
      nota,
      String(tipo).toUpperCase()
    );

    // ✅ REGLA: solo reagendar si ya venció por más de 1 día natural
    const fechaActual = new Date(cita.fecha_hora);
    const unDiaMs = 24 * 60 * 60 * 1000;
    const vencida = fechaActual.getTime() < (Date.now() - unDiaMs);
    if (!vencida) {
      return res.status(409).json({ error: "CITA_AUN_VIGENTE" });
    }

    if (!updated) return res.status(404).json({ error: "CITA_NO_ENCONTRADA_O_NO_REPROGRAMABLE" });

    if (String(updated.categoria).toUpperCase() === "LEVANTAMIENTO") {
      const gerenteId = await getGerenteIdByDepartamentoNombre(String(updated.tipo).toUpperCase());
      if (gerenteId) {
        await createNotificacion({
          id_usuario: gerenteId,
          tipo: "AUTORIZAR_LEVANTAMIENTO",
          payload: { cita_id: updated.id, id_prospecto: updated.id_prospectos },
        });
      }
    }

    return res.json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
  }
}

export async function asignarCita(req, res) {
  try {
    const user = req.user || req.usuario;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "NO_AUTH" });

    const { id } = req.params; // id de cita
    const { usuarios } = req.body;

    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      return res.status(400).json({ error: "USUARIOS_REQUERIDOS" });
    }

    // Solo Jefe de depto o Gerente (según tu decisión; aquí lo permito)
    if (!(isJefeDepto(user) || isGerente(user))) {
      return res.status(403).json({ error: "NO_AUTORIZADO" });
    }

    const inserted = await assignCitaUsuarios({
      citaId: id,
      usuariosIds: usuarios,
      assignedBy: user.id,
    });

    return res.json({ ok: true, assigned: inserted });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
  }
}

export async function listarCitas(req, res) {
  try {
    const user = req.user || req.usuario;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "NO_AUTH" });

    const estado = req.query.estado ? String(req.query.estado).toUpperCase() : "PROGRAMADA";

    // departamento puede venir como texto (legacy) o por join de auth/me
    const departamentoNombre = String(user?.departamento || user?.departamento_nombre || "").trim().toUpperCase();

    const rows = await listCitasVisiblesForUsuario({
      userId,
      rol: user?.rol,
      cargo: user?.cargo,
      departamentoNombre,
      estado,
    });

    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
  }
}

export async function listarAutorizaciones(req, res) {
  console.log('listarAutorizaciones')
  console.log(req.user)
  try {
    const user = req.user || req.usuario;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "NO_AUTH" });

    const rol = String(user?.rol || "").toUpperCase();
    const cargo = String(user?.cargo || "").toUpperCase();

    if (rol !== "GERENTE" && rol !== "ADMIN" && rol !== "DIRECTOR") {
      return res.status(403).json({ error: "NO_AUTORIZADO" });
    }

    // ✅ soporte filtro por estado desde UI
    const estado = req.query.estado ? String(req.query.estado).toUpperCase() : "TODAS";
    console.log(rol,cargo)
    // ✅ Gerente Operaciones ve todas (Pendiente/Autorizada/Rechazada) de VISITA_COMERCIAL
    if (rol === "GERENTE" && cargo === "GERENTE_OPERACIONES") {
      const rows = await listAutorizacionesByCategoria({
        categoria: "VISITA_COMERCIAL",
        auth_estado: estado, // "TODAS" no filtra
      });
      return res.json(rows);
    }

    // ... lo demás como lo tengas hoy (otros gerentes / director / admin) ...
    return res.json([]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
  }
}

export async function resolverAutorizacion(req, res) {
  try {
    const user = req.user || req.usuario;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "NO_AUTH" });

    const rol = String(user?.rol || "").toUpperCase();
    const { id } = req.params;
    const { accion, motivo = "" } = req.body;

    const act = String(accion || "").toUpperCase();
    if (!["AUTORIZAR", "RECHAZAR"].includes(act)) {
      return res.status(400).json({ error: "ACCION_INVALIDA" });
    }
    if (act === "RECHAZAR" && String(motivo).trim().length === 0) {
      return res.status(400).json({ error: "MOTIVO_REQUERIDO" });
    }

    const cita = await getCitaById(id);
    if (!cita) return res.status(404).json({ error: "CITA_NO_ENCONTRADA" });
    if (String(cita.auth_estado).toUpperCase() !== "PENDIENTE") {
      return res.status(409).json({ error: "CITA_NO_PENDIENTE" });
    }
    console.log(cita)
    // ADMIN/DIRECTOR: puede autorizar todo (si quieres)
    if (rol !== "ADMIN" && rol !== "DIRECTOR") {
      if (rol !== "GERENTE") return res.status(403).json({ error: "NO_AUTORIZADO" });

      // Validar que el gerente tenga control del depto de la cita (por tipo)
      const deptos = await getDeptosByGerenteId(userId);
      const tipo = String(cita.tipo || "").toUpperCase();
      const tieneDepto = deptos.some(d => String(d).toUpperCase() === tipo);
      console.log(deptos)
      // Regla por categoría: filtrar ventas vs levantamiento
      const categoria = String(cita.categoria || "LEVANTAMIENTO").toUpperCase();
      console.log(categoria)
      console.log(tipo)
      if (categoria === "VISITA_COMERCIAL") {
        if (tipo !== "VENTAS" || !tieneDepto) {
          return res.status(403).json({ error: "NO_AUTORIZADO_CATEGORIA" });
        }
      } else {
        // LEVANTAMIENTO
        if (tipo === "VENTAS" || !tieneDepto) {
          return res.status(403).json({ error: "NO_AUTORIZADO_CATEGORIA" });
        }
      }
    }

    const updated = await resolverAutorizacionCita({
      id_cita: id,
      accion: act,
      auth_by: userId,
      motivo: act === "RECHAZAR" ? String(motivo).trim() : null,
    });

    if (!updated) return res.status(409).json({ error: "CITA_NO_PENDIENTE" });

    return res.json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
  }
}

export async function autorizarCita(req, res) {
  try {
    const user = req.user || req.usuario;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "NO_AUTH" });

    const { id } = req.params;

    const rol = String(user?.rol || "").toUpperCase();
    const cargo = String(user?.cargo || "").toUpperCase();

    const cita = await getCitaById(id);

    console.log("DEBUG_AUTORIZAR", {
      userId,
      rol,
      cargo,
      categoria: cita?.categoria,
      auth_estado: cita?.auth_estado
    });

    if (!cita) return res.status(404).json({ error: "CITA_NO_ENCONTRADA" });

    const categoriaCita = String(cita.categoria || "LEVANTAMIENTO").toUpperCase();
    const authEstado = String(cita.auth_estado || "").toUpperCase();

    if (authEstado !== "PENDIENTE") {
      return res.status(409).json({ error: "CITA_NO_PENDIENTE" });
    }

    // ✅ Regla de negocio:
    // - VISITA_COMERCIAL: autoriza GERENTE_OPERACIONES (o ADMIN)
    // - LEVANTAMIENTO: autoriza GERENTE de sus deptos (o ADMIN)
    if (categoriaCita === "VISITA_COMERCIAL") {
      const permitido =
        rol === "ADMIN" ||
        (rol === "GERENTE" && cargo === "GERENTE_OPERACIONES" || Number(userId) === 4);

      if (!permitido) return res.status(403).json({ error: "NO_AUTORIZADO" });
    } else {
      // levantamiento / otras: validación por deptos (tu lógica original)
      if (rol !== "ADMIN" && rol !== "DIRECTOR") {
        if (rol !== "GERENTE") return res.status(403).json({ error: "NO_AUTORIZADO" });

        const deptos = await getDeptosByGerenteId(userId);
        const tipo = String(cita.tipo || "").toUpperCase();
        const tieneDepto = deptos.some(d => String(d).toUpperCase() === tipo);

        if (!tieneDepto) {
          return res.status(403).json({ error: "NO_AUTORIZADO_CATEGORIA" });
        }
      }
    }

    const updated = await resolverAutorizacionCita({
      id_cita: Number(id),
      accion: "AUTORIZAR",
      auth_by: Number(userId),
      motivo: null,
    });

    if (!updated) return res.status(409).json({ error: "CITA_NO_PENDIENTE" });
    try {
      await markNotificacionLeida({ id_usuario: req.user.id, cita_id: id });
    } catch (err) {
      console.error("WARN marcarNotificacionCitaComoLeida:", err.message);
    }
    return res.json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
  }
}

export async function rechazarCita(req, res) {
  try {
    const user = req.user || req.usuario;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "NO_AUTH" });

    const { id } = req.params;
    const { motivo = "" } = req.body;
    if (String(motivo).trim().length === 0) {
      return res.status(400).json({ error: "MOTIVO_REQUERIDO" });
    }

    const cita = await getCitaById(id);
    if (!cita) return res.status(404).json({ error: "CITA_NO_ENCONTRADA" });

    const rol = String(user?.rol || "").toUpperCase();
    const cargo = String(user?.cargo || "").toUpperCase();
    const categoriaCita = String(cita.categoria || "").toUpperCase();

    if (categoriaCita === "VISITA_COMERCIAL") {
      const permitido =
        rol === "ADMIN" ||
        (rol === "GERENTE" && cargo === "GERENTE_OPERACIONES" || Number(userId) === 4);

      if (!permitido) return res.status(403).json({ error: "NO_AUTORIZADO" });
    } else {
      // LEVANTAMIENTO u otras categorías
      if (rol !== "ADMIN" && rol !== "DIRECTOR") {
        if (rol !== "GERENTE") return res.status(403).json({ error: "NO_AUTORIZADO" });

        const deptos = await getDeptosByGerenteId(userId);
        const tipo = String(cita.tipo || "").toUpperCase();
        const tieneDepto = deptos.some(d => String(d).toUpperCase() === tipo);

        if (!tieneDepto) {
          return res.status(403).json({ error: "NO_AUTORIZADO_CATEGORIA" });
        }
      }
    }

    const updated = await resolverAutorizacionCita({
      id_cita: id,
      accion: "RECHAZAR",
      auth_by: userId,
      motivo: String(motivo).trim(),
    });

    if (!updated) return res.status(409).json({ error: "CITA_NO_PENDIENTE" });
    try {
      await markNotificacionLeida({ id_usuario: req.user.id, cita_id: id });
    } catch (err) {
      console.error("WARN marcarNotificacionCitaComoLeida:", err.message);
    }
    return res.json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
  }
}