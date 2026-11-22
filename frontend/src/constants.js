import { isLocalhost } from './serviceWorker';

export const API_SERVER = isLocalhost
  ? 'http://127.0.0.1:5678/'
  : `${import.meta.env.VITE_API_URL}/`;
