import Axios from 'axios';
import { API_SERVER } from '../constants';

export const axios = Axios.create({
  baseURL: API_SERVER,
  headers: { 'Content-Type': 'application/json' },
});

export const ngrokAxios = Axios.create({
  baseURL: import.meta.env.VITE_NGROK_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': true,
  },
});

/** Installs pass-through request and response interceptors on an Axios instance. */
const setupAxiosInstance = (instance) => {
  instance.interceptors.request.use(
    (config) => {
      return Promise.resolve(config);
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response) => Promise.resolve(response),
    (error) => {
      return Promise.reject(error);
    }
  );
};

setupAxiosInstance(axios);
setupAxiosInstance(ngrokAxios);
export default axios;
