import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('✅ MongoDB reconnected'));

export async function connectDB() {
  const conn = await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
}

export async function disconnectDB() {
  await mongoose.connection.close();
}

const STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

/** Human-readable connection state, used by /api/health. */
export const dbState = () => STATES[mongoose.connection.readyState] ?? 'unknown';
