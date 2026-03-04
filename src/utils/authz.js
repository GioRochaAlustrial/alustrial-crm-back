// src/utils/authz.js

// Normalizadores
const normalize = (v) => String(v || "").trim().toUpperCase();

// ====================
// Roles macro
// ====================

export function isDirector(user) {
  return normalize(user?.rol) === "DIRECTOR";
}

export function isAdmin(user) {
  return normalize(user?.rol) === "ADMIN";
}

export function isGerente(user) {
  return normalize(user?.rol) === "GERENTE";
}

export function isVentas(user) {
  return normalize(user?.rol) === "VENTAS";
}

export function isEspecialista(user) {
  return normalize(user?.rol) === "ESPECIALISTA";
}

// ====================
// Jerarquía organizacional (cargo)
// ====================

export function isJefeDepto(user) {
  return (
    normalize(user?.cargo) === "JEFE_DEPARTAMENTO" ||
    user?.es_jefe === true
  );
}

export function isTecnico(user) {
  return normalize(user?.cargo) === "TECNICO";
}