import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtDecode } from "jwt-decode"
import {
  exchangeCodeForTokens,
  setSessionCookie,
  mapAzureRoleToDbRole,
} from "@/lib/auth"
import prisma from "@/lib/prisma"
import { UserRole } from "@/app/generated/prisma/enums"

interface AzureIdToken {
  oid: string
  name?: string;   
  email?: string
  preferred_username?: string
  given_name?: string
  family_name?: string
  roles?: string[]
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, req.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/?error=missing_params", req.url))
  }

  // Validate state
  const cookieStore = await cookies()
  const savedState = cookieStore.get("oauth_state")?.value
  const codeVerifier = cookieStore.get("pkce_verifier")?.value

  if (!savedState || savedState !== state || !codeVerifier) {
    return NextResponse.redirect(new URL("/?error=invalid_state", req.url))
  }

  // Clean up PKCE cookies
  cookieStore.delete("oauth_state")
  cookieStore.delete("pkce_verifier")

  try {
    const tokens = await exchangeCodeForTokens(code, codeVerifier)
    const idToken = jwtDecode<AzureIdToken>(tokens.id_token)

    const azureOid = idToken.oid
    const email = idToken.email ?? idToken.preferred_username ?? ""
    const firstName = idToken.given_name ?? idToken.name?.split(" ")[0] ?? "";
    const lastName = idToken.family_name ?? idToken.name?.split(" ").slice(1).join(" ") ?? "";
    const azureRole = idToken.roles?.[0] ?? "estudiante"
    const dbRole = mapAzureRoleToDbRole(azureRole)

    console.log("Azure OID:", azureOid)
    console.log("Email:", email)
    console.log("First Name:", firstName)
    console.log("Last Name:", lastName)
    console.log("Azure Role:", azureRole)
    console.log("DB Role:", dbRole)

    // Find by Azure OID or email (handles seed users with placeholder identity)
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ identity: azureOid }, { email }] },
    })

    let user
    if (existingUser) {
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: { identity: azureOid, email, firstName, lastName, role: dbRole },
      })
    } else {
      user = await prisma.user.create({
        data: {
          identity: azureOid,
          email,
          firstName,
          lastName,
          role: dbRole,
          enabled: true,
        },
      })
    }
    // Redirect based on role
    const destination =
      dbRole === UserRole.COORDINATOR ? "/coordinator" : "/student"
    const response = NextResponse.redirect(new URL(destination, req.url))

    await setSessionCookie(
      {
        userId: user.id,
        identity: azureOid,
        email,
        firstName,
        lastName,
        role: dbRole,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
      },
      response
    )

    return response
  } catch (err) {
    console.error("Auth callback error:", err)
    return NextResponse.redirect(new URL("/?error=auth_failed", req.url))
  }
}
