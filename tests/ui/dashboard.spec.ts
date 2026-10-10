import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const review = path.resolve(".impeccable/review");
test.beforeAll(() => fs.mkdirSync(review, { recursive: true }));
test.beforeEach(async ({ request }) => {
  await request.post("/api/control", { data: { action: "pause" } });
  await request.post("/api/control", { data: { action: "reset" } });
  await expect
    .poll(
      async () =>
        (await (await request.get("/api/state")).json()).metrics.ticks,
    )
    .toBe(0);
  await request.post("/api/control", { data: { preset: "steady" } });
});

test("desktop live controls, forecasts, fault events, and exports", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Start experiment", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "5×", exact: true }).click();
  await page
    .getByRole("button", { name: "Start experiment", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await expect
    .poll(
      async () =>
        (await (await request.get("/api/state")).json()).metrics.suppressed,
    )
    .toBeGreaterThan(4);
  const packet = await page
    .locator("[data-packet-tick]")
    .last()
    .getAttribute("data-packet-tick");
  expect(packet).not.toBeNull();
  await page.waitForTimeout(800); // Four new ticks at 5x must not truncate a one-second journey.
  await expect(page.locator(`[data-packet-tick="${packet}"]`)).toHaveCount(1);
  await page.getByRole("switch", { name: "Heating", exact: true }).click();
  await expect(
    page.getByRole("switch", { name: "Heating", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page.getByRole("slider", { name: "Randomness", exact: true }).focus();
  await page
    .getByRole("slider", { name: "Randomness", exact: true })
    .press("End");
  await expect
    .poll(
      async () =>
        (await (await request.get("/api/state")).json()).config.randomness,
    )
    .toBe(1);
  await page
    .getByRole("button", { name: "Vibration spike", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await (await request.get("/api/state")).json()).metrics
          .events_delivered,
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  const ticks = (await (await request.get("/api/state")).json()).metrics.ticks;
  await page.getByRole("button", { name: "Vibration", exact: true }).click();
  await page.getByRole("button", { name: "Show exact readings" }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("button", { name: "Hide exact readings" }).click();
  await page.getByRole("button", { name: "Toggle error window" }).click();
  await expect(
    page.getByRole("button", { name: "Toggle error window" }),
  ).toHaveText("Last 30 readings · switch window");
  await expect
    .poll(
      async () =>
        (await (await request.get("/api/state")).json()).metrics.ticks,
    )
    .toBe(ticks);
  const report = await request.get("/api/export/json");
  expect(report.ok()).toBeTruthy();
  const exported = await report.json();
  expect(exported.samples.length).toBe(exported.snapshot.metrics.ticks);
  expect(exported.snapshot.metrics.events_expected).toBe(
    exported.snapshot.metrics.events_delivered,
  );
  await page.screenshot({
    path: path.join(review, "desktop.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});

test("mobile controls, keyboard input, reduced motion, and offline assets", async ({
  page,
  request,
}) => {
  const external: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
      external.push(url.href);
      return route.abort();
    }
    return route.continue();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Shape the signal" }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Motion", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "5×", exact: true }).click();
  await page
    .getByRole("button", { name: "Start experiment", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await (await request.get("/api/state")).json()).metrics.ticks,
    )
    .toBeGreaterThan(12);
  await page.getByRole("button", { name: "Variable", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await (await request.get("/api/state")).json()).config.randomness,
    )
    .toBe(0.85);
  await page.getByRole("slider", { name: "Operating load" }).focus();
  await page.getByRole("slider", { name: "Operating load" }).press("Home");
  await expect
    .poll(
      async () => (await (await request.get("/api/state")).json()).config.load,
    )
    .toBe(0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect(
    await page.evaluate(
      () =>
        document.fonts.check("12px Manrope") &&
        document.fonts.check('12px "IBM Plex Mono"'),
    ),
  ).toBeTruthy();
  expect(external).toEqual([]);
  const axisLabels = await page
    .locator(".recharts-yAxis .recharts-cartesian-axis-tick-value")
    .allTextContents();
  expect(new Set(axisLabels).size).toBe(axisLabels.length);
  await page.screenshot({
    path: path.join(review, "mobile.png"),
    fullPage: true,
  });
});

test("benchmark errors can retry and disconnected readings are visibly stale", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  let dashboardSocket: import("@playwright/test").WebSocketRoute | undefined;
  let disconnected = false;
  await page.routeWebSocket("**/ws/dashboard", (socket) => {
    if (disconnected) {
      socket.close();
      return;
    }
    dashboardSocket = socket;
    socket.connectToServer();
  });
  await page.goto("/");
  await page.getByRole("button", { name: "5×", exact: true }).click();
  await page
    .getByRole("button", { name: "Start experiment", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await (await request.get("/api/state")).json()).metrics.ticks,
    )
    .toBeGreaterThan(10);
  await page.route("**/api/report", (route) =>
    route.fulfill({ status: 503, json: { detail: "Unavailable" } }),
  );
  await page.getByRole("button", { name: "View benchmark" }).click();
  await expect(page.getByRole("alert")).toContainText("Benchmark unavailable");
  await page.screenshot({
    path: path.join(review, "benchmark-error.png"),
    fullPage: true,
  });
  await page.unroute("**/api/report");
  await page.getByRole("button", { name: "Retry benchmark" }).click();
  await expect(
    page.getByRole("heading", { name: "Held-out model comparison" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hide benchmark" }).click();
  disconnected = true;
  dashboardSocket!.close();
  await expect(page.getByText("Stale · live feed unavailable")).toBeVisible();
  await expect(page.locator("[data-packet-tick]")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: path.join(review, "stale.png"),
    fullPage: true,
  });
  await request.post("/api/control", { data: { action: "pause" } });
});
