import { clearSession, getAccessToken } from '../session/authSession';
import { mockRequest } from './mockServer';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const REQUEST_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT || 10000);
const USE_MOCK_API = (import.meta.env.VITE_USE_MOCK_API || '').toLowerCase() !== 'false' && !API_BASE_URL;

let unauthorizedHandler = null;

export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

const buildUrl = (path, query) => {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }
  return API_BASE_URL ? `${API_BASE_URL}${path}${url.search}` : `${path}${url.search}`;
};

const readJsonSafe = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const normalizeError = (error) => {
  if (error instanceof ApiError) return error;
  const status = error?.status || 500;
  const message = error?.message || 'ÇëÇóÊ§°Ü£¬ÇëÉÔºóÖØÊÔ';
  return new ApiError(message, status, error?.details ?? null);
};

const onUnauthorized = () => {
  clearSession();
  if (typeof unauthorizedHandler === 'function') unauthorizedHandler();
};

const requestByFetch = async ({ method, path, body, query, headers }) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  const token = getAccessToken();
  const requestHeaders = { ...(headers || {}) };

  if (!(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(buildUrl(path, query), {
      method,
      headers: requestHeaders,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    const json = await readJsonSafe(response);

    if (!response.ok) {
      throw new ApiError(json?.message || `ÇëÇóÊ§°Ü(${response.status})`, response.status, json?.details || null);
    }

    return json;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError('ÇëÇó³¬Ê±£¬ÇëÖØÊÔ', 408);
    }
    throw normalizeError(error);
  } finally {
    clearTimeout(timeoutId);
  }
};

const requestByMock = async ({ method, path, body, query }) => {
  const token = getAccessToken();
  const resolvedPath = buildUrl(path, query);
  try {
    return await mockRequest({
      method,
      path: resolvedPath,
      body,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  } catch (error) {
    throw normalizeError(error);
  }
};

export const request = async ({ method = 'GET', path, body, query, headers }) => {
  const upperMethod = method.toUpperCase();
  const executor = USE_MOCK_API ? requestByMock : requestByFetch;

  try {
    return await executor({ method: upperMethod, path, body, query, headers });
  } catch (error) {
    const apiError = normalizeError(error);
    if (apiError.status === 401) {
      onUnauthorized();
    }
    throw apiError;
  }
};
