import {isLocalhost} from "./serviceWorker";


export const API_SERVER = isLocalhost
  ? "http://127.0.0.1:5678/"
  : `${process.env.REACT_APP_API_URL}/`
