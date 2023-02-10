export const API_SERVER = process.env.NODE_ENV === 'production'
  ? `https://${window.location.hostname}`
  : "http://127.0.0.1:5678/api/";
