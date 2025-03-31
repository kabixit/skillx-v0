import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname

  // Define public paths that don't require authentication
  const isPublicPath =
    path === "/" ||
    path === "/dashboard" ||
    path === "/sign-in" ||
    path === "/sign-up" ||
    path === "/about" ||
    path === "/explore" ||
    path.startsWith("/api/")

  // Get the authentication token from the cookies
  const token = request.cookies.get("auth-token")?.value

  console.log("Middleware:", path, token)

  // Redirect logic for protected routes (dashboard)
  if (path.startsWith("/dashboard") && !token) {
    console.log("Redirecting to /sign-in...")
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  // Redirect authenticated users away from auth pages
  if ((path === "/sign-in" || path === "/sign-up") && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

// Configure which paths the middleware runs on
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
}

