import { readFile, stat } from "node:fs/promises";
import { DatasetStore } from "../server/store.mjs";
import { importReviewedEvidence } from "../server/import.mjs";

try {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--file" || !args[1])
    throw new Error(
      "Usage: node scripts/import.mjs --file reviewed-evidence.json",
    );
  if ((await stat(args[1])).size > 10 * 1024 * 1024)
    throw new Error("Evidence import exceeds the 10 MB limit.");
  const input = JSON.parse(await readFile(args[1], "utf8"));
  const { imported } = await importReviewedEvidence(new DatasetStore(), input);
  console.log(
    `Imported ${imported} manually reviewed evidence records. Unknown stance remains not_recorded.`,
  );
} catch (error) {
  console.error(`Evidence import failed: ${error.message}`);
  process.exitCode = 1;
}
