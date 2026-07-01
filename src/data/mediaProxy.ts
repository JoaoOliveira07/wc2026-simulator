export function proxyPhoto(url: string | undefined | null): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname === 'media.api-sports.io') return '/media' + u.pathname;
  } catch {}
  return url;
}
