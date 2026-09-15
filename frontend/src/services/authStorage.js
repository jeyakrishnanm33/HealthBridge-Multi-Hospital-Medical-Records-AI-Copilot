const TOKEN_KEY = 'healthbridge_jwt_token';

/**
 * Manages JWT storage in browser localStorage.
 * Centralizes token retrieval, storage, and removal.
 */
export const authStorage = {
  getToken: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken: (token) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.error('Failed to store token in localStorage:', e);
    }
  },

  removeToken: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error('Failed to remove token from localStorage:', e);
    }
  },
};
