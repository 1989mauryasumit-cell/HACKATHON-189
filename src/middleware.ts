import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple in-memory rate limiter cache for local development
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();
const LIMIT = 60; // 60 requests
const WINDOW = 60 * 1000; // 1 minute window

export function middleware(request: NextRequest) {
  const ip = (request as any).ip || request.headers.get("x-forwarded-for") || "local-ip";
  const path = request.nextUrl.pathname;

  // 1. Enforce API Rate Limiting
  if (path.startsWith("/api")) {
    const now = Date.now();
    const clientData = rateLimitCache.get(ip);

    if (!clientData) {
      rateLimitCache.set(ip, { count: 1, resetTime: now + WINDOW });
    } else {
      if (now > clientData.resetTime) {
        // Window expired, reset
        rateLimitCache.set(ip, { count: 1, resetTime: now + WINDOW });
      } else {
        // Increment count
        clientData.count += 1;
        if (clientData.count > LIMIT) {
          return new NextResponse(
            JSON.stringify({ error: "Too many requests. API rate limit exceeded." }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": Math.ceil((clientData.resetTime - now) / 1000).toString()
              }
            }
          );
        }
      }
    }
  }

  // 2. Inject Security Headers
  const response = NextResponse.next();
  
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  
  // Only apply Content Security Policy (CSP) in production to avoid blocking hot-reloading dev connections
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://*.openstreetmap.org; connect-src 'self'; frame-ancestors 'none';"
    );
  }

  return response;
}

// Map middleware execution paths
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
