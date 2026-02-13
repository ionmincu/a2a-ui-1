import { NextRequest } from 'next/server';

// Configure route segment to allow longer execution time
export const maxDuration = 300; // 5 minutes in seconds
export const dynamic = 'force-dynamic'; // Ensure it's not statically optimized

// Helper function to mask sensitive headers for logging
function maskSensitiveHeaders(headers: Record<string, string> | Headers): Record<string, string> {
  const masked: Record<string, string> = {};
  const headersToMask = ['authorization', 'auth', 'api-key', 'x-api-key', 'cookie', 'set-cookie'];
  
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      if (headersToMask.includes(key.toLowerCase())) {
        masked[key] = value.substring(0, 10) + '***MASKED***';
      } else {
        masked[key] = value;
      }
    });
  } else {
    Object.entries(headers).forEach(([key, value]) => {
      if (headersToMask.includes(key.toLowerCase())) {
        masked[key] = value.substring(0, 10) + '***MASKED***';
      } else {
        masked[key] = value;
      }
    });
  }
  
  return masked;
}

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[PROXY ${requestId}] ===== New Request =====`);
    
    // Verify request is from same origin to prevent abuse
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const requestUrl = new URL(request.url);
    const allowedOrigin = `${requestUrl.protocol}//${requestUrl.host}`;

    console.log(`[PROXY ${requestId}] Origin: ${origin}, Referer: ${referer}, Allowed: ${allowedOrigin}`);

    if (origin && origin !== allowedOrigin) {
      console.error(`[PROXY ${requestId}] Unauthorized origin: ${origin}`);
      return new Response(JSON.stringify({ error: "Unauthorized origin" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!origin && referer) {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      if (refererOrigin !== allowedOrigin) {
        console.error(`[PROXY ${requestId}] Unauthorized referer origin: ${refererOrigin}`);
        return new Response(JSON.stringify({ error: "Unauthorized origin" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const requestBody = await request.json();
    const {
      url,
      method,
      headers: requestHeaders,
      body,
      customHeaders,
    }: {
      url: string;
      method: string;
      headers: Record<string, string>;
      body?: string;
      customHeaders?: Record<string, string>;
    } = requestBody;

    console.log(`[PROXY ${requestId}] Target URL: ${url}`);
    console.log(`[PROXY ${requestId}] Method: ${method || "POST"}`);
    console.log(`[PROXY ${requestId}] Request Headers:`, maskSensitiveHeaders(requestHeaders));
    console.log(`[PROXY ${requestId}] Custom Headers:`, customHeaders ? maskSensitiveHeaders(customHeaders) : 'none');
    console.log(`[PROXY ${requestId}] Request Body Length: ${body ? body.length : 0} chars`);
    if (body) {
      console.log(`[PROXY ${requestId}] Request Body Preview:`, body.substring(0, 200));
    }

    if (!url) {
      console.error(`[PROXY ${requestId}] Missing URL in request`);
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build headers by merging request headers and custom headers
    const headers = new Headers(requestHeaders);
    if (customHeaders && Object.keys(customHeaders).length > 0) {
      Object.entries(customHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }

    console.log(`[PROXY ${requestId}] Final Headers:`, maskSensitiveHeaders(headers));

    // Forward the request to the target URL
    const actualMethod = method || "POST";
    const fetchOptions: RequestInit = {
      method: actualMethod,
      headers,
    };

    // Only add body for methods that support it (not GET or HEAD)
    if (body && actualMethod !== "GET" && actualMethod !== "HEAD") {
      fetchOptions.body = body;
    } else if (body && (actualMethod === "GET" || actualMethod === "HEAD")) {
      console.warn(`[PROXY ${requestId}] Body provided for ${actualMethod} request, ignoring body`);
    }

    console.log(`[PROXY ${requestId}] Sending request to ${url}...`);
    const response: Response = await fetch(url, fetchOptions);
    console.log(`[PROXY ${requestId}] Response Status: ${response.status} ${response.statusText}`);

    // Log response headers
    const responseHeadersObj: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeadersObj[key] = value;
    });
    console.log(`[PROXY ${requestId}] Response Headers:`, responseHeadersObj);

    // Check if the response is a streaming response (SSE) early
    const contentType = response.headers.get("Content-Type") || "";
    console.log(`[PROXY ${requestId}] Content-Type: ${contentType}`);
    const isSSE = contentType.includes("text/event-stream");

    // Try to clone response to read body for logging without consuming it
    // Skip this for SSE streams to avoid interfering with streaming
    let responseBodyForLogging: string | null = null;
    if (!isSSE) {
      try {
        const clonedResponse = response.clone();
        responseBodyForLogging = await clonedResponse.text();
      } catch (e) {
        console.warn(`[PROXY ${requestId}] Could not clone response for logging`);
      }
    }

    // Headers that should not be forwarded:
    // - Hop-by-hop headers per HTTP spec
    // - content-encoding: response.text() already decompresses the body, so forwarding
    //   this header causes the browser to try to decompress already-decompressed data
    // - content-length: invalid after decompression, let the runtime recalculate it
    const headersToStrip = new Set([
      "connection",
      "keep-alive",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailers",
      "transfer-encoding",
      "upgrade",
      "content-encoding",
      "content-length",
    ]);

    // Check if the response is a streaming response (SSE)
    if (isSSE) {
      console.log(`[PROXY ${requestId}] Detected streaming response (SSE)`);
      const streamHeaders = new Headers();

      response.headers.forEach((value, key) => {
        if (!headersToStrip.has(key.toLowerCase())) {
          streamHeaders.set(key, value);
        }
      });

      // Ensure proper SSE headers to prevent buffering
      streamHeaders.set("Content-Type", "text/event-stream");
      streamHeaders.set("Cache-Control", "no-cache, no-transform");
      streamHeaders.set("Connection", "keep-alive");
      streamHeaders.set("X-Accel-Buffering", "no"); // Disable nginx buffering if behind nginx

      console.log(`[PROXY ${requestId}] Returning streaming response with headers:`, Object.fromEntries(streamHeaders.entries()));
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: streamHeaders,
      });
    }

    // For non-streaming responses, read and forward the body
    const responseBody = responseBodyForLogging || await response.text();
    console.log(`[PROXY ${requestId}] Response Body Length: ${responseBody.length} chars`);
    console.log(`[PROXY ${requestId}] Response Body:`, responseBody);

    const responseHeaders = new Headers();

    response.headers.forEach((value, key) => {
      if (!headersToStrip.has(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    console.log(`[PROXY ${requestId}] Returning non-streaming response`);
    return new Response(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[PROXY ${requestId}] Error in proxy route:`, error);
    console.error(`[PROXY ${requestId}] Error stack:`, error instanceof Error ? error.stack : 'N/A');

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Proxy request failed",
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
