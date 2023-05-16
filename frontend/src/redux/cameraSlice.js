import { createSlice } from "@reduxjs/toolkit";

export const cameraSlice = createSlice({
  name: "livecam",
  initialState: {
    alertOpen: false,
    currentFile: null,
    errors: null,
    loading: false,
    path: null,
    results: null,
  },
  reducers: {
    add: (state, action) => {
      state.errors = null
      state.loading = false
      state.results = state.results ? [...state.results, action.payload].sort((a, b) =>
          a.name > b.name ? 1 : -1
      ) : [action.payload]
    },
    set: (state, action) => {
      state.currentFile = null
      state.errors = null
      state.loading = false
      state.path = action.payload.path;
      state.results = action.payload.results;
    },
    setAlertOpen: (state, action) => {
      state.alertOpen = action.payload
    },
    setCurrentFile: (state, action) => {
      state.errors = null
      state.loading = false
      state.currentFile = action.payload
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
    },
    setLoading: (state, action) => {state.loading = action.payload},
    setSocketOpen: (state, action) => {
      state.socketOpen = action.payload
    },
  },
});

export const { add, set, setAlertOpen, setCurrentFile, setErrors, setLoading } =
  cameraSlice.actions;

export default cameraSlice.reducer;
