import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const seed = JSON.parse(
  readFileSync(new URL("../data/seed.json", import.meta.url), "utf8"),
);
const rosterCount = seed.people.length;
test("directory searches accented names and profile keeps missing evidence explicit", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".person-card")).toHaveCount(rosterCount);
  await page
    .getByRole("textbox", { name: "Busca por nombre, municipio o cargo…" })
    .fill("Jenniffer Gonzalez");
  await expect(page.locator(".person-card")).toHaveCount(1);
  await page.locator(".person-name").click();
  await expect(page.getByRole("dialog")).toContainText(
    "Jenniffer González-Colón",
  );
  await page.getByRole("button", { name: "Votos", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "No hay registros en esta categoría",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("watchlist survives reload and comparison shows original source links", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".person-card")).toHaveCount(rosterCount);
  const first = page.locator(".person-card").first();
  await first.locator(".follow-button").click();
  await page.reload();
  await expect(page.locator(".person-card")).toHaveCount(rosterCount);
  await expect(
    page.locator(".person-card").first().locator(".follow-button"),
  ).toHaveAttribute("aria-pressed", "true");
  await page.locator(".person-card").nth(0).locator(".compare-button").click();
  await page.locator(".person-card").nth(1).locator(".compare-button").click();
  await page.locator(".comparison-bar .button").click();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(
    page
      .getByRole("table")
      .getByRole("link", { name: "Consultar perfil original" }),
  ).toHaveCount(2);
  await expect(page.getByRole("table")).toContainText(
    "Sin registros importados",
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain(".csv");
});
test("party and evidence filters combine, clear, and candidates show coverage honestly", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".person-card")).toHaveCount(rosterCount);
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page.getByLabel("Partido", { exact: true }).selectOption("PIP");
  await expect(page.locator(".person-card")).toHaveCount(
    seed.people.filter((p: { party: string }) => p.party === "PIP").length,
  );
  await page.getByLabel("Tema con evidencia").selectOption("energy");
  await expect(page.locator(".person-card")).toHaveCount(0);
  await expect(page.getByText("No encontramos perfiles")).toBeVisible();
  await page
    .getByRole("button", { name: "Limpiar filtros", exact: true })
    .first()
    .click();
  await expect(page.locator(".person-card")).toHaveCount(rosterCount);
  await page.getByRole("tab", { name: /Candidaturas/ }).click();
  await expect(
    page.getByText("Las candidaturas necesitan su propia fuente"),
  ).toBeVisible();
});
test("English interface, sources and keyboard dialog controls work", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".person-card")).toHaveCount(rosterCount);
  await page.getByRole("button", { name: "Switch to English" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your vote deserves",
  );
  await page
    .getByRole("button", { name: "Sources & coverage", exact: true })
    .click();
  await expect(page.locator(".source-card")).toHaveCount(4);
  await expect(
    page.getByText("What we do not yet know", { exact: true }),
  ).toBeVisible();
  await page.locator(".method-link").click();
  await expect(page.getByRole("dialog")).toContainText("No political scores");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("mobile navigation and profile have no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".person-card")).toHaveCount(rosterCount);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page
    .getByRole("button", { name: "Mi seguimiento", exact: true })
    .click();
  await expect(page.getByText("Tu radar empieza contigo")).toBeVisible();
  await page
    .getByRole("button", { name: "Explorar perfiles", exact: true })
    .click();
  await page.locator(".person-name").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page
      .getByRole("dialog")
      .evaluate((e) => e.scrollWidth <= e.clientWidth),
  ).toBeTruthy();
});
test("historical officials and partial evidence never look current or complete", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/data");
  const dataset = await response.json();
  const person = dataset.people[0];
  person.status = "historical";
  dataset.evidence = [
    {
      id: "fixture-evidence",
      personId: person.id,
      type: "statement",
      title: "Synthetic test fixture",
      summary: "Test-only evidence; not product data.",
      issue: "energy",
      date: null,
      sourceUrl: "https://www.fortaleza.pr.gov/",
      sourceLabel: "Test fixture",
      stance: "not_recorded",
      verification: "reviewed",
      context: "This is a browser regression fixture.",
    },
  ];
  await page.route("**/api/data", (route) => route.fulfill({ json: dataset }));
  await page.goto("/");
  await expect(page.locator(".person-card")).toHaveCount(rosterCount);
  const card = page.locator(".person-card").filter({ hasText: person.name });
  await expect(card).toContainText("Cargo anterior");
  await expect(page.locator(".coverage-banner")).not.toContainText(
    "Aún no hay votos nominales ni posturas",
  );
  await card.locator(".person-name").click();
  await expect(page.getByRole("dialog")).toContainText("Cargo anterior");
  await page.getByRole("button", { name: "Votos", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "No hay registros en esta categoría",
  );
  await expect(page.getByRole("dialog")).not.toContainText(
    "aún no tiene declaraciones, votos o acciones",
  );
});
test("dialog traps backward keyboard navigation and preserves selected tab focus", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".person-card")).toHaveCount(rosterCount);
  await page.locator(".person-name").first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  expect(
    await dialog.evaluate((e) => e.contains(document.activeElement)),
  ).toBeTruthy();
  const votes = page.getByRole("button", { name: "Votos", exact: true });
  await votes.click();
  await expect(votes).toBeFocused();
});
test("closed mobile navigation is not tabbable and open navigation closes with Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".person-card")).toHaveCount(rosterCount);
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => {
      const r = (document.activeElement as HTMLElement).getBoundingClientRect();
      return r.x >= 0 && r.right <= innerWidth;
    }),
  ).toBeTruthy();
  const menu = page.getByRole("button", { name: "Abrir menú" });
  await menu.click();
  await expect(page.locator(".sidebar")).toHaveClass(/is-open/);
  await page.keyboard.press("Escape");
  await expect(page.locator(".sidebar")).not.toHaveClass(/is-open/);
  await expect(menu).toBeFocused();
});
test("reviewed import topics and parties remain selectable in filters", async ({
  page,
  request,
}) => {
  const dataset = await (await request.get("/api/data")).json();
  const person = dataset.people[0];
  person.party = "Test-only party";
  dataset.evidence = [
    {
      id: "fixture-other-topic",
      personId: person.id,
      type: "statement",
      title: "Synthetic test fixture",
      summary: "Only a test fixture.",
      issue: "housing",
      date: null,
      sourceUrl: "https://www.fortaleza.pr.gov/",
      sourceLabel: "Test fixture",
      stance: "not_recorded",
      verification: "reviewed",
      context: "Test-only fixture.",
    },
  ];
  await page.route("**/api/data", (route) => route.fulfill({ json: dataset }));
  await page.goto("/");
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await expect(
    page
      .getByLabel("Partido", { exact: true })
      .locator('option[value="Test-only party"]'),
  ).toHaveCount(1);
  await expect(
    page.getByLabel("Tema con evidencia").locator('option[value="housing"]'),
  ).toHaveCount(1);
  await page
    .getByLabel("Partido", { exact: true })
    .selectOption("Test-only party");
  await page.getByLabel("Tema con evidencia").selectOption("housing");
  await expect(page.locator(".person-card")).toHaveCount(1);
});
