import { test, expect } from "@playwright/test";

test.describe("Kraken CNA System E2E Suite", () => {
  test("should authenticate and display the main dashboard shell", async ({ page }) => {
    // 1. Visit Login Page
    await page.goto("http://localhost:3000/login");
    
    // Verify title
    await expect(page.locator("h1")).toContainText("KRAKEN CNA SECURITY CONTROL");

    // 2. Perform Login
    await page.fill('input[placeholder="e.g. investigator@agency.gov.in"]', "investigator@agency.gov.in");
    await page.fill('input[placeholder="Enter 4-character ID Code..."]', "7777");
    await page.click('button:has-text("Authenticate Credentials")');

    // 3. Verify successful redirection and persistent banner presence
    await page.waitForURL("http://localhost:3000/");
    await expect(page.locator("body")).toContainText("DEMONSTRATION SYSTEM — SYNTHETIC DATA ONLY");

    // 4. Verify sidebar navigation links
    await expect(page.locator("aside")).toContainText("Cases");
    await expect(page.locator("aside")).toContainText("Network Graph");
    await expect(page.locator("aside")).toContainText("Data Ingestion");
  });

  test("should render the Network Graph Canvas", async ({ page }) => {
    // Authenticate first
    await page.goto("http://localhost:3000/login");
    await page.fill('input[placeholder="e.g. investigator@agency.gov.in"]', "investigator@agency.gov.in");
    await page.fill('input[placeholder="Enter 4-character ID Code..."]', "7777");
    await page.click('button:has-text("Authenticate Credentials")');

    // Go to Graph Page
    await page.goto("http://localhost:3000/graph");
    
    // Check main title
    await expect(page.locator("h1")).toContainText("Network Graph Centerpiece");
  });

  test("should render the Ingestion Wizard form fields", async ({ page }) => {
    // Authenticate first
    await page.goto("http://localhost:3000/login");
    await page.fill('input[placeholder="e.g. investigator@agency.gov.in"]', "investigator@agency.gov.in");
    await page.fill('input[placeholder="Enter 4-character ID Code..."]', "7777");
    await page.click('button:has-text("Authenticate Credentials")');

    // Go to Ingestion Page
    await page.goto("http://localhost:3000/ingestion");
    
    // Check main title and form inputs
    await expect(page.locator("h1")).toContainText("Data Ingestion Wizard");
    await expect(page.locator("textarea")).toBeVisible();
  });
});
