const KEY = 'internal_session_id';

export const sessionStore = {
  getId: (): string | null => window.sessionStorage.getItem(KEY),
  setId: (id: string): void => window.sessionStorage.setItem(KEY, id),
  clear: (): void => window.sessionStorage.removeItem(KEY),
};
