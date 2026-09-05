export function requireAppUrl(): string {
  const url = process.env.AUTH_URL;
  if (!url) {
    throw new Error('AUTH_URL is not configured.');
  }
  return url;
}
