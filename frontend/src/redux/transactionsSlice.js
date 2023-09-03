import { createSlice } from "@reduxjs/toolkit";

export const transactionsSlice = createSlice({
  name: "transactions",
  initialState: {
    categories: null,
    confirmedByChoices: null,
    count: 0,
    errors: null,
    loading: false,
    loadingTransactions: null,
    next: null,
    pending: null,
    previous: null,
    results: null,
    selectedTransaction: null,
    types: null,
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
      state.categories = action.payload.categories
      state.confirmedByChoices = action.payload.confirmed_by_choices
      state.count = action.payload.count
      state.errors = null
      state.loading = false
      state.next = action.payload.next
      state.previous = action.payload.previous
      state.results = action.payload.results;
      state.types = action.payload.types;
    },
    setLoading: (state, action) => {state.loading = action.payload},
    setLoadingTransactions: (state, action) => {
      state.loadingTransactions = state.loadingTransactions
        ? [...state.loadingTransactions, action.payload]
        : [action.payload]
    },
    updateTransaction: (state, action) => {
      state.errors = null
      state.loading = false
      state.results = state.results.map(t => t.id === action.payload.id ? action.payload : t)
      state.selectedTransaction = action.payload.id === state.selectedTransaction?.id
        ? action.payload
        : state.selectedTransaction
      state.loadingTransactions = state.loadingTransactions?.length
        ? state.loadingTransactions.filter(id => id !== action.payload.id)
        : null
    }
  },
});

export const {
  selectTransaction,
  set, setErrors, setLoading, setLoadingTransactions,
  updateTransaction
} = transactionsSlice.actions;
export default transactionsSlice.reducer;
