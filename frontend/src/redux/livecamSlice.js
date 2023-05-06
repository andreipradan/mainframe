import { createSlice } from "@reduxjs/toolkit";

export const livecamSlice = createSlice({
  name: "livecam",
  initialState: {
    alertOpen: false,
    errors: null,
    loading: false,
    results: null,
  },
  reducers: {
    add: (state, action) => {
      state.results = state.results ? [...state.results, action.payload] : [action.payload]
    },
    setAlertOpen: (state, action) => {
      state.alertOpen = action.payload
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

export const { add, setAlertOpen, setErrors, setLoading, setSocketOpen } =
  livecamSlice.actions;

export default livecamSlice.reducer;
