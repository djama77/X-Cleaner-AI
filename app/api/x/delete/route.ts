import { NextRequest, NextResponse } from "next/server";
import { xFetch } from "@/lib/x-auth";
import { filterEligibleOldPosts } from "@/lib/x-cleanup";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body?.confirm !== "DELETE_OLD_X_POSTS_BEFORE_2023" || !Array.isArray(body.ids) || body.ids.length < 1 || body.ids.length > 10) {
      return NextResponse.json({ error: "Confirmation requise et lot limité à 10 publications." }, { status: 400 });
    }
    const me = await xFetch("/2/users/me");
    if (!me.data?.id) return NextResponse.json({ error: "Compte X non identifié." }, { status: 401 });
    const ids = [...new Set(body.ids.filter((id: unknown) => typeof id === "string" && /^\\d{1,30}$/.test(id)))];
    if (!ids.length) return NextResponse.json({ error: "Aucun identifiant valide." }, { status: 400 });
    const lookup = await xFetch("/2/tweets?ids=" + ids.join(",") + "&tweet.fields=created_at,author_id");
    const eligible = filterEligibleOldPosts(lookup.data || [], me.data.id);
    const results = [];
    for (const post of eligible) {
      try {
        const result = await xFetch("/2/tweets/" + encodeURIComponent(post.id), { method: "DELETE" });
        results.push({ id: post.id, deleted: result.data?.deleted === true });
      } catch { results.push({ id: post.id, deleted: false }); }
    }
    return NextResponse.json({ checked: ids.length, eligible: eligible.length, results, rejected: ids.length - eligible.length });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Suppression impossible." }, { status: 502 });
  }
}
