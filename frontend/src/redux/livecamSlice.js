import { createSlice } from "@reduxjs/toolkit";

export const livecamSlice = createSlice({
  name: "livecam",
  initialState: {
    errors: null,
    loading: false,
    results: null,
  },
  reducers: {
    add: (state, action) => {
      state.results = state.results ? [...state.results, action.payload] : [action.payload]
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
    },
    set: (state, action) => {
      state.errors = null
      state.loading = false
      state.results = action.payload.results;
    },
    setLoading: (state, action) => {state.loading = action.payload},
  },
});

export const { add, setErrors, setLoading } =
  livecamSlice.actions;

export default livecamSlice.reducer;
