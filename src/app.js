// src/app.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";


import routes from "./routes/index.js";
import { notFound } from "./middlewares/notfound.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { fileURLToPath } from "url";
import { pool } from "./config/db.js"; 
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(helmet());
// app.use(cors({
//     origin: "http://localhost:3100",
//     credentials: true,
// }));
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/crm", routes);
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM usuarios LIMIT 10;");
    res.status(200).json({
      success: true,
      count: result.rowCount,
      data: result.rows,
    });
  } catch (error) {
    console.error("❌ Error al consultar usuarios:", error);
    res.status(500).json({
      success: false,
      message: "Error al consultar la base de datos",
      error: error.message,
    });
  }
});
app.use(notFound);
app.use(errorHandler);

export default app;