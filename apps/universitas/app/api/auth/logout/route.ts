import { NextRequest, NextResponse } from "next/server";
import { clearSession, AZURE_LOGOUT_URL } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await clearSession();

  const params = new URLSearchParams({
    post_logout_redirect_uri: process.env.NEXT_PUBLIC_APP_URL!,
  });

  return NextResponse.redirect(`${AZURE_LOGOUT_URL}?${params}`);
}