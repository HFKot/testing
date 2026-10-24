import { DatasetStore } from "../server/store.mjs";
import { synchronize } from "../server/roster.mjs";

try {
  const result = await synchronize(new DatasetStore());
  console.log(result.sync.message);
  if (!result.sync.ok) process.exitCode = 1;
} catch (error) {
  console.error(`Registry refresh failed: ${error.message}`);
  process.exitCode = 1;
}
