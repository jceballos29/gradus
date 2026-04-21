import { UserRole } from "@/app/generated/prisma/enums";
import { SignJWT, jwtVerify, createRemoteJWKSet } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";


// ── Azure AD config ───────────────────────────────────────

const TENANT_ID = process.env.AZURE_TENANT_ID!;
const CLIENT_ID = process.env.AZURE_CLIENT_ID!;
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const SESSION_SECRET = process.env.SESSION_SECRET!;

export const AZURE_AUTHORIZE_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`;
export const AZURE_TOKEN_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
export const AZURE_LOGOUT_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/logout`;
export const REDIRECT_URI = `${APP_URL}/api/auth/callback`;

export const SCOPES = ["openid", "profile", "email", "offline_access"];

// ── PKCE helpers ──────────────────────────────────────────

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// ── Token exchange ────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
    scope: SCOPES.join(" "),
  });

  const res = await fetch(AZURE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return res.json();
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
    scope: SCOPES.join(" "),
  });

  const res = await fetch(AZURE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) throw new Error("Token refresh failed");
  return res.json();
}

// ── Role mapping ──────────────────────────────────────────

export function mapAzureRoleToDbRole(azureRole: string): UserRole {
  const map: Record<string, UserRole> = {
    estudiante: UserRole.STUDENT,
    coordinador: UserRole.COORDINATOR,
  };
  return map[azureRole] ?? UserRole.STUDENT;
}

// ── Session ───────────────────────────────────────────────

export interface Session {
  userId: string;
  identity: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix timestamp
}

export const SESSION_COOKIE = "universitas_session";
const secretKey = new TextEncoder().encode(SESSION_SECRET);

export async function createSession(session: Omit<Session, "accessToken" | "refreshToken">): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function getSession(req?: NextRequest): Promise<Session | null> {
  try {
    let token: string | undefined;
    let accessToken: string | undefined;
    let refreshToken: string | undefined;
    
    if (req) {
      token = req.cookies.get(SESSION_COOKIE)?.value;
      accessToken = req.cookies.get("access_token")?.value;
      refreshToken = req.cookies.get("refresh_token")?.value;
    } else {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE)?.value;
      accessToken = cookieStore.get("access_token")?.value;
      refreshToken = cookieStore.get("refresh_token")?.value;
    }

    if (!token || !accessToken || !refreshToken) return null;

    const { payload } = await jwtVerify(token, secretKey);

    // If access token is close to expiring, refresh it
    const session = payload as unknown as Session;
    session.accessToken = accessToken;
    session.refreshToken = refreshToken;
    if (session.expiresAt - Date.now() / 1000 < 300) {
      try {
        const newTokens = await refreshAccessToken(session.refreshToken);
        session.accessToken = newTokens.access_token;
        session.refreshToken = newTokens.refresh_token;
        session.expiresAt = Math.floor(Date.now() / 1000) + newTokens.expires_in;
      } catch {
        return null;
      }
    }

    return session;
  } catch {
    return null;
  }
}

export async function setSessionCookie(session: Session, res?: NextResponse): Promise<void> {
  const { accessToken, refreshToken, ...userInfo } = session;
  const token = await createSession(userInfo);
  
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  };

  if (res) {
    res.cookies.set(SESSION_COOKIE, token, cookieOptions);
    res.cookies.set("access_token", accessToken, cookieOptions);
    res.cookies.set("refresh_token", refreshToken, cookieOptions);
  } else {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, cookieOptions);
    cookieStore.set("access_token", accessToken, cookieOptions);
    cookieStore.set("refresh_token", refreshToken, cookieOptions);
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
}

// ── M2M token validator (used in /api/m2m routes) ────────

const JWKS = createRemoteJWKSet(
  new URL(
    `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`
  )
);

export async function validateM2MToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
      audience: process.env.GRADUS_API_CLIENT_ID!, // 47ab77cc-9160-45a5-b4a0-dc52623cc325
    });

    const appId = payload["azp"] as string;
    const expectedAppId = process.env.GRADUS_API_CLIENT_ID;

    if (appId !== expectedAppId) {
      return { 
        success: false as const, 
        error: `Unauthorized — appid does not match gradus-api. Received: ${appId}, Expected: ${expectedAppId}` 
      };
    }

    return { success: true as const, payload };
  } catch (error: any) {
    return { 
      success: false as const, 
      error: error?.message || "Token verification failed",
      code: error?.code || "VERIFICATION_FAILED"
    };
  }
}