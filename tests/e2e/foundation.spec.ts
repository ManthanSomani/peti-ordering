import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";

async function login(page: Page, email = "sharma@peti.demo") {
  await page.goto("/");
  await page.getByLabel("Demo account email").fill(email);
  await page.getByRole("button", { name: "Get sign-in code" }).click();
  const code = await page.locator(".demo-code strong").textContent();
  await page.getByLabel("Six-digit code").fill(code!);
  await page.getByRole("button", { name: "Verify & sign in" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}
test("live model captures the assignment message", async ({ page }) => {
  test.skip(
    process.env.PETI_LIVE_CAPTURE !== "1",
    "Requires a running Ollama model",
  );
  test.setTimeout(90_000);
  await login(page);
  const before = await (await page.request.get("/api/orders")).json();
  await page.getByRole("link", { name: "Order from a message" }).click();
  await page
    .getByLabel("Paste the retailer's order message")
    .fill(
      "bhaiya 5 peti biscuit chhota, 2 peti washing powder 1 kilo, chai patti 250 wala 1 peti",
    );
  await page.getByRole("button", { name: "Read message" }).click();
  const biscuit = page.getByRole("group", { name: /biscuit chhota/i });
  const detergent = page.getByRole("group", { name: /washing powder/i });
  const tea = page.getByRole("group", { name: /chai patti/i });
  await expect(biscuit).toBeVisible({ timeout: 68_000 });
  await expect(biscuit.locator('option[value="SKU-BS-075"]')).toHaveText(
    /Suggested:/,
  );
  await expect(detergent.locator('option[value="SKU-DT-1KG"]')).toHaveText(
    /Suggested:/,
  );
  await expect(tea.locator('option[value="SKU-TE-250"]')).toHaveText(
    /Suggested:.*Out of stock/,
  );
  await expect(tea.locator('option[value="SKU-TE-250"]')).toBeDisabled();
  for (const [line, sku, cases] of [
    [biscuit, "SKU-BS-075", "5"],
    [detergent, "SKU-DT-1KG", "2"],
  ] as const) {
    await line.getByLabel("Choose product").selectOption(sku);
    await expect(
      line.getByRole("button", { name: "Add to cart" }),
    ).toBeDisabled();
    await line.getByLabel("Confirm whole cases").fill(cases);
    await line.getByRole("button", { name: "Add to cart" }).click();
  }
  await page.getByRole("link", { name: "Review cart" }).click();
  await expect(
    page.getByRole("button", { name: "Confirm & place order" }),
  ).toBeEnabled();
  const after = await (await page.request.get("/api/orders")).json();
  expect(after.total).toBe(before.total);
});

test("capture requires review before adding an order line to the cart", async ({
  page,
}) => {
  await login(page);
  const catalogue = await page.request.get("/api/catalogue");
  const { items } = await catalogue.json();
  const biscuit = items.find((p: { id: string }) => p.id === "SKU-BS-075");
  await page.route("**/api/capture", (route) =>
    route.fulfill({
      json: {
        products: items,
        lines: [
          {
            source: "5 peti biscuit chhota",
            candidates: [biscuit],
            quantity: 5,
            unit: "unknown",
            confidence: "low",
          },
        ],
      },
    }),
  );
  await page.getByRole("link", { name: "Order from a message" }).click();
  await page
    .getByLabel("Paste the retailer's order message")
    .fill("5 peti biscuit chhota");
  await page.getByRole("button", { name: "Read message" }).click();
  const add = page.getByRole("button", { name: "Add to cart" });
  await expect(add).toBeDisabled();
  await page.getByLabel("Choose product").selectOption("SKU-BS-075");
  await expect(add).toBeDisabled();
  await page.getByLabel("Confirm whole cases").fill("5");
  await add.click();
  await page.getByRole("link", { name: "Review cart" }).click();
  await expect(
    page.getByRole("button", { name: "Confirm & place order" }),
  ).toBeEnabled();
});

test("cold mobile catalogue benchmark", async ({ page }) => {
  test.skip(process.env.PETI_PERF !== "1", "Opt-in network benchmark");
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page);
  const session = await page.context().newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
  await session.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 400,
    downloadThroughput: 400_000 / 8,
    uploadThroughput: 400_000 / 8,
  });
  const timings: number[] = [];
  for (let run = 0; run < 3; run++) {
    await page.goto("/catalogue", { waitUntil: "commit" });
    await expect(
      page.getByRole("button", {
        name: "Add case: Glucose biscuits 75 g",
        exact: true,
      }),
    ).toBeEnabled({ timeout: 15_000 });
    timings.push(Math.round(await page.evaluate(() => performance.now())));
  }
  console.log("Cold catalogue to enabled add button (ms):", timings.join(", "));
});

test("mobile order with schemes reaches desktop desk and exports", async ({
  page,
  browser,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await login(page);
  await page
    .getByRole("button", {
      name: "Add case: Glucose biscuits 75 g",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Add case: Detergent powder 1 kg",
      exact: true,
    })
    .click();
  await page.getByRole("link", { name: "Review order" }).click();
  await page.locator("#qty-SKU-BS-075").fill("10");
  await page.locator("#qty-SKU-DT-1KG").fill("5");
  await expect(page.locator(".cart-summary")).toContainText("₹304.50");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Confirm & place order" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Confirm & place order" }).click();
  await expect(page.getByText("Order received by the desk.")).toBeVisible();
  const url = page.url();
  const id = await page.getByRole("heading", { level: 1 }).textContent();
  const context = await browser.newContext();
  const office = await context.newPage();
  await login(office, "desk@peti.demo");
  await office.getByRole("link", { name: id!, exact: true }).click();
  await office.getByRole("button", { name: "Start processing" }).click();
  await expect(
    office.getByRole("button", { name: "Mark as packed" }),
  ).toBeVisible();
  await office.getByRole("button", { name: "Mark as packed" }).click();
  await expect(office.locator(".page-heading .status")).toHaveText("Packed");
  const downloadEvent = office.waitForEvent("download");
  await office.getByRole("button", { name: "Download export CSV" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe(`peti-${id}-tally-staging.csv`);
  const exportPath = new URL(`${url}/export`);
  exportPath.pathname = "/api" + exportPath.pathname;
  const csv = await (await office.request.get(exportPath.href)).text();
  expect(csv).toContain('"SKU-BS-075"');
  expect(csv).toContain('"SKU-DT-1KG"');
  expect((await page.request.get(exportPath.href)).status()).toBe(403);
  await page.goto(url);
  await expect(page.locator(".page-heading .status")).toHaveText("Packed");
  await context.close();
});
test("catalogue states, failure recovery, responsive Hindi and accessibility", async ({
  page,
}) => {
  mkdirSync("artifacts", { recursive: true });
  await login(page);
  await expect(
    page.getByRole("button", {
      name: "Add case: Tea leaves 250 g",
      exact: true,
    }),
  ).toBeDisabled();
  await page.screenshot({
    path: "artifacts/catalogue-desktop.png",
    fullPage: true,
  });
  const issues = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(issues.violations).toEqual([]);
  await page
    .getByRole("textbox", { name: "Search products, brands or SKU" })
    .fill("nothing-matches");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No products found" }),
  ).toBeVisible();
  await page
    .locator(".empty-state")
    .getByRole("button", { name: "Clear filters" })
    .click();
  await page.route("**/api/catalogue?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ code: "SERVER_ERROR", error: "unavailable" }),
    }),
  );
  await page.getByRole("button", { name: "Home care", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.unroute("**/api/catalogue?*");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "Laundry soap" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "All products", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "हिन्दी", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "स्टॉक भरें। काम बढ़ाएँ।" }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/catalogue-mobile-hi.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const hiIssues = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(hiIssues.violations).toEqual([]);
});
test("sign-in validation, keyboard access, wrong code and logout", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Demo account email").fill("bad");
  await page.getByRole("button", { name: "Get sign-in code" }).click();
  await expect(page.getByLabel("Demo account email")).toBeFocused();
  await expect(
    page.getByText("Enter a valid demo email address."),
  ).toBeVisible();
  await page.getByLabel("Demo account email").fill("sharma@peti.demo");
  await page.getByLabel("Demo account email").press("Enter");
  const code = await page.locator(".demo-code strong").textContent();
  await page
    .getByLabel("Six-digit code")
    .fill(code === "111111" ? "222222" : "111111");
  await page.getByRole("button", { name: "Verify & sign in" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Six-digit code").fill(code!);
  await page.getByLabel("Six-digit code").press("Enter");
  await expect(
    page.getByRole("heading", { name: "Stock up. Keep moving." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome to Peti" }),
  ).toBeVisible();
});
