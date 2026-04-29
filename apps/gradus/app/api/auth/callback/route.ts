import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  decodeIdToken,
  setSessionCookie,
  mapAzureRole,
  REDIRECT_URI,
} from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    console.error("Auth error:", error, searchParams.get("error_description"));
    return NextResponse.redirect(new URL("/auth/error", req.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/auth/error?reason=missing_params", req.url));
  }

  // Validate state (CSRF protection)
  const savedState = req.cookies.get("oauth_state")?.value;
  const codeVerifier = req.cookies.get("pkce_verifier")?.value;

  if (!savedState || savedState !== state || !codeVerifier) {
    return NextResponse.redirect(new URL("/auth/error?reason=invalid_state", req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code, codeVerifier, REDIRECT_URI);
    const idToken = decodeIdToken(tokens.id_token);

    const role = mapAzureRole(idToken.roles);

    // Redirigir según rol
    const destination = role === "COORDINATOR" ? "/coordinator" : "/student";
    const response = NextResponse.redirect(new URL(destination, req.url), { status: 302 });

    // Limpiar cookies PKCE
    response.cookies.delete("pkce_verifier");
    response.cookies.delete("oauth_state");

    // Setear las 3 cookies de sesión
    await setSessionCookie(
      {
        azureOid: idToken.oid,
        email: idToken.email ?? idToken.preferred_username ?? "",
        firstName: idToken.given_name ?? idToken.name?.split(" ")[0] ?? "",
        lastName: idToken.family_name ?? idToken.name?.split(" ").slice(1).join(" ") ?? "",
        role,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
      },
      response
    );

    return response;
  } catch (err) {
    console.error("Callback error:", err);
    return NextResponse.redirect(new URL("/auth/error", req.url));
  }
}