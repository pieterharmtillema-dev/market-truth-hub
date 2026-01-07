/**
 * Dynamic CORS Headers Utility
 *
 * Provides origin-restricted CORS that allows:
 * - Lovable preview URLs (*.lovableproject.com)
 * - Lovable Cloud URLs (*.lovable.app)
 * - Localhost development servers
 * - Custom domains via ALLOWED_ORIGINS env variable
 *
 * This replaces wildcard CORS ('*') with an allowlist approach
 * to reduce attack surface for CSRF and credential theft.
 */

/**
 * Check if an origin is in the allowlist
 */
export function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;

  // Parse the origin URL
  let hostname: string;
  try {
    const url = new URL(origin);
    hostname = url.hostname;
  } catch {
    return false;
  }

  // 1. Lovable preview URLs (e.g., id--project.lovableproject.com)
  if (hostname.endsWith('.lovableproject.com')) {
    return true;
  }

  // 2. Lovable Cloud URLs (e.g., project.lovable.app)
  if (hostname.endsWith('.lovable.app')) {
    return true;
  }

  // 3. Localhost development (common Vite ports)
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0'
  ) {
    return true;
  }

  // 4. Custom domains from environment variable (comma-separated)
  const customOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (customOrigins) {
    const allowedList = customOrigins.split(',').map((s) => s.trim().toLowerCase());
    if (allowedList.includes(hostname.toLowerCase())) {
      return true;
    }
    // Also check full origin URL for exact matches
    if (allowedList.includes(origin.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Get CORS headers for a request, validating the Origin against allowlist
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = isOriginAllowed(origin) ? origin : '';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

/**
 * Handle CORS preflight (OPTIONS) request
 */
export function handleCorsPreflightRequest(req: Request): Response {
  return new Response(null, { headers: getCorsHeaders(req) });
}

/**
 * Create a JSON response with CORS headers
 */
export function jsonResponse(
  req: Request,
  data: unknown,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

/**
 * Create an error response with CORS headers
 */
export function errorResponse(
  req: Request,
  error: string,
  status = 400,
  details?: string
): Response {
  const body: Record<string, unknown> = { error };
  if (details) body.details = details;
  return jsonResponse(req, body, status);
}
