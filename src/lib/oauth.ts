/**
 * OAuth Authentication for Bluesky - VioletSky
 */
import { BrowserOAuthClient } from '@atproto/oauth-client-browser';

let client: BrowserOAuthClient | null = null;

function getAppBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const u = new URL(window.location.href);
  const base = (typeof import.meta.env !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  const basePath = base.replace(/\/$/, '').replace(/^\//, '') || '';
  return basePath ? `${u.origin}/${basePath}` : u.origin;
}

function isLoopback(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

function getLoopbackClientId(): string {
  if (typeof window === 'undefined') return '';
  const u = new URL(window.location.href);
  const host = u.hostname === 'localhost' ? '127.0.0.1' : u.hostname;
  const port = u.port || (u.protocol === 'https:' ? '443' : '80');
  let path = u.pathname.replace(/\/index\.html$/, '');
  if (!path.endsWith('/')) path += '/';
  const redirectUri = `http://${host}:${port}${path}`;
  return `http://localhost?redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('atproto transition:generic')}`;
}

export async function getOAuthClient(): Promise<BrowserOAuthClient> {
  if (typeof window === 'undefined') throw new Error('OAuth is browser-only');
  if (client) return client;

  const clientId = isLoopback()
    ? getLoopbackClientId()
    : `${getAppBaseUrl()}/client-metadata.json`;

  client = await BrowserOAuthClient.load({
    clientId,
    handleResolver: 'https://api.bsky.app/',
    responseMode: 'query',
  });
  return client;
}

export function normalizeHandle(input: string): string {
  let h = input.trim().toLowerCase();
  if (h.startsWith('@')) h = h.slice(1);
  if (!h.includes('.')) h = `${h}.bsky.social`;
  return h;
}

export type OAuthSession = import('@atproto/oauth-client').OAuthSession;

let _initPromise: Promise<{ session: OAuthSession; state?: string | null } | undefined> | null = null;

export async function initOAuth(options?: {
  hasCallback?: boolean;
  preferredRestoreDid?: string;
}): Promise<{ session: OAuthSession; state?: string | null } | undefined> {
  if (_initPromise) return _initPromise;
  _initPromise = _doInitOAuth(options);
  try {
    return await _initPromise;
  } finally {
    _initPromise = null;
  }
}

async function _doInitOAuth(options?: {
  hasCallback?: boolean;
  preferredRestoreDid?: string;
}): Promise<{ session: OAuthSession; state?: string | null } | undefined> {
  const oauth = await getOAuthClient();
  const hasCallback =
    options?.hasCallback ??
    (() => {
      const params = new URLSearchParams(window.location.search);
      return params.has('state') && (params.has('code') || params.has('error'));
    })();

  if (hasCallback) return oauth.init();

  if (options?.preferredRestoreDid) {
    try {
      const session = await oauth.restore(options.preferredRestoreDid, true);
      return { session };
    } catch { return undefined; }
  }

  return oauth.init();
}

export async function restoreOAuthSession(did: string): Promise<OAuthSession | null> {
  try {
    const oauth = await getOAuthClient();
    return await oauth.restore(did, true);
  } catch { return null; }
}

export async function signInWithOAuthRedirect(handle: string): Promise<never> {
  const oauth = await getOAuthClient();
  const normalized = normalizeHandle(handle);
  return oauth.signInRedirect(normalized);
}
