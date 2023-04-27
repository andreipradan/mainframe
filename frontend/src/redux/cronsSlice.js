import { createSlice } from "@reduxjs/toolkit";

export const cronsSlice = createSlice({
  name: "crons",
  initialState: {
    errors: null,
    loading: false,
    loadingCrons: null,
    results: null,
    selectedCron: null,
  },
  reducers: {
    deleteCron: (state, action) => {
      state.errors = null;
      state.loadingCrons = state.loadingCrons?.filter((cron) => cron.id === action.payload);
      state.results = state.results.filter((cron) => cron.id !== action.payload);
      state.selectedCron = null
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
    },
    select: (state, action) => {
      state.selectedCron = action.payload ? state.results.find(cron => cron.id === action.payload) : null
    },
    set: (state, action) => {
      state.errors = null
      state.loading = false
      state.loadingCrons = null;
      state.results = action.payload.results;
    },
    setLoading: (state, action) => {state.loading = action.payload},
    setLoadingCron: (state, action) => {
      state.loadingCrons = !state.loadingCrons
        ? [action.payload]
        : [...state.loadingCrons, action.payload];
    },
    update: (state, action) => {
      state.errors = null;
      state.loadingCrons = state.loadingCrons?.filter((cron) => cron.id === action.payload.id);
      state.results = state.results.map((cron) =>
        (cron.id === action.payload.id ? action.payload : cron)).sort((a, b) =>
          b.is_active === a.is_active
            ? a.command > b.command ? 1 : -1
            : b.is_active > a.is_active ? 1 : -1
      );
    },
  },
});

export const { deleteCron, select, set, setErrors, setLoading, setLoadingCron, update } =
  cronsSlice.actions;

export default cronsSlice.reducer;
