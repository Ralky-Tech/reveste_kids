import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import http from "http";
import dns from "node:dns";

import swaggerSpec from "./swagger.js";
import { initSocket } from "./socket.js";

import userRoutes from "./routes/userRoutes.js";
import clothingRoutes from "./routes/clothingRoutes.js";
import interestRoutes from "./routes/interestRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();

if (
  process.env.npm_lifecycle_event === "dev" &&
  process.env.NODE_ENV !== "production" &&
  process.env.BACKEND_DEV_DNS
) {
  dns.setServers([process.env.BACKEND_DEV_DNS]);
}

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 4000;

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://reveste-kids-sepia.vercel.app",
      "https://reveste-kids-6ubgm2y0l-rogerio-pupo-toledos-projects.vercel.app",
    ],
    credentials: true,
  })
);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/", userRoutes);
app.use("/", clothingRoutes);
app.use("/api", interestRoutes);
app.use("/api", notificationRoutes);
app.use("/api/chat", chatRoutes);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Conectado ao MongoDB Atlas");

    initSocket(server);

    server.listen(port, () => {
      console.log(`API rodando em http://localhost:${port}`);
      console.log(`Swagger disponível em http://localhost:${port}/api-docs`);
    });
  })
  .catch((error) => {
    console.log("Erro ao conectar:", error);
  });
