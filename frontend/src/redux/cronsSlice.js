import { createSlice } from "@reduxjs/toolkit";

export const cronsSlice = createSlice({
  name: "crons",
  initialState: {
    errors: null,
    loading: false,
    loadingItems: null,
    modalOpen: false,
    results: null,
    selectedCron: null,
  },
  reducers: {
    create: (state, action) => {
      state.errors = null
      state.loading = false
      state.results = state.results
          ? [...state.results, action.payload].sort((a, b) =>
              b.is_active === a.is_active
                ? a.command > b.command ? 1 : -1
                : b.is_active > a.is_active ? 1 : -1
          )
          : [action.payload]
      state.selectedCron = null;
      state.modalOpen = false;
    },
    deleteCron: (state, action) => {
      state.errors = null;
      state.loadingItems = state.loadingItems?.filter((cron) => cron.id === action.payload);
      state.results = state.results.filter((cron) => cron.id !== action.payload);
      state.selectedCron = null
      state.modalOpen = false
    },
    setErrors: (state, action) => {
      state.errors = action.payload;
      state.loading = false;
      state.loadingItems = null;
    },
    select: (state, action) => {
      state.selectedCron = action.payload ? state.results.find(cron => cron.id === action.payload) : null
      state.modalOpen = Boolean(action.payload)
    },
    set: (state, action) => {
      state.errors = null
      state.loading = false
      state.loadingItems = null;
      state.results = action.payload.results;
    },
    setCompletedLoadingItem: (state, action) => {
      state.loadingItems = state.loadingItems
        ? state.loadingItems.filter(i => i !== action.payload)
        : null
    },
    setModalOpen: (state, action) => {
      state.modalOpen = action.payload
    },
    setLoading: (state, action) => {state.loading = action.payload !== undefined ? action.payload : true},
    setLoadingCron: (state, action) => {
      state.loadingItems = !state.loadingItems
        ? [action.payload]
        : [...state.loadingItems, action.payload];
    },
    update: (state, action) => {
      state.errors = null;
      state.loadingItems = state.loadingItems?.filter((cron) => cron.id === action.payload.id);
      state.results = state.results.map((cron) =>
        (cron.id === action.payload.id ? action.payload : cron)).sort((a, b) =>
          b.is_active === a.is_active
            ? a.command > b.command ? 1 : -1
            : b.is_active > a.is_active ? 1 : -1
      );
      state.selectedCron =
        action.payload.dontClearSelectedItem === true
          ? state.selectedCron
          : action.payload.setSelected === true
            ? state.results.find(item => item.id === action.payload.id)
            : null;
      state.modalOpen = false;
    },
  },
});

export const {
  create,
  deleteCron,
  select,
  set,
  setCompletedLoadingItem,
  setErrors,
  setLoading,
  setLoadingCron,
  setModalOpen,
  update
} =
  cronsSlice.actions;

export default cronsSlice.reducer;
