import { createSlice } from "@reduxjs/toolkit";
import Cookie from "js-cookie";

export const authSlice = createSlice({
  name: "auth",
  initialState: {
    errors: null,
    loading: false,
    token: Cookie.get('token') || null,
	  user: Cookie.get("user") ? JSON.parse(Cookie.get('user')) : null,
  },
  reducers: {
    login: (state, action) => {
      state.errors = null;
      state.loading = false;
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    logout: state => {
      state.errors = null;
      state.token = null;
      state.user = null;
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

export const { login, logout, setErrors, setLoading } = authSlice.actions;

export default authSlice.reducer;
