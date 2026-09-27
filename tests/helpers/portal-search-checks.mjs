import assert from "node:assert/strict";

export const searchFixtures = {
  portal_artists: [
    { id: "artist-a", name: "Alpha Artist", label_id: null },
    { id: "artist-b", name: "Beta Artist", label_id: null },
  ],
  portal_labels: [{ id: "label-a", name: "Parasens" }],
  portal_artist_genres: [],
  portal_accounts: [
    { email: "alpha@example.com", display_name: "Alpha Account", user_id: "account-a", invitation_status: "sent" },
    { email: "beta@example.com", display_name: "Beta Account", user_id: "account-b", invitation_status: "sent" },
  ],
  portal_artist_members: [],
  portal_releases: [],
};

export async function checkPortalSearch({ contextFor, base, owner, artist, screenshots }) {
  const context = await contextFor(owner);
  const page = await context.newPage();
  const writes = [], errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.method() === "POST" && !request.url().endsWith("music_admin_role")) writes.push(request.url());
  });
  const combo = (label) => page.getByRole("combobox", { name: label, exact: true });
  const option = (label) => page.getByRole("option", { name: label, exact: true });
  const selected = async (label, value) => assert.equal(await option(label).getAttribute("aria-checked"), value);

  await page.goto(base + "/portal/admin/artists");
  await combo("Search artists").fill("Artist");
  await combo("Search artists").press("ArrowDown");
  await combo("Search artists").press("Enter");
  assert.equal(await page.getByLabel("Artist name", { exact: true }).inputValue(), "Beta Artist");
  await combo("Artist label").fill("para");
  await combo("Artist label").press("Enter");
  assert.equal(await combo("Artist label").inputValue(), "Parasens");
  await combo("Search artist genres").fill("peace");
  await combo("Search artist genres").press("Enter");
  await selected("Piano → Peaceful Piano", "true");
  await combo("Search artist genres").press("Enter");
  await selected("Piano → Peaceful Piano", "false");
  await combo("Search accounts to assign").fill("Account");
  await combo("Search accounts to assign").press("ArrowDown");
  await combo("Search accounts to assign").press("Enter");
  await selected("Beta Account · beta@example.com", "true");
  await combo("Search accounts to assign").press("ArrowUp");
  await combo("Search accounts to assign").press("Enter");
  await selected("Alpha Account · alpha@example.com", "true");
  // Escape dismisses suggestions; Tab moves on without changing a selection.
  await combo("Search accounts to assign").press("Escape");
  assert.equal(await combo("Search accounts to assign").getAttribute("aria-expanded"), "false");
  await combo("Search accounts to assign").press("ArrowDown");
  await combo("Search accounts to assign").press("Tab");
  assert.equal(await combo("Search accounts to assign").getAttribute("aria-expanded"), "false");
  await page.screenshot({ path: screenshots + "/artist-search.png" });

  await page.goto(base + "/portal/admin/accounts");
  await combo("Search accounts").fill("Beta");
  await combo("Search accounts").press("Enter");
  await combo("Search artist assignments").fill("Artist");
  await combo("Search artist assignments").press("ArrowDown");
  await combo("Search artist assignments").press("Enter");
  await selected("Beta Artist", "true");
  // Changing the query resets the highlighted result, including after no matches.
  await combo("Search artist assignments").fill("no-result");
  await combo("Search artist assignments").press("Enter");
  assert.equal(await page.getByRole("option").count(), 0);
  await combo("Search artist assignments").fill("Alpha");
  await combo("Search artist assignments").press("Enter");
  await selected("Alpha Artist", "true");

  await page.goto(base + "/portal/music");
  await page.getByText("1500 songs ·", { exact: false }).waitFor();
  await combo("Search songs or artists").fill("New song 000");
  await combo("Search songs or artists").press("ArrowDown");
  await combo("Search songs or artists").press("Enter");
  assert.equal(await combo("Search songs or artists").inputValue(), "New song 0002");
  assert.equal(await page.locator("tbody tr").count(), 1);
  await page.getByRole("button", { name: "Genre or subgenre", exact: true }).focus();
  await page.getByRole("button", { name: "Genre or subgenre", exact: true }).press("ArrowDown");
  await combo("Search genre or subgenre").fill("peace");
  await combo("Search genre or subgenre").press("Enter");
  assert.match(await page.getByRole("button", { name: "Genre or subgenre", exact: true }).innerText(), /Peaceful Piano/);

  await page.goto(base + "/portal/admin/submissions");
  await page.getByRole("button", { name: "Submission status", exact: true }).click();
  await combo("Search submission status").fill("accept");
  await combo("Search submission status").press("Enter");
  assert.match(await page.getByRole("button", { name: "Submission status", exact: true }).innerText(), /Accepted/);
  assert.deepEqual(writes, [], "Searching and selecting must never submit a form");

  // The artist-facing screens use exactly the same keyboard path.
  const artistContext = await contextFor(artist);
  const artistPage = await artistContext.newPage();
  artistPage.on("pageerror", (error) => errors.push(error.message));
  artistPage.on("request", (request) => {
    if (request.method() === "POST" && !request.url().endsWith("music_admin_role")) writes.push(request.url());
  });
  await artistPage.goto(base + "/portal/dashboard");
  await artistPage.getByRole("button", { name: "Release status", exact: true }).click();
  const statusSearch = artistPage.getByRole("combobox", { name: "Search release status", exact: true });
  await statusSearch.fill("review");
  await statusSearch.press("Enter");
  assert.match(await artistPage.getByRole("button", { name: "Release status", exact: true }).innerText(), /In Review/);
  await artistPage.goto(base + "/portal/releases/new");
  await artistPage.getByRole("button", { name: "Primary artist", exact: true }).click();
  const artistSearch = artistPage.getByRole("combobox", { name: "Search primary artist", exact: true });
  await artistSearch.fill("a Artist");
  await artistSearch.press("ArrowDown");
  await artistSearch.press("Enter");
  assert.match(await artistPage.getByRole("button", { name: "Primary artist", exact: true }).innerText(), /Beta Artist/);
  await artistPage.getByRole("button", { name: "Release type", exact: true }).click();
  const typeSearch = artistPage.getByRole("combobox", { name: "Search release type", exact: true });
  await typeSearch.fill("Album");
  await typeSearch.press("Enter");
  assert.match(await artistPage.getByRole("button", { name: "Release type", exact: true }).innerText(), /Album/);
  await artistPage.setViewportSize({ width: 390, height: 844 });
  await artistPage.getByRole("button", { name: "Primary artist", exact: true }).click();
  await artistSearch.fill("Alpha");
  assert.equal(await artistPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  await artistPage.screenshot({ path: screenshots + "/artist-search-mobile.png", animations: "disabled" });
  const resultsBox = await artistPage.getByRole("listbox").boundingBox();
  assert.ok(resultsBox && resultsBox.x >= 0 && resultsBox.y >= 0 && resultsBox.x + resultsBox.width <= 390 && resultsBox.y + resultsBox.height <= 844, "Mobile search results must fit on screen");
  assert.deepEqual(writes, [], "Enter in artist selectors must not save or submit a release");
  assert.deepEqual(errors, []);
  console.log("Portal keyboard search passed: admin and artist pages, arrows, Enter, toggle, Escape, Tab, empty results, mobile and no accidental saves.");
  console.log("Screenshots: " + screenshots);
}
