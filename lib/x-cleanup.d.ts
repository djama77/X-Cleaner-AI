export type XPostForCleanup = { id: string; author_id?: string; created_at?: string };
export function isEligibleOldPost(post: XPostForCleanup, authenticatedUserId: string): boolean;
export function filterEligibleOldPosts<T extends XPostForCleanup>(posts: T[], authenticatedUserId: string): T[];
