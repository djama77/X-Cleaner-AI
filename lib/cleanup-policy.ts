/**
 * X-Cleaner-AI — conservative cleanup policy.
 *
 * This module only builds a human-reviewed deletion plan. It does not call X,
 * hold credentials, or delete posts. A future X API adapter must re-check
 * ownership, permissions, and explicit approval immediately before each delete.
 */

export type CleanupPost = {
  id: string;
  text: string;
  createdAt?: string;
};

export type CleanupCandidate = CleanupPost & {
  matchedRule: "fllwrs" | "fillwrs";
  reason: string;
};

export type ApprovedDeletionPlan = {
  createdAt: string;
  postIds: string[];
  confirmationPhrase: string;
};

const RULES: Array<{ rule: CleanupCandidate["matchedRule"]; pattern: RegExp }> = [
  { rule: "fllwrs", pattern: /automatically checked by\s+(?:https?:\/\/)?(?:www\.)?fllwrs\.com\b/i },
  { rule: "fillwrs", pattern: /automatically checked by\s+(?:https?:\/\/)?(?:www\.)?fillwrs\.com\b/i },
];

export function findCleanupCandidates(posts: CleanupPost[]): CleanupCandidate[] {
  const seen = new Set<string>();
  const candidates: CleanupCandidate[] = [];

  for (const post of posts) {
    if (!post.id || seen.has(post.id)) continue;
    seen.add(post.id);

    // Deliberately narrow: only explicit legacy service markers qualify.
    const match = RULES.find(({ pattern }) => pattern.test(post.text));
    if (!match) continue;

    candidates.push({
      ...post,
      matchedRule: match.rule,
      reason: `Marqueur explicite de publication automatique : ${match.rule}.com`,
    });
  }

  return candidates;
}

/**
 * Creates a plan only from IDs explicitly checked by the user.
 * The UI must show the full post text/date and request a second confirmation.
 */
export function createApprovedDeletionPlan(
  visibleCandidates: CleanupCandidate[],
  selectedIds: string[],
  confirmationPhrase: string,
): ApprovedDeletionPlan {
  const requiredPhrase = "JE CONFIRME LA SUPPRESSION";
  if (confirmationPhrase !== requiredPhrase) {
    throw new Error("Confirmation explicite manquante.");
  }

  const allowedIds = new Set(visibleCandidates.map((post) => post.id));
  const uniqueSelected = [...new Set(selectedIds)];

  if (uniqueSelected.length === 0) {
    throw new Error("Aucune publication sélectionnée.");
  }
  if (uniqueSelected.some((id) => !allowedIds.has(id))) {
    throw new Error("La sélection contient une publication non candidate.");
  }

  return {
    createdAt: new Date().toISOString(),
    postIds: uniqueSelected,
    confirmationPhrase: requiredPhrase,
  };
}
