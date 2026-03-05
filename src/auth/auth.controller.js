// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import { getUsuarioByCorreo } from "../repositories/usuarios.repo.js";

// export async function login(req, res, next) {
//   try {
//     const { correo, contrasena } = req.body;

//     if (!correo || !contrasena) {
//       return res.status(400).json({ error: "CREDENCIALES_REQUERIDAS" });
//     }

//     const usuario = await getUsuarioByCorreo(correo);
//     if (!usuario) {
//       return res.status(401).json({ error: "CREDENCIALES_INVALIDAS" });
//     }

//     const match = await bcrypt.compare(contrasena, usuario.contrasena);
//     if (!match) {
//       return res.status(401).json({ error: "CREDENCIALES_INVALIDAS" });
//     }

//     const token = jwt.sign(
//       {
//         id: usuario.id,
//         nombre: usuario.nombre,
//         correo: usuario.correo,
//         departamento: usuario.departamento,
//         rol: usuario.rol,
//         foto_url: usuario.foto_url || null,
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
//     );

//     // ✅ cookie para que Next middleware la lea
//     // res.cookie("token", token, {
//     //   httpOnly: true,
//     //   secure: false,     // true en prod con https
//     //   sameSite: "lax",
//     //   path: "/",
//     //   maxAge: 60 * 60 * 1000,
//     // });
// res.cookie("token", token, {
//   httpOnly: true,
//   secure: process.env.NODE_ENV === "production",
//   sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
//   maxAge: 60 * 60 * 1000,
// });
// res.json({ ok: true, usuario });
//     //console.log("usuario.rol:", usuario.rol);

//     return res.json({
//       ok: true,
//       token,
//       usuario: {
//         id: usuario.id,
//         nombre: usuario.nombre,
//         correo: usuario.correo,
//         departamento: usuario.departamento,
//         rol: usuario.rol,
//         foto_url: usuario.foto_url || null,
//       },
//       // token, // <- opcional (si lo quieres en dev)
//     });
//   } catch (err) {
//     next(err);
//   }
// }

// export function me(req, res) {
//   try {
//     const token = req.cookies?.token;
//     if (!token) return res.status(401).json({ error: "NO_AUTH" });

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     //console.log("decoded:", decoded);

//     return res.json({
//       usuario: {
//         id: decoded.id,
//         nombre: decoded.nombre,
//         correo: decoded.correo,
//         departamento: decoded.departamento,
//         rol: decoded.rol,
//         foto_url: decoded.foto_url || null,
//       },
//     });
//   } catch {
//     return res.status(401).json({ error: "TOKEN_INVALIDO" });
//   }
// }

// export function logout(req, res) {
//   res.clearCookie("token", { path: "/" });
//   return res.json({ ok: true });
// }
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getUsuarioByCorreo } from "../repositories/usuarios.repo.js";

export async function login(req, res, next) {
  try {
    const { correo, contrasena } = req.body;

    if (!correo || !contrasena) {
      return res.status(400).json({ error: "CREDENCIALES_REQUERIDAS" });
    }

    const usuario = await getUsuarioByCorreo(correo);
    if (!usuario) {
      return res.status(401).json({ error: "CREDENCIALES_INVALIDAS" });
    }

    const match = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!match) {
      return res.status(401).json({ error: "CREDENCIALES_INVALIDAS" });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        departamento: usuario.departamento,
        rol: usuario.rol,
        cargo: usuario.cargo,
        foto_url: usuario.foto_url || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

   console.log("▶ LOGIN request body:", { correo: req.body.correo });

// después de generar token y antes de res.json
console.log("▶ Setting cookie token (first 40 chars):", token?.slice?.(0,40));
res.cookie("token", token, {
  httpOnly: true,
  secure: true, // en local
  sameSite: "None", // en local para cross-port
  path: "/",
  maxAge: 60 * 60 * 1000,
});

    // ✅ Solo un res.json
    return res.status(200).json({
      ok: true,
      token:token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        departamento: usuario.departamento,
        rol: usuario.rol,
        cargo: usuario.cargo,
        foto_url: usuario.foto_url || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

export function me(req, res) {
  console.log("🟦 /auth/me cookies:", req.cookies);
console.log("🟦 /auth/me headers.cookie:", req.headers.cookie);
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: "NO_AUTH" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("decoded:", decoded);

    return res.json({
      usuario: {
        id: decoded.id,
        nombre: decoded.nombre,
        correo: decoded.correo,
        departamento: decoded.departamento,
        rol: decoded.rol,
        cargo: decoded.cargo,
        foto_url: decoded.foto_url || null,
      },
    });
  } catch {
    return res.status(401).json({ error: "TOKEN_INVALIDO" });
  }
}

export function logout(req, res) {
  res.clearCookie("token", { path: "/" });
  return res.json({ ok: true });
}