import { DatasetStore, recoverDatabaseLock } from "../server/store.mjs";

try {
  if (process.argv.length !== 2)
    throw new Error("Usage: node scripts/recover-lock.mjs");
  console.log(
    (await recoverDatabaseLock(new DatasetStore()))
      ? "Removed an abandoned database update lock. The saved database was preserved."
      : "No database update lock exists.",
  );
} catch (error) {
  console.error(`Lock recovery stopped: ${error.message}`);
  process.exitCode = 1;
}
