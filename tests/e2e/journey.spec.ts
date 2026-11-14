import { expect, test, type Page } from "@playwright/test";

async function completeSignup(page: Page) {
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Test email").fill("demo@example.com");
  await dialog.getByLabel("Password").fill("test-password");
  await dialog.getByRole("button", { name: "Sign up", exact: true }).click();
}

test("demo journey, evidence, recommendations and simulator", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Token Doctor here! Ready to diagnose your tokens",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore demo", exact: true }).click();
  await completeSignup(page);
  await expect(page.getByRole("option", { name: "Demo AI Co." })).toHaveCount(
    1,
  );
  await expect(
    page.getByRole("heading", { name: "Token consumption", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", {
      name: "Anthropic / Claude Sonnet 5.5",
      exact: true,
    }),
  ).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "provider", exact: true })
    .selectOption("Anthropic");
  await expect(
    page
      .getByRole("heading", { name: "AI requests", exact: true })
      .locator(".."),
  ).toContainText("42");
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await page
    .getByRole("button", { name: "Token Diagnosis", exact: true })
    .click();
  const finding = page
    .locator(".finding")
    .filter({ hasText: "Poor caching efficiency" })
    .first();
  await finding.locator("summary").click();
  await expect(finding.getByText("Detection threshold")).toBeVisible();
  await expect(finding.getByRole("table")).toBeVisible();
  await page
    .getByRole("button", { name: "Recommendations", exact: true })
    .click();
  await page.locator("summary").first().click();
  await expect(page.getByText("Detection threshold").first()).toBeVisible();
  await page
    .getByLabel(/Review status/)
    .first()
    .selectOption("In progress");
  await page.reload();
  await page
    .getByRole("button", { name: "Recommendations", exact: true })
    .click();
  await expect(page.getByLabel(/Review status/).first()).toHaveValue(
    "In progress",
  );
  await page
    .getByRole("button", { name: "Usage Breakdown", exact: true })
    .click();
  await page.getByLabel("Group by").selectOption("Department");
  await expect(
    page.getByRole("cell", { name: "Research", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Live Token Usage", exact: true })
    .click();
  await page.getByLabel("Scenario").selectOption({ label: "Poor caching" });
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.getByText(/Poor caching efficiency ·/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Local processing p95" }).locator(".."),
  ).toContainText("ms");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const count = await page
    .getByRole("heading", { name: "Events", exact: true })
    .locator("..")
    .innerText();
  await page.waitForTimeout(750);
  await expect(
    page.getByRole("heading", { name: "Events", exact: true }).locator(".."),
  ).toHaveText(count.replace("\n", ""));
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(page.getByText("Stopped", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByText("No requests yet")).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile onboarding, profile, import and preferences", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Upload usage data", exact: true })
    .click();
  await completeSignup(page);
  await page
    .getByLabel("How familiar are you with AI?")
    .selectOption("Advanced");
  const upload = page.getByLabel("Usage file");
  await upload.setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("[]"),
  });
  await expect(page.locator(".import-panel").getByRole("alert")).toContainText(
    "at least one",
  );
  const csv =
    "timestamp,provider,model,application,input,output,cached,latency\n2026-11-01,OpenAI,GPT-6.1 Sol,Test App,9000,20,10,500";
  await upload.setInputFiles({
    name: "usage.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(page.getByText("Local data", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByLabel("How familiar are you with AI?")).toHaveValue(
    "Advanced",
  );
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("Dark");
  await page.getByLabel("Input tokens per request").fill("10000");
  await page.getByLabel("Input tokens per request").blur();
  await page.reload();
  await expect(page.locator("[data-theme]")).toHaveAttribute(
    "data-theme",
    "dark",
  );
  await page
    .getByRole("button", { name: "Token Diagnosis", exact: true })
    .click();
  await expect(
    page.getByText("0 findings across 1 evaluated requests."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ask Token Doctor", exact: true })
    .click();
  await page.getByRole("button", { name: "What are tokens?" }).click();
  await expect(page.getByText(/Cached input is a subset/)).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(390);
});

test("gates landing feature destinations and opens the selected screen after sign-up", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Workspace" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Investigate demo findings" }).click();
  await completeSignup(page);
  await expect(
    page.getByRole("heading", { name: "Token Diagnosis" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Token Doctor here/ }),
  ).toHaveCount(0);
});

test("registers, persists and signs back into a test account", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await completeSignup(page);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("demo@example.com", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Token Doctor here/ }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Workspace" })).toHaveCount(
    0,
  );
  await page.reload();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await dialog.getByLabel("Test email").fill("unknown@example.com");
  await dialog.getByLabel("Password").fill("wrong-password");
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("No test account");
  await dialog.getByLabel("Test email").fill("demo@example.com");
  await dialog.getByLabel("Password").fill("wrong-password");
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Incorrect password");
  await dialog.getByLabel("Password").fill("test-password");
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
});

test("creates organisations and projects, renames projects and preserves project data", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await completeSignup(page);
  await page
    .getByRole("button", { name: "New organisation", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Organisation name").fill("Studio");
  await dialog.getByLabel("First project name").fill("Research");
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(
    page.getByText("This project has no usage data yet."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Load demo data", exact: true })
    .click();
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await dialog.getByLabel("Project name", { exact: true }).fill("Support");
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await page
    .getByRole("button", { name: "Rename project", exact: true })
    .click();
  await dialog
    .getByLabel("Project name", { exact: true })
    .fill("Customer Support");
  await dialog.getByRole("button", { name: "Save name", exact: true }).click();
  await page.reload();
  const project = page.getByRole("combobox", { name: "Project", exact: true });
  await expect(project.locator("option:checked")).toHaveText(
    "Customer Support",
  );
  await expect(
    page.getByText("This project has no usage data yet."),
  ).toBeVisible();
  await project.selectOption({ label: "Research" });
  await expect(page.getByText("Simulated data", { exact: true })).toBeVisible();
  await page
    .getByRole("combobox", { name: "Organisation", exact: true })
    .selectOption({ label: "Demo AI Co." });
  await expect(project.locator("option:checked")).toHaveText("Demo project");
});

test("clears demo and restores the selected project's imported data", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Upload usage data", exact: true })
    .click();
  await completeSignup(page);
  const csv =
    "timestamp,provider,model,application,input,output,cached,latency\n2026-11-01,OpenAI,GPT-6.1 Sol,Actual usage,123,10,0,500";
  await page
    .getByLabel("Usage file")
    .setInputFiles({
      name: "actual.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Load demo data", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: "Clear demo data", exact: true })
    .click();
  await expect(page.getByText("Local data", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("option", { name: "Actual usage", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "New project", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Project name", { exact: true }).fill("Empty");
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await page
    .getByRole("button", { name: "Load demo data", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Clear demo data", exact: true })
    .click();
  await expect(
    page.getByText("This project has no usage data yet."),
  ).toBeVisible();
});
