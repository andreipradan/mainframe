import { createSlice } from "@reduxjs/toolkit";

export const transactionsSlice = createSlice({
  name: "transactions",
  initialState: {
    count: 0,
    errors: null,
    loading: false,
    next: null,
    overview: null,
    previous: null,
    results: null,
  },
  reducers: {
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
      state.loadingBots = null;
    },
    set: (state, action) => {
      state.count = action.payload.count
      state.errors = null
      state.loading = false
      state.next = action.payload.next
      state.previous = action.payload.previous
      state.results = action.payload.results;
    },
    setLoading: (state, action) => {state.loading = action.payload},
    setOverview: (state, action) => {
      state.overview = action.payload
      state.loading = false
    }
  },
});

export const { set, setErrors, setLoading, setOverview } =
  transactionsSlice.actions;

export default transactionsSlice.reducer;
