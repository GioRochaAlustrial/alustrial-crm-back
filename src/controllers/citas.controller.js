import {
  createCita, getCitaAbiertaByProspecto, getCitaByIdForUsuario, updateCitaEstadoForUsuario, cancelCitaForUsuario,
  reprogramarCitaForUsuario, listCitasVisiblesForUsuario, assignCitaUsuarios, getCitaById,
  listAutorizacionesPendientesByDeptos, resolverAutorizacionCita
} from "../repositories/citas.repo.js";

import { isGerente, isJefeDepto } from "../utils/authz.js";

import { createNotificacion } from "../repositories/notificaciones.repo.js";
import { getGerenteIdByDepartamentoNombre, getDeptosByGerenteId } from "../repositories/departamentos.repo.js";

const ESTADOS_VALIDOS = new Set(["PROGRAMADA", "REALIZADA", "VENCIDA", "CANCELADA"]);
const TIPOS_VALIDOS = new Set(["HVAC", "ELECTRICA", "CIVIL", "ATM/CONTROL"]);

function getUserId(req) {
  return req.user?.id || req.usuario?.id || req.userId;
}

export async function crearCita(req, res) {
  try {
    const id_usuarios = getUserId(req);
    const { id } = req.params;
    const { fecha_hora, nota = "", tipo, categoria = "LEVANTAMIENTO" } = req.body;
    const dt = new Date(fecha_hora);
    const abierta = await getCitaAbiertaByProspecto(id, id_usuarios);
    const cat = String(categoria).toUpperCase();
    const CATEGORIAS_VALIDAS = new Set(["LEVANTAMIENTO", "VISITA_COMERCIAL"]);
    const created = await createCita({
      id_prospectos: Number(id),
      id_usuarios: Number(id_usuarios),
      fecha_hora: dt.toISOString(),
      nota,
      estado: "PROGRAMADA",
      tipo: cat === "LEVANTAMIENTO" ? String(tipo).toUpperCase() : null,
      categoria: cat,
      auth_estado: "PENDIENTE",
    });
    let gerenteId = null;

    if (!id_usuarios) return res.status(401).json({ error: "NO_AUTH" });

    if (!fecha_hora) return res.status(400).json({ error: "FECHA_REQUERIDA" });

    if (!tipo) return res.status(400).json({ error: "TIPO_REQUERIDO" });

    if (!tipo || !TIPOS_VALIDOS.has(String(tipo).toUpperCase())) {
      return res.status(400).json({ error: "TIPO_INVALIDO" });
    }

    if (Number.isNaN(dt.getTime())) {
      return res.status(400).json({ error: "FECHA_INVALIDA" });
    }

    if (dt.getTime() < Date.now()) {
      return res.status(400).json({ error: "FECHA_EN_EL_PASADO" });
    }

    if (abierta) {
      return res.status(409).json({
        error: "CITA_YA_PROGRAMADA",
        next_cita: abierta.fecha_hora,
        cita_id: abierta.id,
      });
    }

    if (!CATEGORIAS_VALIDAS.has(cat)) return res.status(400).json({ error: "CATEGORIA_INVALIDA" });

    if (cat === "LEVANTAMIENTO") {
      if (!tipo) return res.status(400).json({ error: "TIPO_REQUERIDO" });
      if (!TIPOS_VALIDOS.has(String(tipo).toUpperCase())) return res.status(400).json({ error: "TIPO_INVALIDO" });
    }

    if (cat === "VISITA_COMERCIAL") {
      gerenteId = await getGerenteIdByDepartamentoNombre("VENTAS"); // gerente operaciones
    } else {
      // levantamiento: gerente de proyectos (lo mapeamos por tipo)
      gerenteId = await getGerenteIdByDepartamentoNombre(String(tipo).toUpperCase());
    }

    if (gerenteId) {
      await createNotificacion({
        id_usuario: gerenteId,
        tipo: cat === "VISITA_COMERCIAL" ? "AUTORIZAR_VISITA_COMERCIAL" : "AUTORIZAR_LEVANTAMIENTO",
        payload: { cita_id: created.id, id_prospecto: created.id_prospectos },
      });
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

    // ✅ No permitir REALIZADA si aún es futura
    if (estado === "REALIZADA") {
      const dt = new Date(cita.fecha_hora);
      if (dt.getTime() > Date.now()) {
        return res.status(400).json({ error: "CITA_AUN_NO_OCURRE" });
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
  try {
    const user = req.user || req.usuario;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "NO_AUTH" });

    const rol = String(user?.rol || "").toUpperCase();
    if (rol !== "GERENTE" && rol !== "ADMIN" && rol !== "DIRECTOR") {
      return res.status(403).json({ error: "NO_AUTORIZADO" });
    }

    const categoria = req.query.categoria ? String(req.query.categoria).toUpperCase() : null;

    // ADMIN/DIRECTOR: pueden ver todas las pendientes (opcional)
    if (rol === "ADMIN" || rol === "DIRECTOR") {
      const rows = await listAutorizacionesPendientesByDeptos({ deptos: null, categoria });
      return res.json(rows);
    }

    // GERENTE: ve pendientes solo de sus deptos
    const deptos = await getDeptosByGerenteId(userId);

    // Regla por categoría:
    // - VISITA_COMERCIAL: debe ser depto VENTAS
    // - LEVANTAMIENTO: debe ser deptos HVAC/ELECTRICA/CIVIL/ATM/CONTROL (los que le asignaron)
    let deptosFiltro = deptos;

    if (categoria === "VISITA_COMERCIAL") {
      deptosFiltro = deptos.filter(d => String(d).toUpperCase() === "VENTAS");
    } else if (categoria === "LEVANTAMIENTO") {
      deptosFiltro = deptos.filter(d => String(d).toUpperCase() !== "VENTAS");
    }

    // Si no tiene deptos para esa categoria, no ve nada (o forbidden)
    if (!deptosFiltro.length) return res.json([]);

    const rows = await listAutorizacionesPendientesByDeptos({
      deptos: deptosFiltro,
      categoria,
    });

    return res.json(rows);
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

    // ADMIN/DIRECTOR: puede autorizar todo (si quieres)
    if (rol !== "ADMIN" && rol !== "DIRECTOR") {
      if (rol !== "GERENTE") return res.status(403).json({ error: "NO_AUTORIZADO" });

      // Validar que el gerente tenga control del depto de la cita (por tipo)
      const deptos = await getDeptosByGerenteId(userId);
      const tipo = String(cita.tipo || "").toUpperCase();
      const tieneDepto = deptos.some(d => String(d).toUpperCase() === tipo);

      // Regla por categoría: filtrar ventas vs levantamiento
      const categoria = String(cita.categoria || "LEVANTAMIENTO").toUpperCase();
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