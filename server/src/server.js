import http from 'node:http';
import { Server } from 'socket.io';
import { corsOrigins, env, isProd } from './config/env.js';
import { initSockets } from './sockets/index.js';
import { connectDB, disconnectDB } from './config/db.js';
import app from './app.js';
import { failStuckGenerations } from './services/recommendation.service.js';

const server = http.createServer(app);

// Realtime notifications and live status updates (docs/10).
const io = new Server(server, { cors: { origin: corsOrigins, credentials: true } });
initSockets(io);

async function start() {
  try {
    await connectDB();
    await failStuckGenerations();
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    // In production the API is useless without a database. In development we keep
    // running so /api/health can report the problem.
    if (isProd) process.exit(1);
  }

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${env.PORT} is already in use. Is another API instance (npm run dev) running?`);
      process.exit(1);
    }
    throw err;
  });

  server.listen(env.PORT, () => {
    console.log(`🚀 C2B API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
}

async function shutdown(signal) {
  console.log(`\n${signal} received, shutting down...`);
  io.close();
  server.close(async () => {
    await disconnectDB().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => console.error('💥 Unhandled rejection:', reason));

start();
