import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

// ── Azure AD config ───────────────────────────────────────────────────────────

const TENANT_ID = process.env.AZURE_TENANT_ID!
const CLIENT_ID = process.env.AZURE_CLIENT_ID!
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!
const SESSION_SECRET = process.env.SESSION_SECRET!

export const AZURE_AUTHORIZE_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`
export const AZURE_TOKEN_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`
export const AZURE_LOGOUT_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/logout`
export const REDIRECT_URI = `${APP_URL}/api/auth/callback`

export const SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  // Scope de la Gradus API — hace que Azure AD emita el access_token para la API,
  // no para Microsoft Graph. El token resultante tendrá:
  //   aud = "api://47ab77cc-9160-45a5-b4a0-dc52623cc325"
  //   roles = ["estudiante"] o ["coordinador"]
  `api://${process.env.NEXT_PUBLIC_GRADUS_API_CLIENT_ID}/.default`,
]

// ── PKCE helpers ──────────────────────────────────────────────────────────────

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest("SHA-256", encoded)
  return base64UrlEncode(new Uint8Array(digest))
}

function base64UrlEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

// ── Token exchange ────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string
  refresh_token: string
  id_token: string
  expires_in: number
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    scope: SCOPES.join(" "),
  })

  const res = await fetch(AZURE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  return res.json()
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
  })

  const res = await fetch(AZURE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!res.ok) throw new Error("Token refresh failed")
  return res.json()
}

// ── ID Token decode ───────────────────────────────────────────────────────────

export function decodeIdToken(token: string) {
  const [, payload] = token.split(".")
  return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
}

// ── Role mapping ──────────────────────────────────────────────────────────────

export function mapAzureRole(roles?: string[]): "STUDENT" | "COORDINATOR" {
  if (!roles) return "STUDENT"
  if (roles.includes("coordinador")) return "COORDINATOR"
  return "STUDENT"
}

// ── Session ───────────────────────────────────────────────────────────────────

export interface GradusSession {
  azureOid: string
  email: string
  firstName: string
  lastName: string
  role: "STUDENT" | "COORDINATOR"
  accessToken: string
  refreshToken?: string
  expiresAt: number // unix timestamp
}

export const SESSION_COOKIE_NAME = "gradus_session"
const secretKey = new TextEncoder().encode(SESSION_SECRET)

export async function createSession(
  session: Omit<GradusSession, "accessToken" | "refreshToken" | "expiresAt">
): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey)
}

export async function getSession(req?: NextRequest): Promise<GradusSession | null> {
  try {
    let token: string | undefined
    let accessToken: string | undefined
    let refreshToken: string | undefined

    if (req) {
      // Desde proxy.ts — lee del request
      token = req.cookies.get(SESSION_COOKIE_NAME)?.value
      accessToken = req.cookies.get("access_token")?.value
      refreshToken = req.cookies.get("refresh_token")?.value
    } else {
      // Desde Server Components — usa cookies() de next/headers
      const cookieStore = await cookies()
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value
      accessToken = cookieStore.get("access_token")?.value
      refreshToken = cookieStore.get("refresh_token")?.value
    }

    // Require all 3 cookies to be present
    if (!token || !accessToken || !refreshToken) return null

    const { payload } = await jwtVerify(token, secretKey)
    const session = payload as unknown as GradusSession
    session.accessToken = accessToken
    session.refreshToken = refreshToken

    // If access token is close to expiring, refresh it
    if (session.expiresAt - Date.now() / 1000 < 300) {
      try {
        const newTokens = await refreshAccessToken(session.refreshToken!)
        session.accessToken = newTokens.access_token
        session.refreshToken = newTokens.refresh_token
        session.expiresAt = Math.floor(Date.now() / 1000) + newTokens.expires_in
      } catch {
        return null
      }
    }

    return session
  } catch {
    return null
  }
}

export async function setSessionCookie(
  session: GradusSession,
  res?: NextResponse
): Promise<void> {
  const { accessToken, refreshToken, ...userInfo } = session
  const token = await createSession(userInfo)

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 8, // 8 horas
    path: "/",
  }

  if (res) {
    res.cookies.set(SESSION_COOKIE_NAME, token, cookieOptions)
    res.cookies.set("access_token", accessToken, cookieOptions)
    res.cookies.set("refresh_token", refreshToken ?? "", cookieOptions)
  } else {
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, token, cookieOptions)
    cookieStore.set("access_token", accessToken, cookieOptions)
    cookieStore.set("refresh_token", refreshToken ?? "", cookieOptions)
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  cookieStore.delete("access_token")
  cookieStore.delete("refresh_token")
}
