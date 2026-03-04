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

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(helmet());
app.use(cors({
    origin: "http://localhost:3100",
    credentials: true,
}));
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/crm", routes);

app.use(notFound);
app.use(errorHandler);

export default app;