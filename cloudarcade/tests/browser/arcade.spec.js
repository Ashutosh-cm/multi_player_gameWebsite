import { test, expect } from "@playwright/test";
test("guest can browse, finish Snake, and retain achievements after refresh", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Your next high score/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Try as a guest" }).click();
  await expect(page.getByRole("heading", { name: /Hey, Guest/ })).toBeVisible();
  await page
    .getByRole("link", { name: /Neon Snake Arcade|Arcade.*Neon Snake/ })
    .click();
  await page.getByRole("button", { name: "Start game", exact: true }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "That’s a wrap." }),
  ).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/Result saved/)).toBeVisible();
  await page.goto("/achievements");
  await expect(page.locator(".badge.unlocked")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".badge.unlocked")).toHaveCount(1);
  expect(errors).toEqual([]);
});
test("2048 saves, resumes and finishes without duplicate results", async ({
  page,
}) => {
  await page.goto("/play/2048");
  await page.getByRole("button", { name: "Start game", exact: true }).click();
  for (const key of ["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"])
    await page.keyboard.press(key);
  const tiles = await page.locator(".tile").allTextContents();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Puzzle saved");
  await page.goto("/play/2048");
  await page.getByRole("button", { name: "Continue saved puzzle" }).click();
  await expect(page.locator(".tile")).toHaveText(tiles);
  await page.getByRole("button", { name: "Finish run" }).click();
  await expect(page.getByText(/Result saved/)).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cloudarcade-guest-v1")),
  );
  expect(stored.sessions).toHaveLength(1);
  expect(stored.progress).toBeNull();
});
test("library filtering, profile editing, restricted admin and mobile navigation", async ({
  page,
}) => {
  await page.goto("/library");
  await page.getByRole("button", { name: "Puzzle", exact: true }).click();
  await expect(page.locator(".game-card")).toHaveCount(1);
  await page.getByRole("textbox", { name: "Search games" }).fill("missing");
  await expect(
    page.getByText("No games match. Try another search."),
  ).toBeVisible();
  await page.goto("/profile");
  await page.getByLabel("Display name").fill("Arcade Tester");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(
    page.getByRole("heading", { name: "Arcade Tester", exact: true }),
  ).toBeVisible();
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Administrator access required" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("link", { name: "Game library" }).click();
  await expect(
    page.getByRole("heading", { name: "The game library" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("shooter renders, pauses, restarts and saves game over", async ({
  page,
}) => {
  await page.goto("/play/shooter");
  await page.getByRole("button", { name: "Start game", exact: true }).click();
  await page.keyboard.down("Space");
  await page.waitForTimeout(1000);
  await page.keyboard.up("Space");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Take a breather." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resume game" }).click();
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(page.getByText("Now playing", { exact: true })).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "That’s a wrap." }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Result saved/)).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("cloudarcade-guest-v1")),
  );
  expect(stored.sessions).toHaveLength(1);
  expect(stored.sessions[0].game_id).toBe("shooter");
});
