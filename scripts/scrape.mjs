import { DatasetStore } from "../server/store.mjs";
import { createScrapeDraft } from "../server/scraper.mjs";

try {
  const args = process.argv.slice(2);
  const allowed = new Set(["--url", "--person", "--type", "--issue"]);
  const values = new Map();
  if (args.length !== 8)
    throw new Error(
      "Usage: node scripts/scrape.mjs --url https://official-source/path --person existing-person-id --type statement|vote|action --issue energy",
    );
  for (let index = 0; index < args.length; index += 2) {
    if (
      !allowed.has(args[index]) ||
      values.has(args[index]) ||
      !args[index + 1] ||
      args[index + 1].startsWith("--")
    )
      throw new Error("Invalid or duplicate scraper argument.");
    values.set(args[index], args[index + 1]);
  }
  const result = await createScrapeDraft(new DatasetStore(), {
    url: values.get("--url"),
    personId: values.get("--person"),
    type: values.get("--type"),
    issue: values.get("--issue"),
  });
  console.log(`Unreviewed source draft saved: ${result.filename}`);
  console.log(
    "Verify the original text, attribution, date and context before creating a reviewed evidence import. No public evidence was changed.",
  );
} catch (error) {
  console.error(`Official source draft failed: ${error.message}`);
  process.exitCode = 1;
}
