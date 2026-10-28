export const TOKEN_KEY = 'cem_coordinator_token';
export const COORDINATOR_KEY = 'cem_coordinator';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getStoredCoordinator = () => {
  try {
    const raw = localStorage.getItem(COORDINATOR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveSession = (token, coordinator) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(COORDINATOR_KEY, JSON.stringify(coordinator));
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(COORDINATOR_KEY);
};
