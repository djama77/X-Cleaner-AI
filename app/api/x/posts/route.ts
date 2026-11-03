import { NextRequest, NextResponse } from "next/server";
import { xFetch } from "@/lib/x-auth";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  try {
    const me = await xFetch("/2/users/me");
    const userId = me.data?.id;
    if (!userId) return NextResponse.json({ error: "Compte X introuvable." }, { status: 502 });
    const cursor = request.nextUrl.searchParams.get("cursor");
    const params = new URLSearchParams({ max_results: "100", "tweet.fields": "created_at,author_id", exclude: "retweets" });
    if (cursor) params.set("pagination_token", cursor);
    const data = await xFetch("/2/users/" + encodeURIComponent(userId) + "/tweets?" + params.toString());
    const posts = (data.data || []).map((p: {id:string;text?:string;created_at?:string;author_id?:string}) => ({
      id: p.id, text: p.text || "", created_at: p.created_at || "", author_id: p.author_id || userId
    }));
    return NextResponse.json({ user: me.data, posts, nextToken: data.meta?.next_token || null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossible de lire les publications X." }, { status: 502 });
  }
}
