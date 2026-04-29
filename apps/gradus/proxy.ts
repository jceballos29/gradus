import { NextRequest, NextResponse } from "next/server"
import { getSession } from "./lib/auth"

const COORDINATOR_ROUTES = ["/coordinator"]
const STUDENT_ROUTES = ["/student"]

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rutas públicas
  if (
    pathname === "/" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/auth/error")
  ) {
    return NextResponse.next()
  }

  const session = await getSession(req)

  if (!session) {
    return NextResponse.redirect(new URL("/api/auth/login", req.url))
  }

  const isCoordinatorRoute = COORDINATOR_ROUTES.some((r) =>
    pathname.startsWith(r)
  )
  const isStudentRoute = STUDENT_ROUTES.some((r) => pathname.startsWith(r))

  if (
    (isCoordinatorRoute && session.role !== "COORDINATOR") ||
    (isStudentRoute && session.role !== "STUDENT")
  ) {
    if (session.role === "COORDINATOR") {
      return NextResponse.redirect(new URL("/coordinator", req.url))
    } else if (session.role === "STUDENT") {
      return NextResponse.redirect(new URL("/student", req.url))
    } else {
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
