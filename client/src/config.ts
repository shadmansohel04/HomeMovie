/**
 * API and Streaming backend configuration.
 * When deployed (e.g. Vercel, Netlify, or local vite dev), connects to the Render backend:
 * https://homemovie.onrender.com
 */
const DEFAULT_API_BASE = 'https://homemovie.onrender.com';

// Use environment variable if provided, or default to Render backend in production/external deployments.
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? (window.location.port === '5000' ? '' : DEFAULT_API_BASE)
    : DEFAULT_API_BASE);

/**
 * Returns a fully-qualified HTTP/HTTPS API URL
 */
export function getApiUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Returns a fully-qualified WebSocket URL for TV Mode & Remote Casting
 */
export function getWsUrl(path: string = '/ws/remote'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${cleanPath}`;
  }

  const url = new URL(API_BASE_URL);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${url.host}${cleanPath}`;
}
