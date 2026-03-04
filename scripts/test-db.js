import "dotenv/config";
import { listUsuarios } from "../src/repositories/usuarios.repo.js";

const usuarios = await listUsuarios();
//console.log("Usuarios:", usuarios);
process.exit(0);