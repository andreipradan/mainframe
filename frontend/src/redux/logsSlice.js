import { createSlice } from "@reduxjs/toolkit";

export const logsSlice = createSlice({
  name: "logs",
  initialState: {
    currentLog: null,
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
      state.currentLog = null
      state.errors = null
      state.loading = false
      state.path = action.payload.path;
      state.results = action.payload.results;
    },
    setCurrentLog: (state, action) => {
      state.errors = null
      state.loading = false
      state.currentLog = action.payload
    },
    setLoading: (state, action) => {state.loading = action.payload},
  },
});

export const { set, setCurrentLog, setErrors, setLoading } =
  logsSlice.actions;

export default logsSlice.reducer;
