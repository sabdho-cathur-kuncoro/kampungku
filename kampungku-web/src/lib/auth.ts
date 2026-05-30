export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'KETUA_RT'
  | 'BENDAHARA'
  | 'SEKRETARIS'
  | 'WARGA';

export interface TokenPayload {
  sub: string;
  role: Role;
  tenantId: string | null;
  exp: number;
  iat: number;
}

function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + ((4 - (str.length % 4)) % 4), '=');
  return atob(padded);
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(base64UrlDecode(payload)) as TokenPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) return true;
  return Date.now() / 1000 >= payload.exp;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function getStoredPayload(): TokenPayload | null {
  const token = getStoredToken();
  if (!token) return null;
  return decodeToken(token);
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  KETUA_RT: 'Ketua RT',
  BENDAHARA: 'Bendahara',
  SEKRETARIS: 'Sekretaris',
  WARGA: 'Warga',
};
