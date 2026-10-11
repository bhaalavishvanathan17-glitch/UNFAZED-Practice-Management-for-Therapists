const mongoose = require('mongoose');

/**
 * Connects to MongoDB.
 * Priority:
 * 1. MONGODB_URI in process.env (e.g. MongoDB Atlas)
 * 2. If missing or placeholder in development, automatically boots an in-memory
 *    Mongo instance via mongodb-memory-server so all APIs & database actions work out-of-the-box.
 */
let memoryServer = null;

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    const isPlaceholder = !uri || uri.includes('<username>') || uri.includes('username:password') || uri.includes('cluster.mongodb.net');

    if (!isPlaceholder) {
      const conn = await mongoose.connect(uri);
      console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('⚡ Initializing development In-Memory MongoDB Server...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      const memUri = memoryServer.getUri();
      const conn = await mongoose.connect(memUri);
      console.log(`✅ In-Memory MongoDB Connected at: ${conn.connection.host} (${memUri})`);
      console.log('   (Tip: When ready for Atlas, provide a real MONGODB_URI in unfazed-backend/.env)');
    } else {
      throw new Error('Production environment requires a valid MONGODB_URI');
    }
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
