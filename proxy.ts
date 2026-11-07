import { NextResponse, type NextRequest } from "next/server";

/**
 * Content Security Policy with a fresh nonce per request: only Next's own
 * scripts (which receive the nonce) and what they load may run. The app is
 * fully client-side, so the origins below are the only ones it talks to:
 * the GPU service (sign-in, Spaces, model files) and the CDN that serves
 * the onnxruntime WebAssembly used by the on-device photo mode.
 */
export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV === "development";

  const policy = [
    "default-src 'self'",
    // 'wasm-unsafe-eval': three's decoders and onnxruntime compile WebAssembly.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval' https://cdn.jsdelivr.net${dev ? " 'unsafe-eval'" : ""}`,
    // React `style` props are inline style attributes: nonces don't cover those.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://huggingface.co https://*.hf.space",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "connect-src 'self' blob: data: https://huggingface.co https://*.huggingface.co https://*.hf.co https://*.hf.space wss://*.hf.space https://cdn.jsdelivr.net",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: static files, images and the HDRI don't need the header.
      source: "/((?!_next/static|_next/image|hdri/|icon.svg|favicon.ico|.*\\.(?:jpg|png|svg|hdr|webp)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
