import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const tenantId = process.env.AZURE_TENANT_ID!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const response = NextResponse.redirect(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${appUrl}`
  );

  response.cookies.delete(SESSION_COOKIE_NAME);

  return response;
}