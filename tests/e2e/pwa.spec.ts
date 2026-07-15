import { expect, test } from "@playwright/test";
import { prepareApp } from "./fixtures";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "One production Chromium pass is sufficient for PWA installation and caching.");
  await prepareApp(page);
});

async function waitForServiceWorkerControl(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
}

test("production build exposes an installable manifest and active service worker", async ({ page }) => {
  await page.goto("/");
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(manifestHref).toBeTruthy();

  const manifestResponse = await page.request.get(manifestHref!);
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    name: "ISTQB CTFL v4.0 Trainer",
    short_name: "CTFL Trainer",
    display: "standalone",
    start_url: "./",
    scope: "./",
  });
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ src: "icons/icon-192.png", sizes: "192x192" }),
    expect.objectContaining({ src: "icons/icon-512.png", sizes: "512x512" }),
    expect.objectContaining({ src: "icons/icon-maskable-512.png", purpose: "maskable" }),
  ]));

  for (const icon of manifest.icons) {
    const response = await page.request.get(new URL(icon.src, manifestResponse.url()).toString());
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/png");
  }

  await waitForServiceWorkerControl(page);
  const cachedPaths = await page.evaluate(async () => {
    const requests = await Promise.all((await caches.keys()).map(async (cacheName) => caches.open(cacheName).then((cache) => cache.keys())));
    return requests.flat().map((request) => new URL(request.url).pathname);
  });
  expect(cachedPaths).toContain("/index.html");
  expect(cachedPaths).toContain("/question-assets/a-14.png");
});

test("practice, graphics and progress remain usable offline", async ({ page, context }) => {
  await page.goto("/#/practice");
  await waitForServiceWorkerControl(page);
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.locator(".feedback")).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const raw = window.localStorage.getItem("istqb-ctfl-v4-trainer:v2") ?? "";
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.questionProgress?.["A-01"]?.attempts ?? 0;
  })).toBe(1);
  const exportedProgress = await page.evaluate(() => window.localStorage.getItem("istqb-ctfl-v4-trainer:v2") ?? "");

  await context.setOffline(true);
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Single questions" })).toBeVisible();
  await expect(page.locator(".feedback")).toBeVisible();

  await page.getByRole("textbox", { name: "Search text, LO or topic" }).fill("A-14");
  const visual = page.locator(".question-visual img");
  await expect(visual).toBeVisible();
  expect(await visual.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);

  await page.locator('input[type="file"]').setInputFiles({
    name: "offline-progress.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportedProgress),
  });
  await expect(page.locator(".file-status")).toHaveText("Progress imported successfully.");
});
