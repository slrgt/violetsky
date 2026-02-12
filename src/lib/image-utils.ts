/**
 * Image utilities - VioletSky
 */
export function resizedAvatarUrl(originalUrl: string | undefined | null, displaySizePx: number): string {
  if (!originalUrl || !originalUrl.startsWith('http')) return originalUrl ?? '';
  const size = Math.min(256, Math.max(displaySizePx * 2, 40));
  const encoded = encodeURIComponent(originalUrl);
  return `https://wsrv.nl/?url=${encoded}&w=${size}&h=${size}&fit=cover`;
}
