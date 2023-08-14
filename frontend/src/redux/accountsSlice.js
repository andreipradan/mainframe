import { createSlice } from "@reduxjs/toolkit";

export const accountsSlice = createSlice({
  name: "accounts",
  initialState: {
    count: 0,
    errors: null,
    loading: false,
    loadingAccounts: null,
    modalOpen: false,
    next: null,
    previous: null,
    results: null,
    selectedAccount: null,
  },
  reducers: {
    create: (state, action) => {
      state.errors = null
      state.loading = false
      state.results = state.results
          ? [...state.results, action.payload].sort((a, b) =>
              b.bank === a.bank ? 1 : -1
          )
          : [action.payload]
      state.selectedCron = null;
      state.modalOpen = false;
    },
    selectAccount: (state, action) => {
      state.selectedAccount = action.payload ? state.results.find(t => t.id === action.payload) : null
      state.modalOpen = !!action.payload
    },
    set: (state, action) => {
      state.count = action.payload.count
      state.errors = null
      state.loading = false
      state.next = action.payload.next
      state.previous = action.payload.previous
      state.results = action.payload.results;
      state.selectedAccount = state.results.find(t => t.id === action.payload.accountId)
    },
    setAnalytics: (state, action) => {
      state.analytics = action.payload
      state.errors = null
      state.loading = false
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
      state.loadingAccounts = null
    },
    setLoading: (state, action) => {state.loading = action.payload},
    setLoadingAccounts: (state, action) => {
      state.loadingAccounts = !state.loadingAccounts
        ? [action.payload]
        : [...state.loadingAccounts, action.payload];
    },
    setModalOpen: (state, action) => {
      state.modalOpen = action.payload
    },
    setSelectedAccount: (state, action) => {
      state.errors = null
      state.loading = false
      state.selectedAccount = action.payload
    },
    update: (state, action) => {
      state.errors = null;
      state.loadingAccounts = state.loadingAccounts?.filter((id) => id !== action.payload.id);
      state.results = state.results.map((a) => (a.id === action.payload.id ? action.payload : a));
      state.selectedAccount = null
      state.modalOpen = false;
    }
  },
});
export const {
  create,
  selectAccount,
  set,
  setAnalytics,
  setErrors,
  setLoading,
  setLoadingAccounts,
  setModalOpen,
  setSelectedAccount,
  update
} = accountsSlice.actions;
export default accountsSlice.reducer;
