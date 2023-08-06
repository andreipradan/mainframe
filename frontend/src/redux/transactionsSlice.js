import { createSlice } from "@reduxjs/toolkit";

export const transactionsSlice = createSlice({
  name: "transactions",
  initialState: {
    count: 0,
    errors: null,
    loading: false,
    next: null,
    previous: null,
    results: null,
    selectedTransaction: null,
  },
  reducers: {
    selectTransaction: (state, action) => {
      state.selectedTransaction = action.payload ? state.results.find(t => t.id === action.payload) : null
    },
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
    },
    setLoading: (state, action) => {state.loading = action.payload},
  },
});

export const { set, setErrors, setLoading, selectTransaction } = transactionsSlice.actions;
export default transactionsSlice.reducer;
