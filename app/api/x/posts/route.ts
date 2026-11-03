import { NextResponse } from "next/server";
import { xFetch } from "@/lib/x-auth";
export const runtime = "nodejs";
export async function GET() {
  try {
    const me = await xFetch("/2/users/me");
    const userId = me.data?.id;
    if (!userId) return NextResponse.json({ error: "Compte X introuvable." }, { status: 502 });
    const posts: Array<{id:string;text:string;created_at:string;author_id:string}> = [];
    let paginationToken = "";
    for (let page = 0; page < 32; page++) {
      const params = new URLSearchParams({ max_results: "100", "tweet.fields": "created_at,author_id", exclude: "retweets" });
      if (paginationToken) params.set("pagination_token", paginationToken);
      const data = await xFetch("/2/users/" + encodeURIComponent(userId) + "/tweets?" + params.toString());
      for (const p of data.data || []) posts.push({ id: p.id, text: p.text || "", created_at: p.created_at || "", author_id: p.author_id || userId });
      paginationToken = data.meta?.next_token || "";
      if (!paginationToken) break;
    }
    return NextResponse.json({ user: me.data, posts, limited: posts.length >= 3200, source: "X API timeline" });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Impossible de lire les publications X." }, { status: 502 }); }
}
