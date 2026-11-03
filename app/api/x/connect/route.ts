import { NextResponse } from "next/server";
import { challengeFor, randomState, randomVerifier, setOAuthCookies, xScopes } from "@/lib/x-auth";
export const runtime = "nodejs";
export async function GET() {
  const clientId = process.env.X_CLIENT_ID; const redirect = process.env.X_REDIRECT_URI;
  if (!clientId || !redirect) return NextResponse.json({ error: "Configurez X_CLIENT_ID et X_REDIRECT_URI dans Vercel." }, { status: 503 });
  const state = randomState(); const verifier = randomVerifier();
  await setOAuthCookies(state, verifier);
  const url = new URL("https://x.com/i/oauth2/authorize");
  url.search = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: redirect, scope: xScopes.join(" "), state, code_challenge: challengeFor(verifier), code_challenge_method: "S256" }).toString();
  return NextResponse.redirect(url);
}
