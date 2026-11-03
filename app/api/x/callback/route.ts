import { NextRequest, NextResponse } from "next/server";
import { consumeOAuthCookies, exchangeCode } from "@/lib/x-auth";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");
  if (error) return NextResponse.redirect(new URL("/?x_error=authorization_refused", request.url));
  const code = request.nextUrl.searchParams.get("code"); const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) return NextResponse.redirect(new URL("/?x_error=missing_code", request.url));
  try { const verifier = await consumeOAuthCookies(state); await exchangeCode(code, verifier); return NextResponse.redirect(new URL("/?x_connected=1", request.url)); }
  catch { return NextResponse.redirect(new URL("/?x_error=oauth_failed", request.url)); }
}
