import test from "node:test";
import assert from "node:assert/strict";
import { isEligibleOldPost, filterEligibleOldPosts } from "../lib/x-cleanup.js";

const owner = "12345";
test("accepts an owned post strictly before 2023", () => {
  assert.equal(isEligibleOldPost({ id: "999", author_id: owner, created_at: "2022-12-31T23:59:59.000Z" }, owner), true);
});
test("rejects a post on or after the 2023 cutoff", () => {
  assert.equal(isEligibleOldPost({ id: "999", author_id: owner, created_at: "2023-01-01T00:00:00.000Z" }, owner), false);
  assert.equal(isEligibleOldPost({ id: "998", author_id: owner, created_at: "2024-02-01T00:00:00.000Z" }, owner), false);
});
test("rejects posts not owned by the authenticated account", () => {
  assert.equal(isEligibleOldPost({ id: "999", author_id: "other", created_at: "2020-01-01T00:00:00.000Z" }, owner), false);
});
test("rejects malformed ids and dates", () => {
  assert.equal(isEligibleOldPost({ id: "abc", author_id: owner, created_at: "2020-01-01" }, owner), false);
  assert.equal(isEligibleOldPost({ id: "999", author_id: owner, created_at: "not-a-date" }, owner), false);
});
test("filters a mixed list without changing newer or foreign posts", () => {
  const input = [
    { id: "1", author_id: owner, created_at: "2019-01-01T00:00:00Z" },
    { id: "2", author_id: owner, created_at: "2023-01-01T00:00:00Z" },
    { id: "3", author_id: "other", created_at: "2018-01-01T00:00:00Z" },
  ];
  assert.deepEqual(filterEligibleOldPosts(input, owner).map(p => p.id), ["1"]);
});
