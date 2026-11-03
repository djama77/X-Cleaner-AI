import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../lib/cleanup-policy.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const policy = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("detects only explicit fllwrs/fillwrs markers", () => {
  const result = policy.findCleanupCandidates([
    { id: "1", text: "Automatically checked by fllwrs.com" },
    { id: "2", text: "automatically checked by https://www.fillwrs.com" },
    { id: "3", text: "A personal post" },
    { id: "4", text: "mentions fllwrs.com without the exact marker" },
  ]);
  assert.deepEqual(result.map((post) => post.id), ["1", "2"]);
  assert.equal(result[0].matchedRule, "fllwrs");
  assert.equal(result[1].matchedRule, "fillwrs");
});

test("ignores duplicate IDs and empty IDs", () => {
  const result = policy.findCleanupCandidates([
    { id: "x", text: "Automatically checked by fllwrs.com" },
    { id: "x", text: "Automatically checked by fillwrs.com" },
    { id: "", text: "Automatically checked by fllwrs.com" },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].matchedRule, "fllwrs");
});

test("requires the exact confirmation phrase", () => {
  const candidates = policy.findCleanupCandidates([
    { id: "1", text: "Automatically checked by fllwrs.com" },
  ]);
  assert.throws(
    () => policy.createApprovedDeletionPlan(candidates, ["1"], "yes"),
    /Confirmation explicite manquante/,
  );
});

test("rejects empty or non-candidate selections", () => {
  const candidates = policy.findCleanupCandidates([
    { id: "1", text: "Automatically checked by fllwrs.com" },
  ]);
  assert.throws(
    () => policy.createApprovedDeletionPlan(candidates, [], "JE CONFIRME LA SUPPRESSION"),
    /Aucune publication sélectionnée/,
  );
  assert.throws(
    () => policy.createApprovedDeletionPlan(candidates, ["999"], "JE CONFIRME LA SUPPRESSION"),
    /publication non candidate/,
  );
});

test("deduplicates selected IDs and creates a review plan only", () => {
  const candidates = policy.findCleanupCandidates([
    { id: "1", text: "Automatically checked by fllwrs.com" },
  ]);
  const plan = policy.createApprovedDeletionPlan(
    candidates,
    ["1", "1"],
    "JE CONFIRME LA SUPPRESSION",
  );
  assert.deepEqual(plan.postIds, ["1"]);
  assert.equal(plan.confirmationPhrase, "JE CONFIRME LA SUPPRESSION");
  assert.ok(Number.isFinite(Date.parse(plan.createdAt)));
  assert.equal("deleted" in plan, false);
});
