import pg from "pg";
import { env } from "./env.js";

const { Pool } = pg;

// export const pool = new Pool({
//   host: process.env.DB_HOST,
//   port: Number(process.env.DB_PORT ?? 5432),
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   ssl: (process.env.DB_SSL ?? "false") === "true" ? { rejectUnauthorized: false } : false,
//   max: 10, // conexiones en el pool
//   idleTimeoutMillis: 30_000,
//   connectionTimeoutMillis: 5_000,
// });
// export const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: process.env.NODE_ENV === "production" 
//     ? { rejectUnauthorized: false } // Render exige SSL
//     : false,                        // Local sin SSL
//   max: 10,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 5000,
// });


export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    require: true,              // fuerza SSL
    rejectUnauthorized: false,  // Render usa certificados autofirmados
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
// Prueba rápida al arrancar (opcional)
export async function testDbConnection() {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1;");
  } finally {
    client.release();
  }
}