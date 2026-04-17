import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_ROUTES = ["/create", "/leaderboard", "/dashboard", "/voter", "/host", "/live"];

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  const path = request.nextUrl.pathname;
  if (!PROTECTED_ROUTES.some((route) => path.startsWith(route))) {
    return response;
  }

  const uidCookie = request.cookies
    .getAll()
    .find((cookie) => cookie.name.includes("auth-token"));

  if (!uidCookie) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
