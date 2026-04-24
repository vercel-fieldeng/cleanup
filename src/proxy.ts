import { type NextRequest, NextResponse } from "next/server";

const VERCEL_TOKEN_COOKIE = "vercel-pat";
const GITHUB_TOKEN_COOKIE = "github-pat";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/vercel/") &&
    !request.cookies.get(VERCEL_TOKEN_COOKIE)?.value
  ) {
    return NextResponse.redirect(new URL("/vercel", request.url));
  }

  if (
    pathname.startsWith("/github/") &&
    !request.cookies.get(GITHUB_TOKEN_COOKIE)?.value
  ) {
    return NextResponse.redirect(new URL("/github", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/vercel/:path+", "/github/:path+"],
};
