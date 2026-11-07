"use client";

/**
 * Sign-in to the external GPU service (OAuth 2 + PKCE, no secret: the client
 * ID is public). It runs in a popup so the studio keeps its state: the popup
 * comes back to /studio?code=…, `completeSignIn` swaps the code for a token,
 * stores it and closes; the opener hears it through the `storage` event.
 */

const CLIENT_ID = process.env.NEXT_PUBLIC_HF_CLIENT_ID ?? "113de594-ae3b-4347-a692-271a333a0292";
const AUTHORIZE = "https://huggingface.co/oauth/authorize";
const TOKEN = "https://huggingface.co/oauth/token";
const USERINFO = "https://huggingface.co/oauth/userinfo";
const STORE = "solidwave.gpu-session";
const PENDING = "solidwave.gpu-pending";

export type GpuSession = { token: string; expiresAt: number; name: string | null };

const redirectUri = () => `${window.location.origin}/studio`;

function base64url(bytes: Uint8Array) {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(size = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(size)));
}

export function readSession(): GpuSession | null {
  try {
    const raw = window.localStorage.getItem(STORE);
    if (!raw) return null;
    const session = JSON.parse(raw) as GpuSession;
    if (!session.token || session.expiresAt < Date.now() + 60_000) return null;
    return session;
  } catch {
    return null;
  }
}

export function signOut() {
  try {
    window.localStorage.removeItem(STORE);
  } catch {
    /* storage blocked */
  }
}

/**
 * Opens the sign-in popup and resolves with the session once the popup stores it,
 * or null when `signal` aborts / after 10 minutes. The provider's pages cut the
 * popup's link to this window (popup.closed reads true right away), so the
 * session is watched in shared storage instead.
 */
export async function signIn(signal?: AbortSignal): Promise<GpuSession | null> {
  // Opened synchronously, inside the click: popup blockers only allow that.
  const width = 520;
  const height = 720;
  const popup = window.open(
    "about:blank",
    "solidwave-signin",
    `width=${width},height=${height},left=${Math.round(window.screenX + (window.outerWidth - width) / 2)},top=${Math.round(window.screenY + (window.outerHeight - height) / 2)}`,
  );
  if (!popup) throw new Error("popup-blocked");

  const verifier = randomString(48);
  const state = randomString(16);
  const challenge = base64url(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))),
  );
  window.localStorage.setItem(PENDING, JSON.stringify({ verifier, state }));

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  popup.location.href = `${AUTHORIZE}?${params}`;

  const before = readSession()?.token ?? null;
  return new Promise((resolve) => {
    const started = Date.now();
    const finish = (session: GpuSession | null) => {
      window.clearInterval(watch);
      signal?.removeEventListener("abort", onAbort);
      resolve(session);
    };
    const onAbort = () => finish(null);
    signal?.addEventListener("abort", onAbort);
    const watch = window.setInterval(() => {
      const session = readSession();
      if (session && session.token !== before) finish(session);
      else if (Date.now() - started > 10 * 60 * 1000) finish(null);
    }, 600);
  });
}

/** Runs inside the popup when it lands back on /studio?code=…; returns true if it handled a sign-in. */
export async function completeSignIn(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state) return false;
  let pending: { verifier: string; state: string } | null = null;
  try {
    pending = JSON.parse(window.localStorage.getItem(PENDING) ?? "null");
  } catch {
    pending = null;
  }
  if (!pending || pending.state !== state) return false;
  window.localStorage.removeItem(PENDING);

  const response = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
      client_id: CLIENT_ID,
      code_verifier: pending.verifier,
    }),
  });
  if (!response.ok) throw new Error("token");
  const data = (await response.json()) as { access_token: string; expires_in?: number };
  let name: string | null = null;
  try {
    const info = await fetch(USERINFO, { headers: { Authorization: `Bearer ${data.access_token}` } });
    if (info.ok) {
      const user = (await info.json()) as { preferred_username?: string; name?: string };
      name = user.preferred_username ?? user.name ?? null;
    }
  } catch {
    /* the name is only cosmetic */
  }
  const session: GpuSession = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 8 * 3600) * 1000,
    name,
  };
  window.localStorage.setItem(STORE, JSON.stringify(session));
  return true;
}
