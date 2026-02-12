const SESSION_KEY = 'loan_study_auth_session';

const parseSession = (raw) => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

export const getSession = () => parseSession(localStorage.getItem(SESSION_KEY));

export const saveSession = (session) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getAccessToken = () => getSession()?.accessToken ?? '';

export const isSessionValid = () => {
  const session = getSession();
  if (!session?.accessToken) return false;
  if (!session.expiresAt) return true;
  const expiresAt = Number(new Date(session.expiresAt));
  if (Number.isNaN(expiresAt)) return false;
  return expiresAt > Date.now();
};
