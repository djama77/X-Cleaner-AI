const CUTOFF = Date.parse("2023-01-01T00:00:00.000Z");
export function isEligibleOldPost(post, authenticatedUserId) {
  if (!post || typeof post.id !== "string" || !/^\d{1,30}$/.test(post.id)) return false;
  if (!authenticatedUserId || post.author_id !== authenticatedUserId) return false;
  if (typeof post.created_at !== "string") return false;
  const createdAt = Date.parse(post.created_at);
  return Number.isFinite(createdAt) && createdAt < CUTOFF;
}
export function filterEligibleOldPosts(posts, authenticatedUserId) {
  return posts.filter(post => isEligibleOldPost(post, authenticatedUserId));
}
