import "server-only";
import { cookies } from "next/headers";
import { createCipheriv, createDecipheriv, randomBytes, createHash, timingSafeEqual } from "node:crypto";

const TOKEN_COOKIE = "x_session";
const STATE_COOKIE = "x_oauth_state";
const VERIFIER_COOKIE = "x_pkce_verifier";
const SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"];

type TokenSet = { access_token: string; refresh_token?: string; expires_at: number; token_type: string };
function key() {
  const raw = process.env.X_TOKEN_ENCRYPTION_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(raw)) throw new Error("X_TOKEN_ENCRYPTION_KEY doit contenir 64 caractères hexadécimaux.");
  return Buffer.from(raw, "hex");
}
function encrypt(value: TokenSet) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}
function decrypt(value: string): TokenSet {
  const raw = Buffer.from(value, "base64url");
  if (raw.length < 29) throw new Error("Session X invalide.");
  const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8")) as TokenSet;
}
export function randomVerifier() { return randomBytes(32).toString("base64url"); }
export function challengeFor(verifier: string) { return createHash("sha256").update(verifier).digest("base64url"); }
export function randomState() { return randomBytes(32).toString("base64url"); }
export async function setOAuthCookies(state: string, verifier: string) {
  const jar = await cookies();
  jar.set(STATE_COOKIE, state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  jar.set(VERIFIER_COOKIE, verifier, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
}
export async function consumeOAuthCookies(state: string) {
  const jar = await cookies(); const savedState = jar.get(STATE_COOKIE)?.value; const verifier = jar.get(VERIFIER_COOKIE)?.value;
  jar.delete(STATE_COOKIE); jar.delete(VERIFIER_COOKIE);
  if (!savedState || !verifier || savedState.length !== state.length || !timingSafeEqual(Buffer.from(savedState), Buffer.from(state))) throw new Error("État OAuth invalide. Recommencez la connexion.");
  return verifier;
}
export async function saveTokenSet(tokens: TokenSet) {
  const jar = await cookies();
  jar.set(TOKEN_COOKIE, encrypt(tokens), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}
export async function clearXSession() { (await cookies()).delete(TOKEN_COOKIE); }
async function tokenRequest(body: URLSearchParams) {
  const id = process.env.X_CLIENT_ID; const secret = process.env.X_CLIENT_SECRET;
  if (!id) throw new Error("X_CLIENT_ID n'est pas configuré.");
  const headers: Record<string,string> = { "Content-Type": "application/x-www-form-urlencoded" };
  if (secret) headers.Authorization = "Basic " + Buffer.from(id + ":" + secret).toString("base64");
  else body.set("client_id", id);
  const response = await fetch("https://api.x.com/2/oauth2/token", { method: "POST", headers, body, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error("X OAuth a refusé le renouvellement du jeton.");
  return data as { access_token: string; refresh_token?: string; expires_in: number; token_type: string };
}
export async function getAccessToken() {
  const jar = await cookies(); const stored = jar.get(TOKEN_COOKIE)?.value;
  if (!stored) throw new Error("Connectez d'abord votre compte X.");
  let tokens = decrypt(stored);
  if (tokens.expires_at > Date.now() + 60_000) return tokens.access_token;
  if (!tokens.refresh_token) { jar.delete(TOKEN_COOKIE); throw new Error("Session X expirée. Reconnectez votre compte."); }
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: tokens.refresh_token });
  const fresh = await tokenRequest(body);
  tokens = { access_token: fresh.access_token, refresh_token: fresh.refresh_token || tokens.refresh_token, expires_at: Date.now() + fresh.expires_in * 1000, token_type: fresh.token_type };
  await saveTokenSet(tokens);
  return tokens.access_token;
}
export async function exchangeCode(code: string, verifier: string) {
  const redirect = process.env.X_REDIRECT_URI;
  if (!redirect) throw new Error("X_REDIRECT_URI n'est pas configuré.");
  const body = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirect, code_verifier: verifier });
  const fresh = await tokenRequest(body);
  await saveTokenSet({ access_token: fresh.access_token, refresh_token: fresh.refresh_token, expires_at: Date.now() + fresh.expires_in * 1000, token_type: fresh.token_type });
}
export async function xFetch(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const response = await fetch("https://api.x.com" + path, { ...init, headers: { Authorization: "Bearer " + token, ...(init.headers || {}) }, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : typeof data?.title === "string" ? data.title : "Erreur lors de l'appel à l'API X.");
  return data;
}
export const xScopes = SCOPES;
