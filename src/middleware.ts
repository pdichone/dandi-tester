import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware to protect routes that require authentication
 * 
 * Protected routes:
 * - /dashboards/* - Requires authentication
 * 
 * Public routes (not protected by middleware):
 * - /api/auth/* - NextAuth routes
 * - /api/validate-key - Public API key validation
 * - /api/github-summarizer - Public API (uses API key auth)
 * - All other routes
 * 
 * Note: API routes handle their own authorization using getSessionUser()
 */
export default withAuth(
  function middleware(req: NextRequest) {
    // Middleware logic can be added here if needed
    // For now, withAuth handles the authentication check
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Require a valid token for protected routes
        return !!token;
      },
    },
    pages: {
      signIn: "/api/auth/signin", // Redirect to NextAuth sign-in
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth routes)
     * - api/validate-key (public API)
     * - api/github-summarizer (public API with API key auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|api/validate-key|api/github-summarizer|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
