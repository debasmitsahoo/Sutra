import { NextResponse, type NextRequest } from "next/server";

// Cheap gate only: the session cookie is cryptographically verified in getUser() on every request.
export function middleware(req: NextRequest) {
  if (!req.cookies.has("session")) return NextResponse.redirect(new URL("/login", req.url));
}

export const config = { matcher: ["/((?!login|_next|favicon.ico).*)"] };
