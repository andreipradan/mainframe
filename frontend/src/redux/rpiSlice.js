import { createSlice } from "@reduxjs/toolkit";
import Cookie from "js-cookie";

export const rpiSlice = createSlice({
  name: "rpi",
  initialState: {
    errors: null,
    loading: false,
    message: null,
    token: Cookie.get('ngrok_token') || null,
    user: Cookie.get("ngrok_user") ? JSON.parse(Cookie.get('ngrok_user')) : null,
  },
  reducers: {
    login: (state, action) => {
      const cookieOptions = { sameSite: 'Strict', secure: window.location.protocol === 'https:' };
      Cookie.set('ngrok_token', action.payload.token, cookieOptions);
      Cookie.set('ngrok_user', JSON.stringify(action.payload.user), cookieOptions);
      state.errors = null;
      state.loading = false;
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    logout: (state, action) => {
      state.errors = null;
      state.token = null;
      state.user = null;
      state.message = action.payload || null;
      Cookie.remove('ngrok_token');
      Cookie.remove('ngrok_user');
    },
    completed: (state, action) => {
      state.errors = null
      state.loading = false
      state.message = action.payload
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
    },
    setLoading: (state, action) => {state.loading = action.payload},
  },
});
export const { login, logout, completed, setErrors, setLoading } = rpiSlice.actions;
export default rpiSlice.reducer;
