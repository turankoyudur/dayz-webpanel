/**
 * index.ts
 *
 * Application entry point.
 */

import http from 'node:http';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Server as SocketIOServer } from 'socket.io';

import { findRepoRoot, dataDirFromRoot, webDistDirFromRoot } from './app/paths.js';
import { loadSystemConfig } from './config/systemConfig.js';
import { InstanceManager } from './instances/instanceManager.js';
import { AuditLogger } from './audit/audit.js';
import { RconManager } from './rcon/rconManager.js';
import { DayzProcessManager } from './dayz/processManager.js';
import { SteamCmdService } from './steam/steamcmdService.js';
import { SchedulerService } from './scheduler/scheduler.js';
import type { AppContext } from './app/context.js';

import { registerAuthRoutes } from './modules/authRoutes.js';
import { registerInstanceRoutes } from './modules/instanceRoutes.js';
import { registerProcessRoutes } from './modules/processRoutes.js';
import { registerRconRoutes } from './modules/rconRoutes.js';
import { registerFileRoutes } from './modules/fileRoutes.js';
import { registerBattleyeRoutes } from './modules/battleyeRoutes.js';
import { registerSteamRoutes } from './modules/steamRoutes.js';
import { registerLogsRoutes } from './modules/logsRoutes.js';
import { registerSchedulerRoutes } from './modules/schedulerRoutes.js';

// -------- Boot sequence --------

const repoRoot = await findRepoRoot();
const dataDir = dataDirFromRoot(repoRoot);

// Global config (port, JWT secret, etc.)
const systemConfig = await loadSystemConfig(dataDir);

// Managers (our modular services)
const instances = new InstanceManager(dataDir);
const audit = new AuditLogger(dataDir);
const rcon = new RconManager();
const processMgr = new DayzProcessManager(dataDir, rcon);
const steamcmd = new SteamCmdService(dataDir);
const scheduler = new SchedulerService(dataDir, instances, rcon, processMgr, steamcmd);

const ctx: AppContext = {
  repoRoot,
  dataDir,
  systemConfig,
  instances,
  audit,
  rcon,
  process: processMgr,
  steamcmd,
  scheduler
};

// -------- Express HTTP API --------

const app = express();

app.use(
  cors({
    origin: systemConfig.security.allowedOrigins,
    credentials: true
  })
);

app.use(helmet());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

// API router
const api = express.Router();
registerAuthRoutes(api, ctx);
registerInstanceRoutes(api, ctx);
registerProcessRoutes(api, ctx);
registerRconRoutes(api, ctx);
registerFileRoutes(api, ctx);
registerBattleyeRoutes(api, ctx);
registerSteamRoutes(api, ctx);
registerLogsRoutes(api, ctx);
registerSchedulerRoutes(api, ctx);

app.use('/api', api);

// Serve the built web UI (apps/web/dist)
const webDir = await webDistDirFromRoot(repoRoot);
if (webDir) {
  app.use(express.static(webDir));

  // SPA fallback: anything that's not /api goes to index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(webDir, 'index.html'));
  });
} else {
  // If the user didn't build the UI, still provide a hint.
  app.get('/', (_req, res) => {
    res.type('text/plain').send('Web UI not built. Run: npm run build');
  });
}

// -------- Socket.IO (real-time console/RCON output) --------

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: systemConfig.security.allowedOrigins,
    credentials: true
  }
});

io.on('connection', (socket) => {
  // Client can join rooms for specific instances to reduce noise.
  socket.on('joinInstance', (instanceId: string) => {
    socket.join(`inst:${instanceId}`);
  });
  socket.on('leaveInstance', (instanceId: string) => {
    socket.leave(`inst:${instanceId}`);
  });
});

// Forward process console lines to the UI
processMgr.on('console', ({ instanceId, line }) => {
  io.to(`inst:${instanceId}`).emit('console', { instanceId, line });
});

processMgr.on('state', ({ instanceId, state }) => {
  io.to(`inst:${instanceId}`).emit('status', { instanceId, state });
});

// Forward RCON messages
rcon.on('message', ({ instanceId, message }) => {
  io.to(`inst:${instanceId}`).emit('rcon', { instanceId, message });
});

rcon.on('connected', ({ instanceId }) => {
  io.to(`inst:${instanceId}`).emit('rconStatus', { instanceId, state: rcon.getState(instanceId) });
});

rcon.on('disconnected', ({ instanceId }) => {
  io.to(`inst:${instanceId}`).emit('rconStatus', { instanceId, state: rcon.getState(instanceId) });
});

rcon.on('error', ({ instanceId, error }) => {
  io.to(`inst:${instanceId}`).emit('rconError', { instanceId, error: error.message });
});

// Forward SteamCMD output
steamcmd.on('output', ({ instanceId, line }) => {
  io.to(`inst:${instanceId}`).emit('steamcmd', { instanceId, line });
});

// -------- Start scheduler + server --------

await scheduler.reloadAll();

server.listen(systemConfig.http.port, systemConfig.http.host, () => {
  // eslint-disable-next-line no-console
  console.log(
    `DayZ Local Panel listening on http://${systemConfig.http.host}:${systemConfig.http.port} (dataDir=${dataDir})`
  );
});
