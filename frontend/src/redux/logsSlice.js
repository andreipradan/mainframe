import { createSlice } from "@reduxjs/toolkit";

export const logsSlice = createSlice({
  name: "logs",
  initialState: {
    errors: null,
    loading: false,
    path: null,
    results: null,
  },
  reducers: {
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
      state.loadingBots = null;
    },
    set: (state, action) => {
      state.errors = null
      state.loading = false
      state.path = action.payload.path;
      state.results = action.payload.results;
    },
    setLoading: (state, action) => {state.loading = action.payload},
  },
});

export const { set, setErrors, setLoading } =
  logsSlice.actions;

export default logsSlice.reducer;
