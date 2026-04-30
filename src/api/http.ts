export class HttpError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.data = data;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  headers?: Record<string, string>;
  auth?: boolean;
  retryOnAuthFailure?: boolean;
};

// const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
const API_BASE_URL = 'https://api.restitua.com/api/v1'
const ACCESS_TOKEN_KEY = 'restitua_admin_access_token';
const REFRESH_TOKEN_KEY = 'restitua_admin_refresh_token';

let accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
let refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

const resolveApiBaseUrl = () => {
  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    return API_BASE_URL;
  }

  const normalizedPath = API_BASE_URL.startsWith('/') ? API_BASE_URL : `/${API_BASE_URL}`;
  return `${window.location.origin}${normalizedPath}`;
};

const safeParse = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

const createError = (status: number, data: unknown) => {
  const messageFromObject =
    typeof data === 'object' && data && 'message' in data
      ? (data as { message?: unknown }).message
      : undefined;

  const message =
    typeof messageFromObject === 'string'
      ? messageFromObject
      : Array.isArray(messageFromObject)
        ? String(messageFromObject[0] ?? `Request failed with status ${status}`)
        : `Request failed with status ${status}`;

  return new HttpError(message, status, data);
};

export const setTokens = (tokens: { accessToken?: string | null; refreshToken?: string | null }) => {
  accessToken = tokens.accessToken ?? null;
  refreshToken = tokens.refreshToken ?? null;

  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

export const clearTokens = () => {
  setTokens({ accessToken: null, refreshToken: null });
};

export const getAccessToken = () => accessToken;

const tryRefresh = async () => {
  if (!refreshToken) {
    return false;
  }

  const response = await fetch(`${resolveApiBaseUrl()}/auth/refresh`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${refreshToken}`,
    },
  });

  const data = await safeParse(response);

  if (!response.ok) {
    clearTokens();
    return false;
  }

  const tokens =
    typeof data === 'object' && data && 'tokens' in data
      ? (data as { tokens?: { accessToken?: string; refreshToken?: string } }).tokens
      : undefined;

  if (!tokens?.accessToken) {
    clearTokens();
    return false;
  }

  setTokens({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken ?? refreshToken,
  });

  return true;
};

export const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const {
    method = 'GET',
    body,
    query,
    headers = {},
    auth = true,
    retryOnAuthFailure = true,
  } = options;

  const url = new URL(`${resolveApiBaseUrl()}${path}`);
  console.log({
    url,
  })

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }

  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (auth && accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }
  

  const response = await fetch(url.toString(), {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await safeParse(response);

  if (!response.ok) {
    if (auth && response.status === 401 && retryOnAuthFailure) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return request<T>(path, { ...options, retryOnAuthFailure: false });
      }
    }

    throw createError(response.status, data);
  }

  return data as T;
};
