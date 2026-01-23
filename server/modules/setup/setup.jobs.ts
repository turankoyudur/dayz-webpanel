import { spawn } from "child_process";
import crypto from "crypto";

export type SetupJobType = "install-steamcmd" | "install-dayz";
export type SetupJobStatus = "queued" | "running" | "success" | "failed";

export type SetupJob = {
  id: string;
  type: SetupJobType;
  status: SetupJobStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
  outputTail: string;
  outputBytes: number;
  error?: string;
};

const MAX_OUTPUT_BYTES = 250_000;
const MAX_OUTPUT_TAIL_CHARS = 200_000;

function isoNow() {
  return new Date().toISOString();
}

function genId() {
  return crypto.randomBytes(12).toString("hex");
}

type InternalJob = SetupJob & { _command: string; _args: string[] };

export class SetupJobStore {
  private static jobs = new Map<string, InternalJob>();

  static list(): SetupJob[] {
    return Array.from(this.jobs.values()).map((j) => this.publicJob(j));
  }

  static get(id: string): SetupJob | undefined {
    const j = this.jobs.get(id);
    return j ? this.publicJob(j) : undefined;
  }

  static clear(id: string): boolean {
    return this.jobs.delete(id);
  }

  static start(type: SetupJobType, command: string, args: string[]): SetupJob {
    // Avoid duplicates: if same job type is already running/queued, return it.
    for (const j of this.jobs.values()) {
      if (j.type === type && (j.status === "queued" || j.status === "running")) {
        return this.publicJob(j);
      }
    }

    const job: InternalJob = {
      id: genId(),
      type,
      status: "queued",
      createdAt: isoNow(),
      outputTail: "",
      outputBytes: 0,
      _command: command,
      _args: args,
    };

    this.jobs.set(job.id, job);
    setImmediate(() => this.run(job.id));

    return this.publicJob(job);
  }

  private static publicJob(j: InternalJob): SetupJob {
    const { _command, _args, ...pub } = j;
    return pub;
  }

  private static append(job: InternalJob, chunk: string) {
    job.outputBytes += Buffer.byteLength(chunk, "utf8");
    job.outputTail += chunk;

    if (job.outputTail.length > MAX_OUTPUT_TAIL_CHARS) {
      job.outputTail = job.outputTail.slice(-MAX_OUTPUT_TAIL_CHARS);
    }

    if (job.outputBytes > MAX_OUTPUT_BYTES) {
      job.outputBytes = Buffer.byteLength(job.outputTail, "utf8");
    }
  }

  private static run(id: string) {
    const job = this.jobs.get(id);
    if (!job || job.status !== "queued") return;

    job.status = "running";
    job.startedAt = isoNow();

    const child = spawn(job._command, job._args, {
      windowsHide: process.platform === "win32",
    });

    child.stdout.on("data", (d) => this.append(job, d.toString()));
    child.stderr.on("data", (d) => this.append(job, d.toString()));

    child.on("error", (err) => {
      job.status = "failed";
      job.error = String((err as any)?.message ?? err);
      job.finishedAt = isoNow();
    });

    child.on("close", (code) => {
      job.exitCode = code ?? 0;
      job.status = job.exitCode === 0 ? "success" : "failed";
      job.finishedAt = isoNow();
    });
  }
}
