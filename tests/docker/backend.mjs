import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { allowedOrigins } from '../config/cors.js';

// Test double only. No application startup, models, Google calls or persistence.
const app = express();
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.get('/health', (_req, res) => res.json({ status: 'ok', simulated: true }));
app.post('/auth', (req, res) => res.json({ simulated: true, received: req.body.marker }));
app.get('/api/clothes-check', (_req, res) => res.json({ simulated: true, apiPrefixPreserved: true }));

const server = createServer(app);
const io = new Server(server, { cors: { origin: allowedOrigins } });
io.on('connection', socket => {
  socket.on('join-match-room', ({ matchId }) => {
    socket.join(`match-${matchId}`);
    socket.emit('smoke:joined', { joined: true });
  });
});
server.listen(4000, '0.0.0.0');
