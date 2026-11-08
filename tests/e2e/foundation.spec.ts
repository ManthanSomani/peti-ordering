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
test("manual order with schemes reaches desk and moves to packed", async ({
  page,
  browser,
}) => {
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
