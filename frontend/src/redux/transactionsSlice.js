import { createSlice } from "@reduxjs/toolkit";

export const transactionsSlice = createSlice({
  name: "transactions",
  initialState: {
    categories: null,
    confirmedByChoices: null,
    count: 0,
    errors: null,
    kwargs: {
      confirmed_by: 0,
      expense: true,
      unique: true,
      page: 1,
    },
    loading: false,
    loadingTransactions: null,
    msg: null,
    next: null,
    pending: null,
    previous: null,
    results: null,
    selectedTransaction: null,
    types: null,
    unidentified_count: null,
  },
  reducers: {
    clearAccuracy: (state, action) => {
      state.accuracy = null
    },
    selectTransaction: (state, action) => {
      state.selectedTransaction = action.payload ? state.results.find(t => t.id === action.payload) : null
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
    },
    set: (state, action) => {
      state.accuracy = action.payload.accuracy
      state.categories = action.payload.categories
      state.confirmedByChoices = action.payload.confirmed_by_choices
      state.count = action.payload.count
      state.errors = null
      state.loading = false
      state.msg = action.payload.msg
      state.next = action.payload.next
      state.previous = action.payload.previous
      state.results = action.payload.results;
      state.types = action.payload.types;
      state.unidentified_count = action.payload.unidentified_count;
    },
    setKwargs: (state, action) => {state.kwargs = action.payload},
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
  clearAccuracy,
  selectTransaction,
  set, setErrors, setKwargs, setLoading, setLoadingTransactions,
  updateTransaction
} = transactionsSlice.actions;
export default transactionsSlice.reducer;
