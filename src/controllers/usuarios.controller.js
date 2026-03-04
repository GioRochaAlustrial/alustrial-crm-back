import bcrypt from "bcrypt";

import {
  createUsuario,
  deleteUsuario,
  getUsuarioById,
  listUsuarios,
  updateUsuario,
} from "../repositories/usuarios.repo.js";

export async function listarUsuarios(req, res, next) {
  try {
    const rows = await listUsuarios();
    return res.json(rows);
  } catch (err) {
    return next(err);
  }
}

export async function obtenerUsuario(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID_INVALIDO" });
    }

    const usuario = await getUsuarioById(id);
    if (!usuario) return res.status(404).json({ error: "USUARIO_NO_ENCONTRADO" });

    return res.json(usuario);
  } catch (err) {
    return next(err);
  }
}

export async function crearUsuario(req, res, next) {
  try {
    const {
      nombre,
      correo,
      telefono,
      departamento,        // lo seguimos aceptando por compatibilidad
      departamento_id,     // ✅ nuevo
      contrasena,
      activo,
      rol = "VENTAS",      // ✅ nuevo
      cargo = null,        // ✅ nuevo
      supervisor_id = null,// ✅ nuevo
      es_jefe = false,     // ✅ nuevo
      foto_url = null,     // ✅ nuevo
    } = req.body;

    if (!nombre || !correo || !telefono || !contrasena) {
      return res.status(400).json({ error: "CAMPOS_REQUERIDOS" });
    }

    // Debe venir al menos uno: departamento (string) o departamento_id (int)
    if (!departamento && !departamento_id) {
      return res.status(400).json({ error: "DEPARTAMENTO_REQUERIDO" });
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    const nuevo = await createUsuario({
      nombre,
      correo,
      telefono: String(telefono),
      departamento: departamento ?? null,
      departamento_id: departamento_id ?? null,
      contrasena: hashedPassword,
      activo: activo ?? true,
      rol,
      cargo,
      supervisor_id,
      es_jefe: !!es_jefe,
      foto_url,
    });

    return res.status(201).json(nuevo);
  } catch (err) {
    if (err?.code === "23505") return res.status(409).json({ error: "CORREO_YA_EXISTE" });
    return next(err);
  }
}

export async function actualizarUsuario(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID_INVALIDO" });
    }

    const fields = req.body ?? {};
    // Normaliza teléfonos si vienen
    if (fields.telefono != null) fields.telefono = String(fields.telefono);

    const updated = await updateUsuario(id, fields);
    if (!updated) return res.status(404).json({ error: "USUARIO_NO_ENCONTRADO" });

    return res.json(updated);
  } catch (err) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "CORREO_YA_EXISTE" });
    }
    return next(err);
  }
}

export async function eliminarUsuario(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "ID_INVALIDO" });
    }

    const deleted = await deleteUsuario(id);
    if (!deleted) return res.status(404).json({ error: "USUARIO_NO_ENCONTRADO" });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}