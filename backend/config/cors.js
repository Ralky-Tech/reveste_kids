// Keep deployed origins compatible; Compose adds its local browser origin.
export const allowedOrigins = [
  "http://localhost:5173",
  "https://reveste-kids-sepia.vercel.app",
  "https://reveste-kids-6ubgm2y0l-rogerio-pupo-toledos-projects.vercel.app",
  ...(process.env.CORS_ORIGINS || "").split(",").map(origin => origin.trim()).filter(Boolean),
];
