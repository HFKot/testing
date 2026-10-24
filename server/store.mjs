import { readFile, mkdir, open, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { validateDataset } from "./validation.mjs";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));

export class DatasetStore {
  constructor({ rootDir = projectRoot } = {}) {
    this.rootDir = rootDir;
    this.directory = path.join(rootDir, ".local");
    this.filename = path.join(this.directory, "database.json");
    this.seedFilename = path.join(rootDir, "data", "seed.json");
  }

  async read() {
    let text;
    try {
      text = await readFile(this.filename, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      text = await readFile(this.seedFilename, "utf8");
    }
    try {
      return validateDataset(JSON.parse(text));
    } catch (cause) {
      throw new Error(
        "The local database is invalid; preserve it and restore a reviewed backup before writing.",
        { cause },
      );
    }
  }

  async update(mutator) {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const lockName = path.join(this.directory, "database.lock");
    let lock;
    try {
      lock = await open(lockName, "wx", 0o600);
    } catch (error) {
      if (error.code === "EEXIST") {
        const conflict = new Error(
          "A database update is already in progress. If a previous process stopped unexpectedly, run node scripts/recover-lock.mjs before retrying.",
        );
        conflict.status = 409;
        throw conflict;
      }
      throw error;
    }
    const temporary = path.join(this.directory, `database.${randomUUID()}.tmp`);
    try {
      await lock.writeFile(
        JSON.stringify({
          pid: process.pid,
          startedAt: new Date().toISOString(),
        }),
      );
      const result = validateDataset(await mutator(await this.read()));
      const output = await open(temporary, "wx", 0o600);
      try {
        await output.writeFile(JSON.stringify(result, null, 2) + "\n");
        await output.sync();
      } finally {
        await output.close();
      }
      await rename(temporary, this.filename);
      return result;
    } finally {
      await unlink(temporary).catch((error) => {
        if (error.code !== "ENOENT")
          console.error("Unable to remove a database temporary file.");
      });
      await lock.close();
      await unlink(lockName);
    }
  }
}

export async function recoverDatabaseLock(store) {
  await mkdir(store.directory, { recursive: true, mode: 0o700 });
  const recoveryName = path.join(store.directory, "database.recovery.lock");
  const recovery = await open(recoveryName, "wx", 0o600);
  try {
    const lockName = path.join(store.directory, "database.lock");
    let text;
    try {
      text = await readFile(lockName, "utf8");
    } catch (error) {
      if (error.code === "ENOENT") return false;
      throw error;
    }
    let metadata;
    try {
      metadata = JSON.parse(text);
    } catch {
      throw new Error(
        "The update lock is unreadable. Stop all writers and inspect it manually; it was preserved.",
      );
    }
    if (!Number.isInteger(metadata.pid) || metadata.pid <= 0)
      throw new Error(
        "The update lock has no valid process ID; it was preserved for manual inspection.",
      );
    try {
      process.kill(metadata.pid, 0);
    } catch (error) {
      if (error.code !== "ESRCH")
        throw new Error(
          "The update process may still be active; the lock was preserved.",
        );
      await unlink(lockName);
      return true;
    }
    throw new Error(
      "The database update process is still running; the active lock was preserved.",
    );
  } finally {
    await recovery.close();
    await unlink(recoveryName);
  }
}
