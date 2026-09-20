import test from "node:test";
import assert from "node:assert/strict";
import { dropPosition } from "../src/lib/music/reorder.ts";
const ids = ["a", "b", "c", "d"];
test("drops above and below rows account for removing the source", () => {
  assert.equal(dropPosition(ids, "a", "c", "before"), 2);
  assert.equal(dropPosition(ids, "a", "c", "after"), 3);
  assert.equal(dropPosition(ids, "d", "b", "before"), 2);
  assert.equal(dropPosition(ids, "d", "b", "after"), 3);
  assert.equal(dropPosition(ids, "d", "a", "before"), 1);
  assert.equal(dropPosition(ids, "a", "d", "after"), 4);
});
test("cancelled, unchanged and stale drag targets cause no write", () => {
  assert.equal(dropPosition(ids, "a", "a", "after"), null);
  assert.equal(dropPosition(ids, "a", "b", "before"), null);
  assert.equal(dropPosition(ids, "b", "a", "after"), null);
  assert.equal(dropPosition(ids, "missing", "c", "before"), null);
  assert.equal(dropPosition(ids, "b", "missing", "after"), null);
});
test("drag destinations use full-list positions on later pages", () => {
  const many = Array.from({ length: 1500 }, (_, i) => String(i));
  assert.equal(dropPosition(many, "52", "50", "before"), 51);
  assert.equal(dropPosition(many, "50", "99", "after"), 100);
});
