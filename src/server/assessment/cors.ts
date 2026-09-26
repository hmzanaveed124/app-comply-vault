const ALLOWED_ORIGINS = new Set([
  "https://complyvault.co",
  "https://www.complyvault.co",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
]);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // Local preview / Vercel preview of marketing site
  try {
    const url = new URL(origin);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
    if (
      url.hostname.endsWith(".vercel.app") &&
      (url.hostname.includes("comply") || url.hostname.includes("landing"))
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function corsHeaders(request: Request): Headers {
  const origin = request.headers.get("origin");
  const headers = new Headers();
  if (origin && isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Assessment-Token",
  );
  headers.set("Access-Control-Max-Age", "86400");
  return headers;
}

export function withCors(request: Request, response: Response): Response {
  const headers = corsHeaders(request);
  headers.forEach((value, key) => {
    response.headers.set(key, value);
  });
  return response;
}

export function corsPreflight(request: Request): Response {
  return withCors(request, new Response(null, { status: 204 }));
}
