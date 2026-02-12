import { base } from '$app/paths';

/** Normalized base path without trailing slash, or '' when base is / */
export function getBasePath(): string {
  return (base || '/').replace(/\/$/, '') || '';
}

/** Prefix an internal path with the app base path. */
export function withBase(path: string): string {
  const b = getBasePath();
  return path === '/' ? `${b}/` : `${b}${path}`;
}
