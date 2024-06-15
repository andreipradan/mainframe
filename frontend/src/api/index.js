import Axios from "axios";
import { API_SERVER } from "../constants";

export const axios = Axios.create({
  baseURL: API_SERVER,
  headers: { "Content-Type": "application/json" },
});


const LIGHTS_URL = process.env.REACT_APP_LIGHTS_URL || API_SERVER

export const lightsAxios = Axios.create({
  baseURL: LIGHTS_URL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": LIGHTS_URL !== API_SERVER
  },
})

const setupAxiosInstance = instance => {

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
}

setupAxiosInstance(axios)
setupAxiosInstance(lightsAxios)
export default axios