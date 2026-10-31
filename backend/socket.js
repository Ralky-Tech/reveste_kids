import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://reveste-kids-sepia.vercel.app",
        "https://reveste-kids-6ubgm2y0l-rogerio-pupo-toledos-projects.vercel.app",
      ],
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