import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import http from 'http';
import { initSocketServer } from './socket';
import { ensureDatabaseRunning } from './db';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
initSocketServer(server);

server.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await ensureDatabaseRunning();
});
