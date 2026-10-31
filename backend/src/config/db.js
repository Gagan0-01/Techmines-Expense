import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return;

  const primaryUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/techmines_ledger';

  try {
    const conn = await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 2500,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected to database: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.warn(`[MongoDB] Primary connection to '${primaryUri}' failed (${err.message}).`);
    console.log('[MongoDB] Starting embedded MongoDB Memory Server for seamless zero-setup operation...');

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create({
        instance: {
          dbName: 'techmines_ledger'
        }
      });
      const memoryUri = mongod.getUri();
      const memConn = await mongoose.connect(memoryUri);
      isConnected = true;
      console.log(`[MongoDB] Successfully connected to embedded MongoDB: ${memoryUri}`);
    } catch (memErr) {
      console.error('[MongoDB] Critical: Failed to start embedded MongoDB Memory Server:', memErr); 
      throw memErr;
    }
  }
};
