import {isLocalhost} from "./serviceWorker";


export const API_SERVER = isLocalhost
  ? "http://127.0.0.1:5678/"
  : `https://api.${window.location.hostname}/`
