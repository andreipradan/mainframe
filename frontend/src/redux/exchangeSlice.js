import { createSlice } from "@reduxjs/toolkit";

export const exchangeSlice = createSlice({
  name: "exchange",
  initialState: {
    count: 0,
    errors: null,
    kwargs: null,
    loading: false,
    next: null,
    previous: null,
    results: null,
    sources: null,
    symbols: null,
  },
  reducers: {
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
    },
    set: (state, action) => {
      state.count = action.payload.count
      state.errors = null
      state.loading = false
      state.next = action.payload.next
      state.previous = action.payload.previous
      state.results = action.payload.results;
      state.sources = action.payload.sources;
      state.symbols = action.payload.symbols;
    },
    setKwargs: (state, action) => {state.kwargs = action.payload},
    setLoading: (state, action) => {state.loading = action.payload},
  },
});
export const { set, setErrors, setKwargs, setLoading } = exchangeSlice.actions;
export default exchangeSlice.reducer;
