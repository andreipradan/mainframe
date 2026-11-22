import { isLocalhost } from './serviceWorker';

export const API_SERVER = isLocalhost
  ? 'http://127.0.0.1:8000/'
  : `${import.meta.env.VITE_API_URL}/`;
