/**
 * scripts/setup.mjs
 *
 * What this script does:
 * - Creates the MCSManager-inspired file layout under ./data
 * - Generates a system config (port, JWT secret, etc.) if missing
 * - Creates a default admin user with a random password if missing
 * - Creates a default DayZ instance config pointing to the paths you provided
 *
 * Why this exists:
 * - You asked for a project that does NOT depend on a DB (Prisma/SQLite/etc.)
 * - You want a stable, revisable file structure (like MCSManager / MCS Loader)
 * - You want a 1-click installation via .bat files
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const repoRoot = process.cwd();
const dataDir = path.join(repoRoot, 'data');

const systemDir = path.join(dataDir, 'SystemConfig');
const instanceConfigDir = path.join(dataDir, 'InstanceConfig');
const instanceDataDir = path.join(dataDir, 'InstanceData');

// ---- Default paths (YOUR machine)
// You can later edit these from the web panel (Instance Settings) without breaking the file layout.
const DEFAULT_DAYZ_ROOT = 'E:\\steamcmd\\steamapps\\common\\DayZServer';
const DEFAULT_BE_DIR = 'E:\\steamcmd\\steamapps\\common\\DayZServer\\profiles\\BattlEye';
const DEFAULT_PROFILES_DIR = 'E:\\steamcmd\\steamapps\\common\\DayZServer\\profiles';
const DEFAULT_STEAMCMD_EXE = 'E:\\steamcmd\\steamcmd.exe';

// ---- Simple, dependency-free password hashing (scrypt)
// Format: scrypt$<saltB64>$<hashB64>
function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(plain, salt, 32);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

function randomPassword(len = 16) {
  // URL-safe-ish random password (no spaces)
  return crypto.randomBytes(len).toString('base64url').slice(0, len);
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function writeJsonAtomic(filePath, obj) {
  const tmp = `${filePath}.tmp`;
  const json = JSON.stringify(obj, null, 2);
  await fs.writeFile(tmp, json, 'utf8');
  await fs.rename(tmp, filePath);
}

async function main() {
  // 1) Create the directory structure
  await ensureDir(systemDir);
  await ensureDir(instanceConfigDir);
  await ensureDir(instanceDataDir);

  // 2) System config
  const systemConfigPath = path.join(systemDir, 'config.json');
  const systemConfigExists = await fileExists(systemConfigPath);

  if (!systemConfigExists) {
    const jwtSecret = crypto.randomBytes(32).toString('hex');

    const systemConfig = {
      version: 1,
      http: {
        host: '127.0.0.1',
        port: 8081
      },
      auth: {
        requireLogin: true,
        jwtSecret,
        tokenTtlMinutes: 1440
      },
      security: {
        // For local usage you usually want this OFF.
        // Turn it ON if you expose the panel to the internet.
        trustProxy: false,
        allowedOrigins: [
          'http://localhost:8081',
          'http://127.0.0.1:8081'
        ]
      },
      paths: {
        dataDir: './data'
      },
      webhooks: {
        discordWebhookUrl: ""
      }
    };

    await writeJsonAtomic(systemConfigPath, systemConfig);
  }

  // 3) Users (local JSON “DB”)
  const usersPath = path.join(systemDir, 'users.json');
  const usersExists = await fileExists(usersPath);

  if (!usersExists) {
    const password = randomPassword(18);
    const users = {
      version: 1,
      users: [
        {
          id: 'u_admin',
          username: 'admin',
          displayName: 'Administrator',
          role: 'ADMIN',
          password: {
            algo: 'scrypt',
            value: hashPassword(password)
          },
          createdAt: new Date().toISOString()
        }
      ]
    };

    await writeJsonAtomic(usersPath, users);

    // Save credentials for the first run.
    const credsPath = path.join(systemDir, 'FIRST_RUN_CREDENTIALS.txt');
    await fs.writeFile(
      credsPath,
      `DayZ Local Panel - First Run Credentials\r\n\r\nUsername: admin\r\nPassword: ${password}\r\n\r\nIMPORTANT: Change this password from the panel after first login.\r\n`,
      'utf8'
    );
  }

  // 4) Default instance config (DayZ)
  // This is heavily inspired by MCSManager: InstanceConfig/<id>.json & InstanceData/<id>/... layout
  const instanceId = 'dayz-main';
  const instanceConfigPath = path.join(instanceConfigDir, `${instanceId}.json`);
  const instanceDataPath = path.join(instanceDataDir, instanceId);

  if (!(await fileExists(instanceConfigPath))) {
    const instanceConfig = {
      version: 1,
      id: instanceId,
      name: 'DayZ Main (Local)',
      type: 'dayz',
      enabled: true,

      paths: {
        root: DEFAULT_DAYZ_ROOT,
        profiles: DEFAULT_PROFILES_DIR,
        battleye: DEFAULT_BE_DIR,

        // Common DayZ config file location. You can change this in the panel.
        serverDzCfg: path.join(DEFAULT_DAYZ_ROOT, 'serverDZ.cfg')
      },

      network: {
        host: '127.0.0.1',
        gamePort: 2302,
        // BattlEye RCon is commonly configured as game port + 3.
        // The real port is read from BEServer_x64.cfg if present.
        rconPort: 2305
      },

      process: {
        exe: 'DayZServer_x64.exe',
        workingDir: DEFAULT_DAYZ_ROOT,

        // Default launch parameters (you can edit in the UI)
        // Tip: Keep -profiles in sync with paths.profiles.
        args: [
          `-config=serverDZ.cfg`,
          `-port=2302`,
          `-profiles=profiles`,
          `-BEpath=profiles\\BattlEye`,
          `-dologs`,
          `-adminlog`,
          `-netlog`,
          `-freezecheck`
        ],

        // If RCon is connected, we will try sending this first on STOP.
        // If it fails, we will force-stop the process.
        gracefulStopCommand: '#shutdown',

        mods: []
      },

      steamcmd: {
        enabled: true,
        exe: DEFAULT_STEAMCMD_EXE,
        // Steam app id for DayZ Dedicated Server
        appId: 223350,
        // Steam app id for DayZ Workshop content
        workshopAppId: 221100
      },

      watchdog: {
        enabled: true,
        restartOnCrash: true,
        restartDelaySeconds: 10
      }
    };

    await writeJsonAtomic(instanceConfigPath, instanceConfig);
  }

  // 5) Create InstanceData folders + logs
  await ensureDir(instanceDataPath);
  await ensureDir(path.join(instanceDataPath, 'logs'));
  await ensureDir(path.join(instanceDataPath, 'runtime'));
  await ensureDir(path.join(instanceDataPath, 'backups'));

  const readmePath = path.join(instanceDataPath, 'README.txt');
  if (!(await fileExists(readmePath))) {
    await fs.writeFile(
      readmePath,
      `InstanceData/${instanceId}\r\n\r\n- logs/: panel console logs, rcon logs, audit logs\r\n- runtime/: pid files, runtime state\r\n- backups/: future backups (zip)\r\n\r\nThis folder is designed to stay stable across future revisions.\r\n`,
      'utf8'
    );
  }

  console.log('✅ Setup complete.');
  console.log(`- System config: ${systemConfigPath}`);
  console.log(`- Users: ${usersPath}`);
  console.log(`- Instance config: ${instanceConfigPath}`);
}

main().catch((err) => {
  console.error('❌ Setup failed:', err);
  process.exit(1);
});
