/**
 * server.js — Server Entry Point
 * 
 * This is the file that actually starts the server.
 * It loads environment variables, connects to the database,
 * and starts listening for HTTP requests.
 * 
 * Why separate from app.js?
 * - app.js defines WHAT the server does (routes, middleware)
 * - server.js defines HOW it runs (port, database connection)
 * - This separation makes testing easier
 */
require('dotenv').config();

const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { seedDemoData } = require('./utils/seedData');
const { initSocketServer } = require('./socket');

const PORT = process.env.PORT || 5001;

// Start the server
const startServer = async () => {
  // Connect to MongoDB first
  await connectDB();

  // Auto-seed development demo data
  if (process.env.NODE_ENV !== 'production') {
    await seedDemoData();
  }

  const server = http.createServer(app);
  initSocketServer(server);

  server.listen(PORT, () => {
    console.log(`\n🧠 UNFAZED Backend running on port ${PORT} (with Socket.IO)`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
};

startServer();
