import {
  createProspecto,
  deleteProspecto,
  deleteProspectoForUsuario,
  getProspectoById,
  getProspectoByIdForUsuario,
  listProspectosAll,
  listProspectosByUsuario,
  updateProspectoForUsuario,
} from "../repositories/prospectos.repo.js";

function isEmpty(v) {
  return v === null || v === undefined || String(v).trim() === "";
}

export async function listarProspectos(req, res, next) {
  try {
    const userId = Number(req.user.id);

    if (req.user.isAdmin && String(req.query.all ?? "false") === "true") {
      return res.json(await listProspectosAll());
    }

    return res.json(await listProspectosByUsuario(userId));
  } catch (err) {
    return next(err);
  }
}

export async function obtenerProspecto(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID_INVALIDO" });

    const userId = Number(req.user.id);

    const prospecto = req.user.isAdmin
      ? await getProspectoById(id)
      : await getProspectoByIdForUsuario(id, userId);

    if (!prospecto) return res.status(404).json({ error: "PROSPECTO_NO_ENCONTRADO" });

    return res.json(prospecto);
  } catch (err) {
    return next(err);
  }
}

export async function crearProspecto(req, res, next) {
  try {
    const userId = Number(req.user.id);

    const { empresa, direccion, nombre, telefono, extension, celular, correo, tipo_contacto} = req.body;

    if (!empresa || !direccion || !nombre || !telefono || !celular || !correo || !tipo_contacto) {
      return res.status(400).json({ error: "CAMPOS_REQUERIDOS" });
    }

    const nuevo = await createProspecto({
      id_usuarios: userId,
      empresa,
      direccion,
      nombre,
      telefono,
      extension: extension ?? null,
      celular,
      correo,
      tipo_contacto,
    });

    return res.status(201).json(nuevo);
  } catch (err) {
    return next(err);
  }
}

export async function actualizarProspecto(req, res) {
  try {
    const { id } = req.params;

    // AJUSTA según tu middleware:
    const id_usuarios = req.user?.id || req.usuario?.id || req.userId;
    if (!id_usuarios) return res.status(401).json({ error: "NO_AUTH" });

    // Permitimos body parcial (completar faltantes)
    const body = req.body || {};

    // Si no mandan nada, no hacemos nada
    const hasAny = Object.keys(body).some((k) => !isEmpty(body[k]));
    if (!hasAny) {
      return res.status(400).json({ error: "SIN_DATOS" });
    }

    // Solo aceptamos estos campos (evita que intenten colar otros)
    const allowedKeys = [
      "nombre",
      "empresa",
      "direccion",
      "telefono",
      "extension",
      "celular",
      "correo",
      "tipo_contacto",
      "tipo_proyecto",
    ];

    const payload = {};
    for (const k of allowedKeys) {
      if (k in body) payload[k] = body[k];
    }

    // Normaliza extensión (si viene null/undefined)
    if (payload.extension === null || payload.extension === undefined) {
      payload.extension = "";
    }

    const updated = await updateProspectoForUsuario(id, id_usuarios, payload);
    if (!updated) return res.status(404).json({ error: "NO_ENCONTRADO" });

    // Si tu repo regresa el mismo registro cuando no había nada actualizable,
    // el front lo puede interpretar como "no había campos faltantes"
    return res.json(updated);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: e.message });
  }
}

export async function eliminarProspecto(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "ID_INVALIDO" });

    const userId = Number(req.user.id);

    const deleted = req.user.isAdmin
      ? await deleteProspecto(id)
      : await deleteProspectoForUsuario(id, userId);

    if (!deleted) return res.status(404).json({ error: "PROSPECTO_NO_ENCONTRADO" });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}