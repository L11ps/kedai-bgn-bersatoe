export const ADMIN_COOKIE_NAME = 'bgn_admin_session';

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || 'bgnsukses777';
}

export async function generateSessionToken(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ':bgn_auth_salt_v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function isValidSession(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const expectedToken = await generateSessionToken(getAdminPassword());
  return token === expectedToken;
}
