const BASE = '/api';

function getToken() { return localStorage.getItem('tl_token'); }
export function setToken(t) { localStorage.setItem('tl_token', t); }
export function clearToken() { localStorage.removeItem('tl_token'); }

async function req(url, options = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error desconocido');
  return data;
}

export const api = {
  register: (body) => req(`${BASE}/auth?action=register`, { method: 'POST', body }),
  login: (body) => req(`${BASE}/auth?action=login`, { method: 'POST', body }),
  me: () => req(`${BASE}/auth?action=me`),
  updateSettings: (body) => req(`${BASE}/auth?action=settings`, { method: 'POST', body }),
  getTrades: () => req(`${BASE}/trades`),
  addTrade: (body) => req(`${BASE}/trades`, { method: 'POST', body }),
  updateTrade: (id, body) => req(`${BASE}/trades?id=${id}`, { method: 'PUT', body }),
  deleteTrade: (id) => req(`${BASE}/trades?id=${id}`, { method: 'DELETE' }),
};
