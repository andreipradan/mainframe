import { createSlice } from "@reduxjs/toolkit";

export const paymentSlice = createSlice({
  name: "payment",
  initialState: {
    count: 0,
    errors: null,
    loading: false,
    loadingPayments: null,
    next: null,
    overview: null,
    previous: null,
    results: null,
  },
  reducers: {
    selectPayment: (state, action) => {
      state.selectedPayment = action.payload ? state.results.find(t => t.id === action.payload) : null
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
      state.loadingPayments = null
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
    setLoadingPayments: (state, action) => {
      state.loadingPayments = !state.loadingPayments
        ? [action.payload]
        : [...state.loadingPayments, action.payload];
    },
    update: (state, action) => {
      state.errors = null;
      state.loadingPayments = state.loadingPayments?.filter((id) => id !== action.payload.id);
      state.results = state.results.map((p) => (p.id === action.payload.id ? action.payload : p));
      state.selectedPayment = action.payload.id === state.selectedPayment?.id ? action.payload : state.selectedPayment
    },
  },
});
export const { selectPayment, set, setErrors, setLoading, setLoadingPayments, update } = paymentSlice.actions;
export default paymentSlice.reducer;
