import { createSlice } from "@reduxjs/toolkit";
import Cookie from "js-cookie";

export const authSlice = createSlice({
  name: "auth",
  initialState: {
    errors: null,
    token: Cookie.get('token') || null,
	  user: Cookie.get("user") ? JSON.parse(Cookie.get('user')) : null,
  },
  reducers: {
    login: (state, action) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.errors = null;
    },
    logout: (state, action) => {
      state.errors = null;
      state.token = null;
      state.user = null;
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
    },
  },
});

export const { login, logout, setErrors } = authSlice.actions;

export default authSlice.reducer;
