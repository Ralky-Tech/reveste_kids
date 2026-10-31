import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const socket = io(API_BASE_URL, {
  autoConnect: false,
});

export default API_BASE_URL;
