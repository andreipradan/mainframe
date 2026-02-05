import { createSlice } from "@reduxjs/toolkit";
import Cookie from "js-cookie";

export const authSlice = createSlice({
  name: "auth",
  initialState: {
    errors: null,
    loading: false,
    redirectUrl: null,
    token: Cookie.get('token') || null,
	  user: Cookie.get("user") ? JSON.parse(Cookie.get('user')) : null,
  },
  reducers: {
    login: (state, action) => {
      Cookie.set('token', action.payload.token);
      Cookie.set('user', JSON.stringify(action.payload.user));
      state.errors = null;
      state.loading = false;
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    logout: (state) => {
      state.errors = null;
      if (window.location.pathname !== '/login')
        state.redirectUrl = window.location.pathname
      state.token = null;
      state.user = null;
      Cookie.remove('expires_at');
      Cookie.remove('token');
      Cookie.remove('user');
    },
    setErrors: (state, action) => {
      state.errors = action.payload
      state.loading = false
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const {
  login,
  logout,
  setErrors,
  setLoading
} = authSlice.actions;

export default authSlice.reducer;
