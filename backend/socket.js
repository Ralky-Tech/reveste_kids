import { Server } from "socket.io";
import { allowedOrigins } from "./config/cors.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Socket conectado: ${socket.id}`);

    socket.on("join-match-room", ({ matchId }) => {
      if (!matchId) return;
      socket.join(`match-${matchId}`);
      console.log(`Usuário entrou na sala match-${matchId}`);
    });

    socket.on("disconnect", () => {
      console.log(`❌ Socket desconectado: ${socket.id}`);
    });
  });

  return io;
};

export const getIo = () => {
  if (!io) {
    throw new Error("Socket.io não foi inicializado");
  }
  return io;
};
