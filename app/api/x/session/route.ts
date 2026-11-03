import { NextResponse } from "next/server";
import { clearXSession, xFetch } from "@/lib/x-auth";
export const runtime = "nodejs";
export async function GET() {
  try { const data = await xFetch("/2/users/me?user.fields=profile_image_url"); return NextResponse.json({ connected: true, user: data.data }); }
  catch { return NextResponse.json({ connected: false }); }
}
export async function DELETE() { await clearXSession(); return NextResponse.json({ connected: false }); }
