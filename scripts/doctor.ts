import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { getPrisma } from "../server/db/prisma";
import { SettingsService } from "../server/modules/settings/settings.service";

type CheckStatus = "ok" | "warn" | "fail";

dotenv.config();

const results: Array<{ label: string; status: CheckStatus; details: string }> = [];

function record(label: string, status: CheckStatus, details: string) {
  results.push({ label, status, details });
}

function formatStatus(status: CheckStatus) {
  if (status === "ok") return "OK";
  if (status === "warn") return "WARN";
  return "FAIL";
}

async function checkNodeVersion() {
  const major = Number(process.versions.node.split(".")[0] ?? 0);
  if (major >= 22) {
    record("Node.js", "ok", `Detected ${process.versions.node}`);
  } else {
    record("Node.js", "warn", `Detected ${process.versions.node}. Recommended 22.x.`);
  }
}

async function checkPrismaClient() {
  const prismaClientPath = path.join(process.cwd(), "node_modules", ".prisma", "client");
  const prismaClientJs = path.join(process.cwd(), "node_modules", "@prisma", "client");
  if (fs.existsSync(prismaClientPath) || fs.existsSync(prismaClientJs)) {
    record("Prisma client", "ok", "Generated client found.");
  } else {
    record("Prisma client", "fail", "Missing generated client. Run `npm run db:setup`.");
  }
}

async function checkDatabase() {
  const prisma = getPrisma();
  try {
    await prisma.$queryRaw`SELECT 1`;
    record("Database", "ok", "Connection succeeded.");
  } catch (error) {
    record("Database", "fail", `Connection failed: ${(error as Error).message}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function checkDistOutput() {
  const distPath = path.join(process.cwd(), "dist", "server", "node-build.mjs");
  if (fs.existsSync(distPath)) {
    record("Build output", "ok", "dist/server/node-build.mjs exists.");
  } else {
    record("Build output", "fail", "Missing dist/server/node-build.mjs. Run `npm run build`.");
  }
}

async function checkSettings() {
  const prisma = getPrisma();
  const settings = new SettingsService(prisma);
  try {
    const current = await settings.get();
    const checks = [
      {
        label: "Data root",
        value: (current as any).dataRoot,
        exists: fs.existsSync(String((current as any).dataRoot ?? "")),
        severityIfMissing: "fail" as const,
        fix: "Set a valid Data Root in Settings (or run the Setup Wizard).",
      },
      {
        label: "SteamCMD path",
        value: current.steamcmdPath,
        exists: fs.existsSync(current.steamcmdPath),
        severityIfMissing: "fail" as const,
        fix: "Install SteamCMD and set steamcmdPath, or use the Setup Wizard.",
      },
      {
        label: "DayZ server path",
        value: current.dayzServerPath,
        exists: fs.existsSync(current.dayzServerPath),
        severityIfMissing: "fail" as const,
        fix: "Install DayZ Dedicated Server (appid 223350) and set dayzServerPath.",
      },
      {
        label: "Profiles path",
        value: current.profilesPath,
        exists: fs.existsSync(current.profilesPath),
        severityIfMissing: "fail" as const,
        fix: "Create the profiles folder and set profilesPath (instance-specific recommended).",
      },
      {
        label: "ApiBridge path",
        value: current.apiBridgePath,
        exists: fs.existsSync(current.apiBridgePath),
        severityIfMissing: "warn" as const,
        fix: "Optional. If you use ApiBridge, ensure <profiles>/ApiBridge exists.",
      },
    ];

    for (const check of checks) {
      if (!check.value) {
        record("Settings", check.severityIfMissing, `${check.label} is empty. Fix: ${check.fix}`);
        continue;
      }
      if (check.exists) {
        record("Settings", "ok", `${check.label} set (${check.value}).`);
      } else {
        record(
          "Settings",
          check.severityIfMissing === "fail" ? "warn" : "warn",
          `${check.label} set but missing on disk (${check.value}). Fix: ${check.fix}`,
        );
      }
    }

    // Instance folder conventions (forward compatible with multi-instance support)
    const runtimeDir = path.join(current.dataRoot, "instances", current.instanceName, "runtime");
    const keysDir = path.join(current.dataRoot, "instances", current.instanceName, "keys");
    if (fs.existsSync(runtimeDir)) {
      record("Settings", "ok", `Instance runtime folder exists (${runtimeDir}).`);

      const runtimeFile = path.join(runtimeDir, "server-process.json");
      if (fs.existsSync(runtimeFile)) {
        record("Settings", "ok", `Server runtime state file exists (${runtimeFile}).`);
      } else {
        record(
          "Settings",
          "warn",
          `Server runtime state file not found (${runtimeFile}). Fix: start the server once to generate it.`,
        );
      }
    } else {
      record(
        "Settings",
        "warn",
        `Instance runtime folder missing (${runtimeDir}). Fix: run Setup Wizard "Create folders" step.`,
      );
    }
    if (fs.existsSync(keysDir)) {
      record("Settings", "ok", `Instance keys folder exists (${keysDir}).`);
    } else {
      record(
        "Settings",
        "warn",
        `Instance keys folder missing (${keysDir}). Fix: run Setup Wizard "Create folders" step.`,
      );
    }

    // Best-effort DayZ executable check (important for server start)
    try {
      await settings.getDayzExecutablePath();
      record("Settings", "ok", "DayZ executable detected.");
    } catch (err) {
      record(
        "Settings",
        "warn",
        `DayZ executable not found. Fix: check dayzServerPath. (${(err as Error).message})`,
      );
    }
  } catch (error) {
    record("Settings", "fail", `Failed to read settings: ${(error as Error).message}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function run() {
  await checkNodeVersion();
  await checkPrismaClient();
  await checkDatabase();
  await checkDistOutput();
  await checkSettings();

  const longest = results.reduce((max, item) => Math.max(max, item.label.length), 0);
  for (const result of results) {
    const paddedLabel = result.label.padEnd(longest, " ");
    console.log(`[${formatStatus(result.status)}] ${paddedLabel} - ${result.details}`);
  }

  const hasFailures = results.some((result) => result.status === "fail");
  if (hasFailures) {
    process.exit(1);
  }
}

run();
