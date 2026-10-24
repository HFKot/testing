import { readFile, stat } from "node:fs/promises";
import { DatasetStore } from "../server/store.mjs";
import { importCandidates } from "../server/candidates.mjs";

try {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--file" || !args[1])
    throw new Error(
      "Usage: node scripts/import-people.mjs --file reviewed-candidates.json",
    );
  const maximumBytes = 10 * 1024 * 1024;
  if ((await stat(args[1])).size > maximumBytes)
    throw new Error("Candidate import exceeds the 10 MB limit.");
  const file = await readFile(args[1]);
  if (file.byteLength > maximumBytes)
    throw new Error("Candidate import exceeds the 10 MB limit.");
  const { imported } = await importCandidates(
    new DatasetStore(),
    JSON.parse(file.toString("utf8")),
  );
  console.log(
    `Imported ${imported} explicitly sourced candidate records. Status and election year were preserved as reviewed.`,
  );
} catch (error) {
  console.error(`Candidate import failed: ${error.message}`);
  process.exitCode = 1;
}
